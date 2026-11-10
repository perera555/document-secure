"use client";

import { useRef, useState } from "react";
import { Camera, ChevronDown, Plus, UserPlus } from "lucide-react";
import { PERSON_FIELDS, type PersonDetailKey } from "@/lib/gather";
import { createPerson, PERSON_COLORS } from "@/lib/db";
import { makeThumbnail } from "@/lib/image";
import { Avatar } from "./ui";
import { Tilt3D } from "./Tilt3D";

/** Inline "add person" form shown as a 3D card in the people grid. */
export function QuickAddCard({ onFullForm, count }: { onFullForm: () => void; count: number }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [photo, setPhoto] = useState<Blob>();
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);
  const [extra, setExtra] = useState<Partial<Record<PersonDetailKey, string>>>({});
  const photoRef = useRef<HTMLInputElement>(null);
  const color = PERSON_COLORS[count % PERSON_COLORS.length];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const filled = Object.fromEntries(Object.entries(extra).filter(([, v]) => v?.trim()));
      await createPerson({ ...filled, fullName: name, relationship, mobile, address, photo });
      setExtra({});
      setMore(false);
      setName("");
      setRelationship("");
      setMobile("");
      setAddress("");
      setPhoto(undefined);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tilt3D className="h-full" max={6}>
      <form onSubmit={add} className="card relative flex h-full flex-col border-2 border-dashed border-indigo-400/50 [transform-style:preserve-3d]">
        <div className={`relative h-20 rounded-t-2xl bg-linear-to-br ${color} opacity-80`}>
          <p className="layer-1 absolute left-5 top-3 flex items-center gap-2 text-sm font-semibold text-white">
            <UserPlus size={16} /> Add person
          </p>
        </div>
        <div className="flex flex-1 flex-col gap-2.5 px-5 pb-5 [transform-style:preserve-3d]">
          <button
            type="button"
            onClick={() => photoRef.current?.click()}
            className="layer-2 -mt-10 w-fit rounded-3xl ring-4 ring-card"
            aria-label="Add photo"
            title="Add photo"
          >
            {photo || name ? (
              <Avatar person={{ fullName: name || "?", color, photo }} size={76} />
            ) : (
              <span className="grid h-[76px] w-[76px] place-items-center rounded-2xl bg-black/5 text-muted dark:bg-white/10">
                <Camera size={26} />
              </span>
            )}
          </button>
          <input
            ref={photoRef}
            hidden
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setPhoto(await makeThumbnail(f, 512));
              e.target.value = "";
            }}
          />
          <input className="input" placeholder="Full name *  e.g. P R Perera" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" list="quick-rel" placeholder="Relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
            <input className="input" type="tel" placeholder="Mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
          </div>
          <datalist id="quick-rel">
            {["Self", "Father", "Mother", "Spouse", "Son", "Daughter", "Brother", "Sister"].map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button type="button" onClick={() => setMore((m) => !m)} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            <ChevronDown size={14} className={`transition ${more ? "rotate-180" : ""}`} /> {more ? "Fewer details" : "More details (ID, passport, certificates…)"}
          </button>
          {more && (
            <div className="animate-pop grid grid-cols-2 gap-2">
              {PERSON_FIELDS.filter((f) => !["mobile", "address"].includes(f.key)).map((f) => (
                <div key={f.key} className={f.key === "email" ? "col-span-2" : ""}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input py-2"
                    type={f.type ?? "text"}
                    placeholder={f.placeholder}
                    value={extra[f.key] ?? ""}
                    onChange={(e) => setExtra((x) => ({ ...x, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="mt-auto flex items-center gap-2 pt-1">
            <button className="btn-primary flex-1" disabled={saving || !name.trim()}>
              <Plus size={16} /> {saving ? "Adding…" : "Add"}
            </button>
            <button type="button" className="btn-ghost px-3 text-xs" onClick={onFullForm}>
              Full form
            </button>
          </div>
        </div>
      </form>
    </Tilt3D>
  );
}
