"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, IdCard, ImagePlus, Loader2, Plus, RotateCcw, Trash2, User } from "lucide-react";
import { Tilt3D } from "./Tilt3D";
import { createPerson, updatePerson, PERSON_COLORS, type DocField, type Person } from "@/lib/db";
import { PERSON_FIELDS, detailsFromExtraction, type PersonDetailKey } from "@/lib/gather";
import { blobToBase64, base64ToBlob, makeThumbnail, processImage } from "@/lib/image";
import { extractDocument } from "@/lib/extract";
import { Avatar, Modal } from "./ui";
import { DateSelect, GenderSelect } from "./DateSelect";
import { toast } from "./Toast";

const RELATIONSHIPS = ["Self", "Father", "Mother", "Spouse", "Son", "Daughter", "Brother", "Sister", "Grandparent", "Other"];

export type PersonDraft = Partial<Person> & { fullName: string };

/** The form in four short steps. Step 1 holds photo, name and relationship. */
const STEPS: { title: string; keys: PersonDetailKey[] }[] = [
  { title: "Photo & name", keys: [] },
  { title: "Birth & ID", keys: ["dateOfBirth", "gender", "nicNumber", "bloodGroup"] },
  { title: "Contact", keys: ["mobile", "phone", "email", "address", "occupation"] },
  { title: "Certificates", keys: ["passportNumber", "birthCertificateNumber", "marriageCertificateNumber", "drivingLicenseNumber"] },
];

