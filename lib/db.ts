"use client";

import Dexie, { type EntityTable } from "dexie";
import type { CategoryId } from "./categories";

export interface Person {
  id: string;
  fullName: string;
  relationship?: string; // Father, Mother, Self, ...
  dateOfBirth?: string;
  nicNumber?: string;
  passportNumber?: string;
  birthCertificateNumber?: string;
  marriageCertificateNumber?: string;
  drivingLicenseNumber?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
  address?: string;
  gender?: string;
  occupation?: string;
  notes?: string;
  /** Custom details added by hand or gathered from documents */
  extraFields?: DocField[];
  color: string; // gradient key
  photo?: Blob;
  createdAt: number;
  updatedAt: number;
}

export interface DocField {
  label: string;
  value: string;
}

export interface DocPage {
  blob: Blob; // full quality image (jpeg/png) or pdf
  type: string; // mime
  width?: number;
  height?: number;
}

export interface VaultDocument {
  id: string;
  personId: string;
  category: CategoryId;
  title: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  issuer?: string;
  summary?: string;
  fields: DocField[];
  text?: string; // full OCR text, used for search
  notes?: string;
  pages: DocPage[];
  thumbnail?: Blob;
  extractedBy?: "ai" | "ocr" | "manual";
  createdAt: number;
  updatedAt: number;
}

export interface Setting {
  key: string;
  value: unknown;
}

/** Files auto-imported from the scanner folder, waiting to be filed. */
export interface InboxItem {
  id: string;
  name: string;
  blob: Blob;
  type: string;
  createdAt: number;
}

class VaultDB extends Dexie {
  people!: EntityTable<Person, "id">;
  documents!: EntityTable<VaultDocument, "id">;
  settings!: EntityTable<Setting, "key">;
  inbox!: EntityTable<InboxItem, "id">;

  constructor() {
    super("doc-secure-vault");
    this.version(1).stores({
      people: "id, fullName, createdAt",
      documents: "id, personId, category, [personId+category], createdAt, expiryDate",
      settings: "key",
      inbox: "id, createdAt",
    });
  }
}

export const db = new VaultDB();

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const PERSON_COLORS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-lime-500 to-emerald-600",
];

export async function createPerson(data: Partial<Person> & { fullName: string }) {
  const count = await db.people.count();
  const now = Date.now();
  const person: Person = {
    color: PERSON_COLORS[count % PERSON_COLORS.length],
    ...data,
    id: uid(),
    fullName: data.fullName.trim(),
    createdAt: now,
    updatedAt: now,
  };
  await db.people.add(person);
  return person;
}

export async function deletePerson(id: string) {
  await db.transaction("rw", db.people, db.documents, async () => {
    await db.documents.where("personId").equals(id).delete();
    await db.people.delete(id);
  });
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return (row?.value as T) ?? fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value });
}

export function initials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
