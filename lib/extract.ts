"use client";

import { guessCategory } from "./categories";
import { emptyExtraction, type Extraction } from "./extract-types";
import { blobToBase64, downscaleForAI, isImage } from "./image";
import { getSetting } from "./db";

export type ExtractSource = "ai" | "ocr";

export interface ServerInfo {
  aiEnabled: boolean;
  accessCodeRequired: boolean;
}

let serverInfo: Promise<ServerInfo> | null = null;
export function getServerInfo(): Promise<ServerInfo> {
  serverInfo ??= fetch("/api/extract")
    .then((r) => r.json() as Promise<ServerInfo>)
    .catch(() => ({ aiEnabled: false, accessCodeRequired: false }));
  return serverInfo;
}

export async function extractDocument(
  pages: { blob: Blob; type: string }[],
  onStatus: (s: string) => void,
): Promise<{ extraction: Extraction; source: ExtractSource; warning?: string }> {
  const info = await getServerInfo();
  const useAI = await getSetting("useAI", true);
  let warning: string | undefined;

  if (info.aiEnabled && useAI && navigator.onLine) {
    onStatus("Reading document with AI…");
    try {
      const payload = await Promise.all(
        pages.map(async (p) => {
          if (isImage(p.type)) {
            const small = await downscaleForAI(p.blob);
            return { data: await blobToBase64(small), mediaType: "image/jpeg" };
          }
          return { data: await blobToBase64(p.blob), mediaType: p.type };
        }),
      );
      const code = await getSetting("accessCode", "");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json", "x-access-code": String(code) },
        body: JSON.stringify({ pages: payload }),
      });
      const json = await res.json();
      if (res.ok && json.extraction) return { extraction: json.extraction, source: "ai" };
      warning = json.error ?? "AI extraction failed";
    } catch (e) {
      warning = e instanceof Error ? e.message : "AI extraction failed";
    }
  }

  return { extraction: await ocrExtract(pages, onStatus), source: "ocr", warning };
}

async function ocrExtract(pages: { blob: Blob; type: string }[], onStatus: (s: string) => void) {
  const images = pages.filter((p) => isImage(p.type));
  const result = emptyExtraction();
  if (images.length === 0) return result;

  const { createWorker } = await import("tesseract.js");
  onStatus("Loading text recognizer…");
  const worker = await createWorker("eng", 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onStatus(`Reading text… ${Math.round(m.progress * 100)}%`);
    },
  });
  let text = "";
  try {
    for (const p of images) {
      const { data } = await worker.recognize(p.blob);
      text += data.text + "\n";
    }
  } finally {
    await worker.terminate();
  }
  return parseText(text);
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function normDate(s: string): string {
  s = s.trim();
  let m = s.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/(\d{1,2})\s*([A-Za-z]{3})[A-Za-z]*\s*(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  return "";
}

const DATE_RE = /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4}|\d{1,2}\s*[A-Za-z]{3,9}\s*\d{4})/;

export function parseText(text: string): Extraction {
  const r = emptyExtraction();
  r.fullText = text.trim();
  r.category = guessCategory(text);
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);

  // Passport MRZ: P<LKAPERERA<<PATHIRAGE<RANJITH<<<<
  const mrz = text.match(/P[<A-Z]([A-Z]{3})([A-Z<]{5,})/);
  if (mrz) {
    r.category = "passport";
    const [surname, given] = mrz[2].split("<<");
    r.ownerName = [given?.replace(/</g, " ").trim(), surname?.replace(/</g, " ").trim()]
      .filter(Boolean)
      .join(" ");
    const num = text.match(/\n([A-Z0-9<]{9})\d[A-Z]{3}\d{6}/);
    if (num) r.documentNumber = num[1].replace(/</g, "");
  }

  for (const line of lines) {
    const kv = line.match(/^([A-Za-z .'/()]{2,30})\s*[:\-]\s*(.+)$/);
    if (!kv) continue;
    const label = kv[1].trim();
    const value = kv[2].trim();
    const l = label.toLowerCase();
    if (!r.ownerName && /(patient|full)?\s*name|holder|surname|name of/.test(l) && !/doctor|hospital|father|mother/.test(l)) {
      r.ownerName = value.replace(/^(mr|mrs|ms|miss|dr|rev)\.?\s+/i, "");
    } else if (!r.issueDate && /(issue|report|date)/.test(l) && !/birth|expir/.test(l) && DATE_RE.test(value)) {
      r.issueDate = normDate(value.match(DATE_RE)![0]);
    } else if (!r.expiryDate && /expir|valid/.test(l) && DATE_RE.test(value)) {
      r.expiryDate = normDate(value.match(DATE_RE)![0]);
    } else if (!r.dateOfBirth && /birth|dob/.test(l) && DATE_RE.test(value)) {
      r.dateOfBirth = normDate(value.match(DATE_RE)![0]);
    } else if (!r.documentNumber && /(no|number|ref|id)\b/.test(l)) {
      r.documentNumber = value;
    }
    if (r.fields.length < 30) r.fields.push({ label, value });
  }

  const nic = text.match(/\b(\d{9}[VvXx]|(19|20)\d{10})\b/);
  if (nic) {
    r.nicNumber = nic[1].toUpperCase();
    if (r.category === "national_id" && !r.documentNumber) r.documentNumber = r.nicNumber;
  }
  r.issuer = lines.find((l) => /hospital|department|bank|ministry|clinic|laborator|insurance|university/i.test(l)) ?? "";
  r.title = r.issuer || lines[0]?.slice(0, 60) || "Scanned document";
  return r;
}
