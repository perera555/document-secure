"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ChevronRight, MapPin, Pencil, RotateCw, Trash2 } from "lucide-react";
import { deletePerson, type Person, type VaultDocument } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { PERSON_FIELDS } from "@/lib/gather";
import { Avatar, expiryStatus, formatDate } from "./ui";
import { Tilt3D } from "./Tilt3D";

function mrz(person: Person) {
  const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "<");
  const parts = person.fullName.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const given = parts.slice(0, -1).join(" ");
  const line1 = `IDLKA${clean(surname)}<<${clean(given)}`.padEnd(36, "<").slice(0, 36);
  const id = clean(person.nicNumber || person.drivingLicenseNumber || person.id.slice(0, 9));
  const dob = (person.dateOfBirth ?? "").replace(/-/g, "").slice(2);
  const line2 = `${id}<${dob || "<<<<<<"}<${clean(person.gender?.[0] ?? "<")}`.padEnd(36, "<").slice(0, 36);
  return [line1, line2];
}

export function PersonIdCard({ person, docs, onEdit }: { person: Person; docs: VaultDocument[]; onEdit: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const alerts = docs.filter((d) => ["expired", "soon"].includes(expiryStatus(d.expiryDate) ?? "")).length;

  const val = (k: (typeof PERSON_FIELDS)[number]) => (k.type === "date" ? formatDate(person[k.key]) : person[k.key]) || "";
  const front = [
    { label: "ID / NIC", value: person.nicNumber },
    { label: "Date of birth", value: formatDate(person.dateOfBirth) },
    { label: "Blood", value: person.bloodGroup },
    { label: "Sex", value: person.gender },
    { label: "Mobile", value: person.mobile || person.phone },
    { label: "Driving licence", value: person.drivingLicenseNumber },
    { label: "Passport no.", value: person.passportNumber },
    { label: "Birth cert. no.", value: person.birthCertificateNumber },
    { label: "Marriage cert. no.", value: person.marriageCertificateNumber },
    { label: "Email", value: person.email },
  ].filter((f) => f.value);
  const all = [
    ...PERSON_FIELDS.filter((f) => f.key !== "address" && person[f.key]).map((f) => ({ label: f.label, value: val(f) })),
    ...(person.extraFields ?? []).filter((f) => f.value),
  ];

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const iconBtn = "grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur transition hover:bg-white/35";

  return (
    <Tilt3D className="h-full" max={9}>
      <Link href={`/vault/${person.id}`} className="group block h-full [perspective:1400px]" aria-label={`Open ${person.fullName}'s documents`}>
        <div
          className="relative grid h-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none", transitionTimingFunction: "cubic-bezier(0.23,1,0.32,1)" }}
        >
          {/* ---------- FRONT: licence style ---------- */}
          <div className="card relative flex min-h-[290px] flex-col overflow-hidden [backface-visibility:hidden] [grid-area:1/1] [transform-style:preserve-3d]">
            {/* guilloche background pattern */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
              style={{ backgroundImage: "repeating-radial-gradient(circle at 80% 120%, currentColor 0 1px, transparent 1px 9px), repeating-linear-gradient(115deg, currentColor 0 1px, transparent 1px 14px)" }}
            />
            <div className={`relative flex items-center gap-2 bg-linear-to-r ${person.color} px-4 py-2.5 text-white`}>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em]">Family ID Card</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{person.relationship || "Member"}</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={act(() => setFlipped(true))} className={iconBtn} aria-label="Show all details" title="Flip – all details"><RotateCw size={14} /></button>
                <button onClick={act(onEdit)} className={iconBtn} aria-label="Edit person" title="Edit"><Pencil size={14} /></button>
              </div>
            </div>

            <div className="relative flex flex-1 gap-4 p-4 [transform-style:preserve-3d]">
              <div className="layer-3 flex shrink-0 flex-col items-center gap-2">
                <div className="rounded-2xl shadow-xl ring-2 ring-white dark:ring-white/20">
                  <Avatar person={person} size={92} />
                </div>
                {/* chip */}
                <div className="h-6 w-8 rounded-md bg-linear-to-br from-amber-200 via-yellow-400 to-amber-500 shadow-inner ring-1 ring-amber-600/40">
                  <div className="mx-auto mt-1 h-4 w-5 rounded-sm border border-amber-700/40" />
                </div>
              </div>
              <div className="layer-1 min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-muted">Name</p>
                <h3 className="truncate text-lg font-extrabold uppercase leading-tight tracking-tight">{person.fullName}</h3>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {front.map((f) => (
                    <div key={f.label} className={`min-w-0 ${f.label === "Email" ? "col-span-2" : ""}`}>
                      <dt className="text-[9px] font-semibold uppercase tracking-wider text-muted">{f.label}</dt>
                      <dd className="truncate font-mono text-[12px] font-semibold">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {front.length === 0 && (
                  <button onClick={act(onEdit)} className="mt-2 rounded-lg border border-dashed border-border px-2 py-1.5 text-xs text-muted hover:border-indigo-400 hover:text-indigo-500">
                    + Add ID, birthday, mobile…
                  </button>
                )}
              </div>
              {/* hologram */}
              <div
                className="layer-2 pointer-events-none absolute bottom-3 right-4 h-12 w-12 rounded-full opacity-60 mix-blend-multiply dark:mix-blend-screen"
                style={{ background: "conic-gradient(from 0deg, #f0abfc, #93c5fd, #86efac, #fde68a, #f0abfc)", maskImage: "radial-gradient(circle, #000 55%, transparent 56%, transparent 62%, #000 63%)" }}
              />
            </div>

            {person.address && (
              <p className="relative -mt-1 flex items-start gap-1.5 px-4 pb-2 text-xs">
                <MapPin size={13} className="mt-0.5 shrink-0 text-rose-500" />
                <span className="line-clamp-2">{person.address}</span>
              </p>
            )}

            <div className="relative flex items-center gap-2 border-t border-border px-4 py-2 text-xs">
              <span className="font-semibold">{docs.length}</span>
              <span className="text-muted">document{docs.length === 1 ? "" : "s"}</span>
              {alerts > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={11} /> {alerts}
                </span>
              )}
              <span className="ml-auto flex items-center gap-0.5 font-semibold text-indigo-600 transition group-hover:gap-1.5 dark:text-indigo-300">
                Open documents <ChevronRight size={14} />
              </span>
            </div>
            {/* machine readable zone */}
            <div className="relative bg-black/4 px-4 py-1.5 font-mono text-[10px] leading-tight tracking-[0.12em] text-foreground/80 dark:bg-white/5">
              {mrz(person).map((l) => (
                <div key={l} className="truncate">{l}</div>
              ))}
            </div>
          </div>

          {/* ---------- BACK: all details ---------- */}
          <div className="card relative flex min-h-[290px] flex-col overflow-hidden [backface-visibility:hidden] [grid-area:1/1] [transform:rotateY(180deg)]">
            <div className={`flex items-center gap-2 bg-linear-to-r ${person.color} px-4 py-2.5 text-white`}>
              <span className="truncate text-xs font-bold uppercase tracking-widest">{person.fullName}</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={act(() => setFlipped(false))} className={iconBtn} aria-label="Show front" title="Flip back"><RotateCw size={14} /></button>
                <button onClick={act(onEdit)} className={iconBtn} aria-label="Edit person" title="Edit"><Pencil size={14} /></button>
                <button
                  onClick={act(async () => {
                    if (confirm(`Delete ${person.fullName} and all ${docs.length} of their documents? This cannot be undone.`)) await deletePerson(person.id);
                  })}
                  className={`${iconBtn} hover:bg-rose-500`}
                  aria-label="Delete person"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">All details</p>
              {all.length ? (
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {all.map((d, i) => (
                    <div key={i} className="min-w-0">
                      <dt className="truncate text-[9px] font-semibold uppercase tracking-wider text-muted">{d.label}</dt>
                      <dd className="truncate text-[12px] font-semibold" title={d.value}>{d.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-muted">No details yet. Tap ✏️ to add them.</p>
              )}
              {person.address && (
                <div className="mt-2">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted">Address</p>
                  <p className="text-[12px] font-semibold">{person.address}</p>
                </div>
              )}
              {counts.size > 0 && (
                <>
                  <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted">Folders</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...counts.entries()].map(([cat, n]) => {
                      const c = getCategory(cat);
                      return (
                        <span key={cat} className="inline-flex items-center gap-1 rounded-lg bg-black/4 px-2 py-1 text-[11px] font-medium dark:bg-white/6">
                          {c.emoji} {c.label} <span className="text-muted">{n}</span>
                        </span>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </Tilt3D>
  );
}