/** 3D ID card that updates as the form is filled in. */
function IdCardPreview({ draft }: { draft: PersonDraft }) {
  const rows = [
    ["ID / NIC", draft.nicNumber],
    ["Date of birth", draft.dateOfBirth ? new Date(draft.dateOfBirth).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : ""],
    ["Sex", draft.gender],
    ["Blood", draft.bloodGroup],
    ["Mobile", draft.mobile || draft.phone],
    ["Passport", draft.passportNumber],
  ].filter(([, v]) => v) as [string, string][];
  const color = draft.color ?? PERSON_COLORS[0];

  return (
    <Tilt3D max={12}>
      <div className="card overflow-hidden">
        <div className={`flex items-center gap-2 bg-linear-to-r ${color} px-4 py-2 text-white`}>
          <span className="text-[9px] font-bold uppercase tracking-[0.22em]">Family ID Card</span>
          {draft.relationship && <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold">{draft.relationship}</span>}
        </div>
        <div
          className="flex gap-3 p-4"
          style={{ backgroundImage: "repeating-linear-gradient(115deg, rgb(127 127 127 / 0.08) 0 1px, transparent 1px 12px)" }}
        >
          <div className="flex flex-col items-center gap-2">
            <Avatar person={{ fullName: draft.fullName || "?", color, photo: draft.photo }} size={72} />
            <div className="h-5 w-7 rounded-md bg-linear-to-br from-amber-200 via-yellow-400 to-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-widest text-muted">Name</p>
            <p className="truncate text-base font-extrabold uppercase leading-tight">{draft.fullName || "Your name"}</p>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
              {rows.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[8px] font-semibold uppercase tracking-wider text-muted">{k}</dt>
                  <dd className="truncate font-mono text-[11px] font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {rows.length === 0 && <p className="mt-2 text-[11px] text-muted">Details appear here as you type.</p>}
          </div>
        </div>
        {draft.address && <p className="truncate px-4 pb-3 text-xs text-muted">📍 {draft.address}</p>}
      </div>
    </Tilt3D>
  );
}

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
    <Modal open={open} onClose={onClose} title={person ? "Edit person details" : "Add a person"} wide persistent>
      {open && <FormBody person={person} initial={initial} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

/* ---- Unsaved draft, kept in this browser so typed details survive closing or reloading ---- */

const draftKey = (person?: Person) => `personDraft:${person?.id ?? "new"}`;

function loadDraft(person?: Person): { draft: PersonDraft; photo?: Blob } | null {
  try {
    const raw = localStorage.getItem(draftKey(person));
    if (!raw) return null;
    const { photoB64, photoType, ...draft } = JSON.parse(raw) as PersonDraft & { photoB64?: string; photoType?: string };
    return { draft, photo: photoB64 ? base64ToBlob(photoB64, photoType ?? "image/jpeg") : undefined };
  } catch {
    return null;
  }
}
function clearDraft(person?: Person) {
  try {
    localStorage.removeItem(draftKey(person));
  } catch {}
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
  const [restored, setRestored] = useState(false);
  const [draft, setDraft] = useState<PersonDraft>(() => {
    const base: PersonDraft = {
      fullName: "",
      color: PERSON_COLORS[0],
      ...initial,
      ...person,
      extraFields: person?.extraFields ?? initial?.extraFields ?? [],
    };
    return base;
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState("");
  const [step, setStep] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  // Bring back details typed earlier that were never saved.
  useEffect(() => {
    const saved = loadDraft(person);
    if (saved) {
      setDraft((d) => ({ ...d, ...saved.draft, photo: saved.photo ?? d.photo }));
      setRestored(true);
      setDirty(true);
    }
  }, [person]);

  // Keep the draft up to date while typing.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(async () => {
      try {
        const { photo, ...rest } = draft;
        const extra = photo ? { photoB64: await blobToBase64(photo), photoType: photo.type } : {};
        localStorage.setItem(draftKey(person), JSON.stringify({ ...rest, ...extra }));
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [draft, dirty, person]);

  // If the form closes before the delayed save above runs, save the typed text right away.
  const latest = useRef({ draft, dirty, saved: false });
  latest.current = { ...latest.current, draft, dirty };
  useEffect(
    () => () => {
      const { draft: d, dirty: isDirty, saved } = latest.current;
      if (!isDirty || saved) return;
      try {
        const prev = JSON.parse(localStorage.getItem(draftKey(person)) ?? "{}");
        const { photo: _photo, ...rest } = d;
        localStorage.setItem(draftKey(person), JSON.stringify({ ...prev, ...rest }));
      } catch {}
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const set = <K extends keyof PersonDraft>(k: K, v: PersonDraft[K]) => {
    setDirty(true);
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const extra = draft.extraFields ?? [];
  const setExtra = (list: DocField[]) => set("extraFields", list);

  async function onPhoto(file?: File) {
    if (!file) return;
    set("photo", await makeThumbnail(file, 512));
  }

  /** Reads an ID card / birth certificate photo and fills the empty fields. */
  async function fillFromDocument(file?: File) {
    if (!file) return;
    setFilling("Reading document…");
    try {
      const page = file.type.startsWith("image/") ? (await processImage(file, { filter: "auto" })).blob : file;
      const { extraction: ex } = await extractDocument([{ blob: page, type: file.type.startsWith("image/") ? "image/jpeg" : file.type }], setFilling);
      const found: Partial<PersonDraft> = { ...detailsFromExtraction(ex) };
      if (ex.ownerName) found.fullName = ex.ownerName.replace(/^(mr|mrs|ms|miss|dr|rev)\.?\s+/i, "");
      let n = 0;
      setDirty(true);
      setDraft((d) => {
        const next = { ...d };
        for (const [k, v] of Object.entries(found) as [keyof PersonDraft, string][]) {
          if (v && !String(next[k] ?? "").trim()) {
            (next as Record<string, unknown>)[k] = v;
            n++;
          }
        }
        return next;
      });
      setTimeout(() => toast(n ? `Filled ${n} detail${n > 1 ? "s" : ""} from the document` : "No new details found — please type them", n ? "ok" : "error"), 0);
    } catch {
      toast("Could not read that document", "error");
    } finally {
      setFilling("");
    }
  }

  async function save() {
    if (!draft.fullName.trim()) return;
    setSaving(true);
    const clean = { ...draft, extraFields: extra.filter((f) => f.label.trim() || f.value.trim()) };
    try {
      if (person) {
        const updated = { ...person, ...clean, fullName: clean.fullName.trim(), updatedAt: Date.now() };
        await updatePerson(updated, person.fullName);
        onSaved?.(updated);
      } else {
        // Save first. (Writing `onSaved?.(await createPerson(...))` would skip the save
        // entirely whenever no onSaved callback is given — `?.` skips its arguments too.)
        const created = await createPerson(clean);
        onSaved?.(created);
      }
      latest.current.saved = true;
      clearDraft(person);
      toast(person ? "Details saved" : `${clean.fullName.trim()} added`);
      onClose();
    } catch {
      toast("Could not save. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty && !confirm("Discard the details you typed?")) return;
    latest.current.saved = true; // discarded on purpose: don't keep a draft
    clearDraft(person);
    onClose();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      {restored && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <RotateCcw size={14} /> Your unsaved details were brought back.
          <button
            type="button"
            className="ml-auto font-semibold underline-offset-2 hover:underline"
            onClick={() => {
              clearDraft(person);
              setDraft({ fullName: "", color: PERSON_COLORS[0], ...initial, ...person, extraFields: person?.extraFields ?? [] });
              setRestored(false);
              setDirty(false);
            }}
          >
            Start over
          </button>
        </div>
      )}

      {/* Steps */}
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`w-full rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                i === step
                  ? "bg-linear-to-r from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/30"
                  : i < step
                    ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "bg-black/4 text-muted dark:bg-white/5"
              }`}
            >
              <span className="block text-[10px] uppercase tracking-wider opacity-80">Step {i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
      {step === 0 && (
      <>
      {/* Fill from ID card */}
      <button
        type="button"
        disabled={!!filling}
        onClick={() => idRef.current?.click()}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-indigo-400/50 bg-indigo-500/5 px-4 py-3 text-left transition hover:bg-indigo-500/10"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-sky-500 text-white shadow">
          {filling ? <Loader2 className="animate-spin" size={20} /> : <IdCard size={22} />}
        </span>
        <span>
          <span className="block text-sm font-semibold">{filling || "Fill from ID card"}</span>
          <span className="block text-xs text-muted">Take a photo of an ID card, passport or birth certificate. Empty fields are filled for you.</span>
        </span>
      </button>
      <input ref={idRef} hidden type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => { fillFromDocument(e.target.files?.[0]); e.target.value = ""; }} />

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
          <label className="label" htmlFor="pf-name">Full name *</label>
          <input
            id="pf-name"
            className="input text-base"
            required
            autoFocus
            placeholder="e.g. P R Perera"
            value={draft.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="pf-rel">Relationship</label>
          <input id="pf-rel" className="input" list="relationships" placeholder="Father, Mother, Self…" value={draft.relationship ?? ""} onChange={(e) => set("relationship", e.target.value)} />
          <datalist id="relationships">
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
      </div>
      </>
      )}

      {step > 0 && (
      <div className="grid gap-4 sm:grid-cols-2">
        {PERSON_FIELDS.filter((f) => STEPS[step].keys.includes(f.key)).map((f) => (
          <div key={f.key} className={f.key === "address" || f.key === "dateOfBirth" ? "sm:col-span-2" : ""}>
            <label className="label" htmlFor={`pf-${f.key}`}>{f.label}</label>
            {f.key === "address" ? (
              <textarea id={`pf-${f.key}`} className="input min-h-20" value={draft[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.key === "dateOfBirth" ? (
              <DateSelect id={`pf-${f.key}`} value={draft.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} showAge />
            ) : f.key === "gender" ? (
              <GenderSelect id={`pf-${f.key}`} value={draft.gender} onChange={(v) => set("gender", v)} />
            ) : (
              <input
                id={`pf-${f.key}`}
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
      )}

      {step === STEPS.length - 1 && (
      <>
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
        <label className="label" htmlFor="pf-notes">Notes</label>
        <textarea id="pf-notes" className="input min-h-20" value={draft.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
      </div>
      </>
      )}
        </div>

        {/* Live 3D card preview */}
        <div className="h-fit lg:sticky lg:top-20">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Live preview</p>
          <IdCardPreview draft={draft} />
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur">
        {dirty && <span className="mr-auto text-xs text-muted">Draft kept on this device</span>}
        <button type="button" className="btn-ghost" onClick={cancel}>
          Cancel
        </button>
        {step > 0 && (
          <button type="button" className="btn-ghost" onClick={() => setStep(step - 1)}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="btn-ghost" disabled={step === 0 && !draft.fullName.trim()} onClick={() => setStep(step + 1)}>
            Next <ChevronRight size={16} />
          </button>
        )}
        <button className="btn-primary" disabled={saving || !draft.fullName.trim()}>
          {saving ? "Saving…" : person ? "Save changes" : "Add person"}
        </button>
      </div>
    </form>
  );
}
