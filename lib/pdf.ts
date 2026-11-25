"use client";

import { PDFDocument } from "pdf-lib";
import type { DocPage } from "./db";

/** A4 in PDF points (1/72 inch). */
const A4 = { w: 595.28, h: 841.89 };

/**
 * Combines all pages of a document (scanned images and/or PDFs) into one PDF.
 * Each image fills an A4 page in its own orientation, keeping full resolution.
 */
export async function pagesToPdf(pages: DocPage[], title?: string): Promise<Blob> {
  // A single PDF page needs no conversion.
  if (pages.length === 1 && pages[0].type === "application/pdf") return pages[0].blob;

  const pdf = await PDFDocument.create();
  if (title) pdf.setTitle(title);
  pdf.setCreator("DocSecure");

  for (const pg of pages) {
    const bytes = new Uint8Array(await pg.blob.arrayBuffer());
    if (pg.type === "application/pdf") {
      const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const copied = await pdf.copyPages(src, src.getPageIndices());
      copied.forEach((p) => pdf.addPage(p));
      continue;
    }
    const img = pg.type === "image/png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(await asJpeg(pg.blob, bytes));
    const landscape = img.width > img.height;
    const pw = landscape ? A4.h : A4.w;
    const ph = landscape ? A4.w : A4.h;
    const scale = Math.min(pw / img.width, ph / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const page = pdf.addPage([pw, ph]);
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }

  const out = await pdf.save();
  return new Blob([out as BlobPart], { type: "application/pdf" });
}

/** pdf-lib only embeds JPEG/PNG; convert anything else (webp, bmp…) to JPEG. */
async function asJpeg(blob: Blob, bytes: Uint8Array): Promise<Uint8Array> {
  if (blob.type === "image/jpeg" || (bytes[0] === 0xff && bytes[1] === 0xd8)) return bytes;
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const jpg = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.93));
  return new Uint8Array(await jpg.arrayBuffer());
}
