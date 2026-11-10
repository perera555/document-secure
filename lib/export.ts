"use client";

/**
 * Saves documents under the person's name, in real folders:
 *   P R Perera/Medical/Blood test – Asiri Hospital (2026-11-10).jpg
 *   P R Perera/details.txt
 * Either as a ZIP download (works everywhere) or written straight into a
 * folder on the computer (Chrome / Edge desktop, via File System Access).
 */
import { zipSync, strToU8 } from "fflate";
import { db, getSetting, setSetting, type Person, type VaultDocument } from "./db";
import { getCategory } from "./categories";
import { PERSON_FIELDS } from "./gather";
import { downloadBlob } from "./backup";

/** Characters Windows/macOS don't allow in file or folder names. */
export function safeName(s: string, fallback = "Unnamed") {
  const clean = s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return (clean || fallback).slice(0, 80);
}

export function personFolder(p: Person) {
  return safeName(p.fullName, "Unknown person");
}

/** Relative paths for every page of a document, e.g. ["Medical/Blood test (2026-11-10).jpg"]. */
export function docPaths(doc: VaultDocument): string[] {
  const folder = safeName(getCategory(doc.category).label);
  const date = doc.issueDate || new Date(doc.createdAt).toISOString().slice(0, 10);
  const base = `${safeName(doc.title, getCategory(doc.category).label)} (${date})`;
  const id = doc.id.slice(0, 4); // keeps names unique when two documents share a title & date
  return doc.pages.map((pg, i) => {
    const ext = pg.type === "application/pdf" ? "pdf" : pg.type === "image/png" ? "png" : "jpg";
    const page = doc.pages.length > 1 ? ` p${i + 1}` : "";
    return `${folder}/${base}${page} ${id}.${ext}`;
  });
}

export function personDetailsText(p: Person, docs: VaultDocument[]) {
  const lines = [`${p.fullName}`, "=".repeat(p.fullName.length), ""];
  if (p.relationship) lines.push(`Relationship: ${p.relationship}`);
  for (const f of PERSON_FIELDS) if (p[f.key]) lines.push(`${f.label}: ${p[f.key]}`);
  for (const f of p.extraFields ?? []) if (f.value) lines.push(`${f.label}: ${f.value}`);
  if (p.notes) lines.push("", `Notes: ${p.notes}`);
  lines.push("", `Documents (${docs.length})`, "-------------");
  for (const d of [...docs].sort((a, b) => a.category.localeCompare(b.category))) {
    const c = getCategory(d.category);
    const bits = [d.documentNumber && `No. ${d.documentNumber}`, d.issueDate && `issued ${d.issueDate}`, d.expiryDate && `expires ${d.expiryDate}`].filter(Boolean);
    lines.push(`[${c.label}] ${d.title}${bits.length ? " — " + bits.join(", ") : ""}`);
    for (const f of d.fields) lines.push(`    ${f.label}: ${f.value}`);
  }
  lines.push("", `Saved by DocSecure on ${new Date().toLocaleString()}`);
  return lines.join("\r\n");
}

async function zipPeople(people: Person[], docs: VaultDocument[], nested: boolean): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  for (const p of people) {
    const mine = docs.filter((d) => d.personId === p.id);
    const root = nested ? `${personFolder(p)}/` : "";
    files[`${root}details.txt`] = strToU8(personDetailsText(p, mine));
    if (p.photo) files[`${root}photo.jpg`] = new Uint8Array(await p.photo.arrayBuffer());
    for (const d of mine) {
      const paths = docPaths(d);
      for (let i = 0; i < d.pages.length; i++) files[root + paths[i]] = new Uint8Array(await d.pages[i].blob.arrayBuffer());
    }
  }
  // Images/PDFs are already compressed, so store them (level 0) — much faster.
  const zipped = zipSync(files, { level: 0 });
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}

/** ZIP named after the person, containing their folders. */
export async function downloadPersonZip(personId: string) {
  const p = await db.people.get(personId);
  if (!p) return;
  const docs = await db.documents.where("personId").equals(personId).toArray();
  downloadBlob(await zipPeople([p], docs, true), `${personFolder(p)}.zip`);
}

/** One ZIP with a folder for every person. */
export async function downloadAllZip() {
  const people = await db.people.toArray();
  const docs = await db.documents.toArray();
  downloadBlob(await zipPeople(people, docs, true), `DocSecure ${new Date().toISOString().slice(0, 10)}.zip`);
}

/* ---------------- Auto-save into a computer folder ---------------- */

type Dir = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "readwrite" }) => Promise<PermissionState>;
};

export function computerFolderSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function getComputerFolder(): Promise<Dir | null> {
  return (await getSetting<Dir | null>("computerFolder", null)) ?? null;
}

export async function pickComputerFolder(): Promise<Dir> {
  const picker = (window as unknown as { showDirectoryPicker: (o?: object) => Promise<Dir> }).showDirectoryPicker;
  const handle = await picker({ id: "docsecure-save", mode: "readwrite", startIn: "documents" });
  await setSetting("computerFolder", handle);
  return handle;
}

export async function forgetComputerFolder() {
  await db.settings.delete("computerFolder");
}

export async function computerFolderPermission(h: Dir, ask = false) {
  if (!h.queryPermission) return true;
  let s = await h.queryPermission({ mode: "readwrite" });
  if (s !== "granted" && ask && h.requestPermission) s = await h.requestPermission({ mode: "readwrite" });
  return s === "granted";
}

async function writeFile(root: FileSystemDirectoryHandle, path: string, data: Blob | string) {
  const parts = path.split("/");
  let dir = root;
  for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part, { create: true });
  const fh = await dir.getFileHandle(parts[parts.length - 1], { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

/** Writes one person's details and documents (or just `onlyDocId`) into "<folder>/<Person name>/…". */
async function writePerson(root: Dir, p: Person, onlyDocId?: string) {
  const docs = await db.documents.where("personId").equals(p.id).toArray();
  const base = `${personFolder(p)}/`;
  await writeFile(root, base + "details.txt", personDetailsText(p, docs));
  if (p.photo) await writeFile(root, base + "photo.jpg", p.photo);
  for (const d of docs) {
    if (onlyDocId && d.id !== onlyDocId) continue;
    const paths = docPaths(d);
    for (let i = 0; i < d.pages.length; i++) await writeFile(root, base + paths[i], d.pages[i].blob);
  }
  return docs.length;
}

/**
 * Called after a document is saved: silently copies it into the computer folder
 * if one is set up and permission is still granted. Never throws.
 */
export async function autoSaveToComputer(personId: string, docId?: string) {
  try {
    const root = await getComputerFolder();
    if (!root || !(await computerFolderPermission(root))) return false;
    const p = await db.people.get(personId);
    if (!p) return false;
    await writePerson(root, p, docId);
    return true;
  } catch {
    return false;
  }
}

/** Writes everyone into the chosen computer folder. Returns number of documents written. */
export async function saveAllToComputer(): Promise<number> {
  const root = await getComputerFolder();
  if (!root) throw new Error("Choose a folder first.");
  if (!(await computerFolderPermission(root, true))) throw new Error("Permission to the folder was not given.");
  let n = 0;
  for (const p of await db.people.toArray()) n += await writePerson(root, p);
  return n;
}
