import { getCategory, type CategoryId } from "./categories";
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
