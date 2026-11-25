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
  /** Relative path of the PDF copy in the computer folder, e.g. "P R Perera/Medical/Blood test (2026-11-10).pdf" */
  savedPath?: string;
  /** SHA-256 of the original first page, used to spot the same file being saved twice. */
  fileHash?: string;
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
  // Create "<computer folder>/<Person name>/" with details.txt + photo, if set up.
  void computerSync().then((m) => m.savePersonToComputer(person.id));
  return person;
}

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9඀-෿஀-௿]+/g, " ").trim();

/** An existing person with the same name (ignoring case, dots and extra spaces), if any. */
export async function findPersonByName(name: string, exceptId?: string) {
  const n = normName(name);
  if (!n) return undefined;
  return (await db.people.toArray()).find((p) => p.id !== exceptId && normName(p.fullName) === n);
}

/** SHA-256 of a file, hex. */
export async function hashBlob(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Saves edits to a person. Their computer folder follows (and moves if renamed). */
export async function updatePerson(person: Person, previousName?: string) {
  await db.people.put({ ...person, updatedAt: Date.now() });
  void computerSync().then((m) => m.savePersonToComputer(person.id, previousName));
}

export async function deletePerson(id: string) {
  const person = await db.people.get(id);
  const docs = await db.documents.where("personId").equals(id).toArray();
  await db.transaction("rw", db.people, db.documents, async () => {
    await db.documents.where("personId").equals(id).delete();
    await db.people.delete(id);
  });
  if (person) void computerSync().then((m) => m.removePersonFromComputer(person, docs));
}

export async function deleteDocument(id: string) {
  const doc = await db.documents.get(id);
  await db.documents.delete(id);
  if (doc) {
    void computerSync().then(async (m) => {
      await m.removeFromComputer(doc);
      await m.savePersonToComputer(doc.personId); // refresh details.txt document list
    });
  }
}

/** Loaded lazily: export.ts imports this file, so a static import would be circular. */
const computerSync = () => import("./export");

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
