import type { Person, VaultDocument } from "./db";
import type { Extraction } from "./extract-types";

export type PersonDetailKey =
  | "dateOfBirth"
  | "gender"
  | "nicNumber"
  | "passportNumber"
  | "birthCertificateNumber"
  | "marriageCertificateNumber"
  | "drivingLicenseNumber"
  | "bloodGroup"
  | "address"
  | "mobile"
  | "phone"
  | "email"
  | "occupation";

/** Profile fields shown in the person form/details card, in display order. */
export const PERSON_FIELDS: { key: PersonDetailKey; label: string; type?: string; placeholder?: string }[] = [
  { key: "nicNumber", label: "ID / NIC number", placeholder: "e.g. 195012345678" },
  { key: "dateOfBirth", label: "Date of birth", type: "date" },
  { key: "gender", label: "Gender", placeholder: "Male / Female" },
  { key: "bloodGroup", label: "Blood group", placeholder: "e.g. O+" },
  { key: "passportNumber", label: "Passport number", placeholder: "e.g. N1234567" },
  { key: "birthCertificateNumber", label: "Birth certificate number" },
  { key: "marriageCertificateNumber", label: "Marriage certificate number" },
  { key: "drivingLicenseNumber", label: "Driving licence number" },
  { key: "mobile", label: "Mobile", type: "tel", placeholder: "+94 7X XXX XXXX" },
  { key: "phone", label: "Home phone", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "occupation", label: "Occupation" },
  { key: "address", label: "Address" },
];

const LABEL_MAP: { key: PersonDetailKey; re: RegExp }[] = [
  { key: "bloodGroup", re: /blood\s*(group|type)/i },
  { key: "address", re: /^(permanent\s+|home\s+|residential\s+)?address/i },
  { key: "mobile", re: /(mobile|cell)/i },
  { key: "phone", re: /(phone|tel|telephone|contact\s*no)/i },
  { key: "email", re: /e-?mail/i },
  { key: "gender", re: /^(sex|gender)$/i },
  { key: "occupation", re: /(occupation|profession|designation)/i },
  { key: "dateOfBirth", re: /(date\s*of\s*birth|dob|birth\s*date)/i },
  { key: "nicNumber", re: /(nic|national\s*id|identity\s*card)\s*(no|number)?/i },
  { key: "passportNumber", re: /passport\s*(no|number)/i },
  { key: "birthCertificateNumber", re: /birth\s*cert\w*\s*(no|number)/i },
  { key: "marriageCertificateNumber", re: /marriage\s*cert\w*\s*(no|number)/i },
  { key: "drivingLicenseNumber", re: /(driving\s*licen[cs]e|dl)\s*(no|number)/i },
];

const CATEGORY_NUMBER: Partial<Record<Extraction["category"], PersonDetailKey>> = {
  passport: "passportNumber",
  national_id: "nicNumber",
  birth_certificate: "birthCertificateNumber",
  marriage_certificate: "marriageCertificateNumber",
  driving_license: "drivingLicenseNumber",
};

/** Details found in a scan, keyed by profile field. */
export function detailsFromExtraction(ex: Extraction): Partial<Record<PersonDetailKey, string>> {
  const found: Partial<Record<PersonDetailKey, string>> = {};
  if (ex.dateOfBirth) found.dateOfBirth = ex.dateOfBirth;
  if (ex.nicNumber) found.nicNumber = ex.nicNumber;
  const numKey = CATEGORY_NUMBER[ex.category];
  if (numKey && ex.documentNumber) found[numKey] = ex.documentNumber;
  for (const f of ex.fields) {
    const hit = LABEL_MAP.find((m) => m.re.test(f.label.trim()));
    if (hit && f.value.trim() && !found[hit.key]) found[hit.key] = f.value.trim();
  }
  return found;
}

/**
 * Details from a scan that are still empty on the person's profile.
 * Values already on the profile (typed by hand or gathered earlier) are never overwritten.
 */
export function detailsToFill(person: Person, ex: Extraction): Partial<Person> {
  const patch: Partial<Person> = {};
  for (const [k, v] of Object.entries(detailsFromExtraction(ex)) as [PersonDetailKey, string][]) {
    if (!person[k]) patch[k] = v;
  }
  return patch;
}

/** All key/value details across a person's documents, de-duplicated, with the source document. */
export function collectDetails(docs: VaultDocument[]) {
  const map = new Map<string, { label: string; value: string; docId: string; docTitle: string }>();
  for (const d of [...docs].sort((a, b) => b.createdAt - a.createdAt)) {
    const add = (label: string, value?: string) => {
      if (!value?.trim()) return;
      const key = `${label.toLowerCase().trim()}|${value.toLowerCase().trim()}`;
      if (!map.has(key)) map.set(key, { label, value, docId: d.id, docTitle: d.title });
    };
    if (d.documentNumber) add(`${d.title} no.`, d.documentNumber);
    if (d.expiryDate) add(`${d.title} expires`, d.expiryDate);
    for (const f of d.fields) add(f.label, f.value);
  }
  return [...map.values()];
}
