"use client";

import { db, type Person, type VaultDocument } from "./db";
import { base64ToBlob, blobToBase64 } from "./image";

type Ser<T> = Record<string, unknown> & T;

async function serBlob(b?: Blob) {
  return b ? { __blob: await blobToBase64(b), type: b.type } : undefined;
}
function deBlob(v: unknown): Blob | undefined {
  const o = v as { __blob?: string; type?: string } | undefined;
  return o?.__blob ? base64ToBlob(o.__blob, o.type ?? "application/octet-stream") : undefined;
}

export async function exportBackup(): Promise<Blob> {
  const people = await db.people.toArray();
  const docs = await db.documents.toArray();
  const out = {
    app: "doc-secure",
    version: 1,
    exportedAt: new Date().toISOString(),
    people: await Promise.all(people.map(async (p) => ({ ...p, photo: await serBlob(p.photo) }))),
    documents: await Promise.all(
      docs.map(async (d) => ({
        ...d,
        thumbnail: await serBlob(d.thumbnail),
        pages: await Promise.all(d.pages.map(async (pg) => ({ ...pg, blob: await serBlob(pg.blob) }))),
      })),
    ),
  };
  return new Blob([JSON.stringify(out)], { type: "application/json" });
}

export async function importBackup(file: File): Promise<{ people: number; documents: number }> {
  const json = JSON.parse(await file.text());
  if (json.app !== "doc-secure") throw new Error("This is not a DocSecure backup file.");
  const people: Person[] = json.people.map((p: Ser<Person>) => ({ ...p, photo: deBlob(p.photo) }));
  const documents: VaultDocument[] = json.documents.map((d: Ser<VaultDocument>) => ({
    ...d,
    thumbnail: deBlob(d.thumbnail),
    pages: d.pages.map((pg) => ({ ...pg, blob: deBlob(pg.blob)! })),
  }));
  await db.transaction("rw", db.people, db.documents, async () => {
    await db.people.bulkPut(people);
    await db.documents.bulkPut(documents);
  });
  return { people: people.length, documents: documents.length };
}

export function docFileName(doc: VaultDocument, ownerName: string | undefined, i: number) {
  const safe = (s: string) => s.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const ext = doc.pages[i].type === "application/pdf" ? "pdf" : "jpg";
  const page = doc.pages.length > 1 ? `_p${i + 1}` : "";
  return `${safe(ownerName ?? "document")}_${safe(doc.title).slice(0, 50)}${page}.${ext}`;
}

/** Downloads every page of a document at full quality. */
export async function downloadDocument(doc: VaultDocument, ownerName?: string) {
  for (let i = 0; i < doc.pages.length; i++) {
    downloadBlob(doc.pages[i].blob, docFileName(doc, ownerName, i));
    if (i < doc.pages.length - 1) await new Promise((r) => setTimeout(r, 400));
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
