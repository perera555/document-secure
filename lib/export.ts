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
import { pagesToPdf } from "./pdf";

/** Characters Windows/macOS don't allow in file or folder names. */
export function safeName(s: string, fallback = "Unnamed") {
  const clean = s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return (clean || fallback).slice(0, 80);
}

export function personFolder(p: Person) {
  return safeName(p.fullName, "Unknown person");
}

/** "Medical/Blood test – Asiri Hospital (2026-11-10)" (no extension, no de-duplication). */
function baseDocPath(doc: Pick<VaultDocument, "category" | "title" | "issueDate" | "createdAt">) {
  const label = getCategory(doc.category).label;
  const date = doc.issueDate || new Date(doc.createdAt).toISOString().slice(0, 10);
  return `${safeName(label)}/${safeName(doc.title, label)} (${date})`;
}

/** Where a new/edited document will be saved, for showing to the user before saving. */
export function previewDocPath(personName: string, doc: Pick<VaultDocument, "category" | "title" | "issueDate" | "createdAt">) {
  return `${safeName(personName, "Unknown person")}/${baseDocPath(doc)}.pdf`;
}

/**
 * One PDF path per document, e.g. "National ID/National Identity Card (2026-11-10).pdf".
 * Documents that would get the same name get " (2)", " (3)"… in the order they were added,
 * so names stay stable between saves.
 */
export function docFilePaths(docs: VaultDocument[]): Map<string, string> {
  const out = new Map<string, string>();
  const seen = new Map<string, number>();
  for (const d of [...docs].sort((a, b) => a.createdAt - b.createdAt)) {
    const base = baseDocPath(d);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(d.id, n === 1 ? `${base}.pdf` : `${base} (${n}).pdf`);
  }
  return out;
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
    const paths = docFilePaths(mine);
    for (const d of mine) {
      if (!d.pages.length) continue;
      files[root + paths.get(d.id)!] = new Uint8Array(await (await pagesToPdf(d.pages, d.title)).arrayBuffer());
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

async function removeFile(root: FileSystemDirectoryHandle, path: string) {
  try {
    const parts = path.split("/");
    let dir = root;
    for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
    await dir.removeEntry(parts[parts.length - 1]);
  } catch {
    /* already gone */
  }
}

/**
 * Writes one person's details and documents into "<folder>/<Person name>/<Folder>/<doc>.pdf".
 * `only`: a document id to write just that one, or "profile" for details.txt + photo only.
 */
async function writePerson(root: Dir, p: Person, only?: string) {
  const docs = await db.documents.where("personId").equals(p.id).toArray();
  const base = `${personFolder(p)}/`;
  await writeFile(root, base + "details.txt", personDetailsText(p, docs));
  if (p.photo) await writeFile(root, base + "photo.jpg", p.photo);
  if (only === "profile") return 0;
  const paths = docFilePaths(docs);
  for (const d of docs) {
    if ((only && d.id !== only) || !d.pages.length) continue;
    const path = base + paths.get(d.id)!;
    await writeFile(root, path, await pagesToPdf(d.pages, d.title));
    // Renamed, moved to another folder, or moved to another person: remove the old copy.
    if (d.savedPath && d.savedPath !== path) await removeFile(root, d.savedPath);
    if (d.savedPath !== path) await db.documents.update(d.id, { savedPath: path });
  }
  return docs.length;
}

/**
 * Called after a person is added or edited: creates/updates their folder with
 * details.txt and photo.jpg. If their name changed, all their documents move to the new folder.
 */
export async function savePersonToComputer(personId: string, previousName?: string) {
  try {
    const root = await getComputerFolder();
    if (!root || !(await computerFolderPermission(root))) return false;
    const p = await db.people.get(personId);
    if (!p) return false;
    const renamed = previousName !== undefined && safeName(previousName) !== personFolder(p);
    await writePerson(root, p, renamed ? undefined : "profile");
    if (renamed) {
      const old = `${safeName(previousName!, "Unknown person")}/`;
      await removeFile(root, old + "details.txt");
      await removeFile(root, old + "photo.jpg");
    }
    return true;
  } catch {
    return false;
  }
}

/** Removes a deleted person's saved files (only files DocSecure wrote) from the computer folder. */
export async function removePersonFromComputer(p: Person, docs: Pick<VaultDocument, "savedPath">[]) {
  try {
    const root = await getComputerFolder();
    if (!root || !(await computerFolderPermission(root))) return;
    for (const d of docs) if (d.savedPath) await removeFile(root, d.savedPath);
    await removeFile(root, `${personFolder(p)}/details.txt`);
    await removeFile(root, `${personFolder(p)}/photo.jpg`);
  } catch {
    /* ignore */
  }
}

/** Removes a deleted document's file from the computer folder (if it was saved there). */
export async function removeFromComputer(doc: Pick<VaultDocument, "savedPath">) {
  try {
    if (!doc.savedPath) return;
    const root = await getComputerFolder();
    if (!root || !(await computerFolderPermission(root))) return;
    await removeFile(root, doc.savedPath);
  } catch {
    /* ignore */
  }
}

/** Whether new scans are being copied into a computer folder right now. */
export async function computerFolderStatus(): Promise<{ name: string; ok: boolean } | null> {
  const h = await getComputerFolder();
  return h ? { name: h.name, ok: await computerFolderPermission(h) } : null;
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
