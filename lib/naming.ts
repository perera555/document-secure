import { getCategory, type CategoryId } from "./categories";

/** "P_R_Perera-passport (2).jpg" → "P R Perera passport". Camera/scanner names like "IMG_0012" give "". */
export function fileStem(name?: string): string {
  if (!name) return "";
  const stem = name
    .replace(/\.[^.]+$/, "")
    .replace(/\(\d{4}-\d{2}-\d{2}[^)]*\)/g, " ") // "(2026-11-25 13.44.33)" added by DocSecure Scan
    .replace(/\(\d+\)/g, " ")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(img|image|scan|scanned|photo|dsc|pxl|document|doc|file|untitled|whatsapp image)?\s*[\d\s]*$/i.test(stem) ? "" : stem;
}

const FILE_WORDS: [RegExp, CategoryId][] = [
  [/passport/i, "passport"],
  [/\b(nic|n i c|national id|identity|id card|id)\b/i, "national_id"],
  [/\b(driving|licen[cs]e|dl)\b/i, "driving_license"],
  [/\bbirth\b/i, "birth_certificate"],
  [/\bmarriage|wedding\b/i, "marriage_certificate"],
  [/\b(medical|report|lab|blood|hospital|clinic|prescription|ecg|scan report|x ?ray|doctor)\b/i, "medical"],
  [/\b(visa|ticket|boarding|travel)\b/i, "visa"],
  [/\b(bill|electricity|water|ceb|leco|telephone|invoice|receipt)\b/i, "bills"],
  [/\b(bank|statement|loan|cheque|account)\b/i, "bank"],
  [/\b(insurance|policy)\b/i, "insurance"],
  [/\b(deed|land|property|survey|lease)\b/i, "property"],
  [/\b(vehicle|car|bike|revenue licen[cs]e|cr book)\b/i, "vehicle"],
  [/\btax\b/i, "tax"],
  [/\b(salary|payslip|epf|etf|appointment|employment)\b/i, "employment"],
  [/\b(court|affidavit|attorney|will|agreement)\b/i, "legal"],
  [/\b(certificate|school|university|degree|diploma|exam|transcript|o l|a l)\b/i, "education"],
];

/** Guesses the folder from a file name, e.g. "Shanthi NIC.jpg" → national_id. */
export function categoryFromFileName(stem: string): CategoryId {
  for (const [re, cat] of FILE_WORDS) if (re.test(stem)) return cat;
  return "other";
}
import type { Extraction } from "./extract-types";

/**
 * The best human name for a document, built from what was read on it, e.g.
 *   "Passport N1234567", "National ID card 195312345678",
 *   "Blood test report – Asiri Hospital", "Electricity bill – CEB".
 * Prefers the title read from the document when it is specific enough.
 */
export function smartTitle(ex: Pick<Extraction, "title" | "documentNumber" | "issuer" | "nicNumber">, category: CategoryId): string {
  const num = ex.documentNumber?.trim();
  const issuer = ex.issuer?.trim();
  const read = ex.title?.trim() ?? "";
  const label = getCategory(category).label;
  const generic = !read || read.length < 4 || /^(document|scanned document|other|untitled)$/i.test(read) || read.toLowerCase() === label.toLowerCase();

  const withNum = (name: string, n?: string) => (n && !name.includes(n) ? `${name} ${n}` : name);

  switch (category) {
    case "passport":
      return withNum("Passport", num);
    case "national_id":
      return withNum("National ID card", num || ex.nicNumber?.trim());
    case "driving_license":
      return withNum("Driving licence", num);
    case "birth_certificate":
      return withNum("Birth certificate", num);
    case "marriage_certificate":
      return withNum("Marriage certificate", num);
    case "visa":
      return withNum(generic ? "Visa" : read, num);
  }

  let name = generic ? (category === "medical" ? "Medical report" : label) : read;
  if (issuer && !name.toLowerCase().includes(issuer.toLowerCase())) name = `${name} – ${issuer}`;
  return name.slice(0, 90);
}
