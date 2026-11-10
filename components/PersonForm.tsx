"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Plus, Trash2, User } from "lucide-react";
import { createPerson, db, PERSON_COLORS, type DocField, type Person } from "@/lib/db";
import { PERSON_FIELDS, type PersonDetailKey } from "@/lib/gather";
import { makeThumbnail } from "@/lib/image";
import { Avatar, Modal } from "./ui";

const RELATIONSHIPS = ["Self", "Father", "Mother", "Spouse", "Son", "Daughter", "Brother", "Sister", "Grandparent", "Other"];

export type PersonDraft = Partial<Person> & { fullName: string };

export function PersonForm({
  open,
  onClose,
  person,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  person?: Person;
  initial?: Partial<Person>;
  onSaved?: (p: Person) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={person ? "Edit person details" : "Add a person"} wide>
      {open && <FormBody person={person} initial={initial} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function FormBody({
  person,
  initial,
  onClose,
  onSaved,
}: {
  person?: Person;
  initial?: Partial<Person>;
  onClose: () => void;
  onSaved?: (p: Person) => void;
}) {
  const [draft, setDraft] = useState<PersonDraft>(() => ({
    fullName: "",
    color: PERSON_COLORS[0],
    ...initial,
    ...person,
    extraFields: person?.extraFields ?? initial?.extraFields ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const extra = draft.extraFields ?? [];
  const setExtra = (list: DocField[]) => set("extraFields", list);

  async function onPhoto(file?: File) {
    if (!file) return;
    set("photo", await makeThumbnail(file, 512));
  }

  async function save() {
    if (!draft.fullName.trim()) return;
    setSaving(true);
    const clean = { ...draft, extraFields: extra.filter((f) => f.label.trim() || f.value.trim()) };
    try {
      if (person) {
        const updated = { ...person, ...clean, fullName: clean.fullName.trim(), updatedAt: Date.now() };
        await db.people.put(updated);
        onSaved?.(updated);
      } else {
        onSaved?.(await createPerson(clean));
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative">
          {draft.fullName || draft.photo ? (
            <Avatar person={{ fullName: draft.fullName || "?", color: draft.color ?? PERSON_COLORS[0], photo: draft.photo }} size={96} />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-2xl bg-black/5 text-muted dark:bg-white/5">
              <User size={40} />
            </div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <button type="button" className="btn-ghost" onClick={() => camRef.current?.click()}>
            <Camera size={16} /> Take photo
          </button>
          <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <ImagePlus size={16} /> Upload photo
          </button>
          {draft.photo && (
            <button type="button" className="btn-ghost text-rose-600" onClick={() => set("photo", undefined)}>
              <Trash2 size={16} /> Remove
            </button>
          )}
          <input ref={camRef} hidden type="file" accept="image/*" capture="user" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <input ref={fileRef} hidden type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0])} />
          <div className="flex w-full items-center justify-center gap-1.5 pt-1 sm:justify-start">
            {PERSON_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label="Card colour"
                onClick={() => set("color", c)}
                className={`h-6 w-6 rounded-full bg-linear-to-br ${c} ring-offset-2 ring-offset-card ${draft.color === c ? "ring-2 ring-indigo-500" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Full name *</label>
          <input
            className="input text-base"
            required
            autoFocus
            placeholder="e.g. P R Perera"
            value={draft.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Relationship</label>
          <input className="input" list="relationships" placeholder="Father, Mother, Self…" value={draft.relationship ?? ""} onChange={(e) => set("relationship", e.target.value)} />
          <datalist id="relationships">
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        {PERSON_FIELDS.map((f) => (
          <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
            <label className="label">{f.label}</label>
            {f.key === "address" ? (
              <textarea className="input min-h-20" value={draft[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input
                className="input"
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={draft[f.key as PersonDetailKey] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">More details</h3>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setExtra([...extra, { label: "", value: "" }])}>
            <Plus size={14} /> Add detail
          </button>
        </div>
        {extra.length === 0 && <p className="text-xs text-muted">Add anything else, e.g. bank account, EPF number, allergies, doctor&apos;s name.</p>}
        <div className="space-y-2">
          {extra.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input className="input w-2/5" placeholder="Label" value={f.label} onChange={(e) => setExtra(extra.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="input flex-1" placeholder="Value" value={f.value} onChange={(e) => setExtra(extra.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <button type="button" className="rounded-xl px-2 text-muted hover:text-rose-600" aria-label="Remove" onClick={() => setExtra(extra.filter((_, j) => j !== i))}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-20" value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn-primary" disabled={saving || !draft.fullName.trim()}>
          {saving ? "Saving…" : person ? "Save changes" : "Add person"}
        </button>
      </div>
    </form>
  );
}
