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

/** Downloads the whole document (all pages, full quality) as one PDF: "P R Perera - Sri Lanka Passport.pdf". */
export async function downloadDocument(doc: VaultDocument, ownerName?: string) {
  if (!doc.pages.length) return;
  const { pagesToPdf } = await import("./pdf");
  const safe = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  const name = `${safe(ownerName ?? "Document")} - ${safe(doc.title).slice(0, 60) || "Document"}.pdf`;
  downloadBlob(await pagesToPdf(doc.pages, doc.title), name);
}

/**
 * Shares the document as one PDF through the phone's share sheet (WhatsApp, email, Viber…).
 * Where sharing files isn't supported (most desktop browsers), downloads the PDF instead.
 */
export async function shareDocument(doc: VaultDocument, ownerName?: string) {
  if (!doc.pages.length) return;
  const { pagesToPdf } = await import("./pdf");
  const safe = (s: string) => s.replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim();
  const name = `${safe(ownerName ?? "Document")} - ${safe(doc.title).slice(0, 60) || "Document"}.pdf`;
  const blob = await pagesToPdf(doc.pages, doc.title);
  const file = new File([blob], name, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: doc.title, text: `${doc.title} — ${ownerName ?? ""}`.trim() });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return; // person closed the share sheet
    }
  }
  downloadBlob(blob, name);
}

/** Prints the whole document (all pages) using the browser's print dialog. */
export async function printDocument(doc: VaultDocument) {
  if (!doc.pages.length) return;
  const { pagesToPdf } = await import("./pdf");
  const url = URL.createObjectURL(await pagesToPdf(doc.pages, doc.title));
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, "_blank"); // some browsers can't print a PDF from a frame: open it instead
    }
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  };
  document.body.appendChild(frame);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
