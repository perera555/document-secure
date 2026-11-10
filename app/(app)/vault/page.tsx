"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, ChevronRight, FileText, Pencil, Plus, ScanLine, Search, Trash2, Users } from "lucide-react";
import { db, deletePerson, type Person, type VaultDocument } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { PERSON_FIELDS } from "@/lib/gather";
import { Avatar, Empty, expiryStatus, formatDate } from "@/components/ui";
import { PersonForm } from "@/components/PersonForm";
import { InstallButton } from "@/components/InstallButton";

export default function VaultPage() {
  const people = useLiveQuery(() => db.people.orderBy("createdAt").toArray(), []);
  const docs = useLiveQuery(() => db.documents.toArray(), []);
  const [form, setForm] = useState<{ open: boolean; person?: Person }>({ open: false });
  const [q, setQ] = useState("");

  const byPerson = useMemo(() => {
    const m = new Map<string, VaultDocument[]>();
    for (const d of docs ?? []) m.set(d.personId, [...(m.get(d.personId) ?? []), d]);
    return m;
  }, [docs]);

  const query = q.trim().toLowerCase();
  const shown = (people ?? []).filter(
    (p) =>
      !query ||
      [p.fullName, p.relationship, ...PERSON_FIELDS.map((f) => p[f.key]), ...(p.extraFields ?? []).map((f) => f.value)]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );

  if (!people || !docs) return <div className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-sky-500 p-6 text-white shadow-xl shadow-indigo-500/20 sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">Family document vault</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">My People</h1>
            <p className="mt-2 text-sm text-white/80">
              {people.length} {people.length === 1 ? "person" : "people"} · {docs.length} document{docs.length === 1 ? "" : "s"} · stored privately on this device
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn bg-white text-indigo-700 shadow-lg hover:bg-indigo-50" onClick={() => setForm({ open: true })}>
              <Plus size={18} /> Add person
            </button>
            <Link href="/scan" className="btn bg-white/15 text-white ring-1 ring-white/30 backdrop-blur hover:bg-white/25">
              <ScanLine size={18} /> Scan document
            </Link>
          </div>
        </div>
      </section>

      {people.length > 0 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input className="input h-12 pl-11 text-base" placeholder="Search by name, ID number, mobile…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {people.length === 0 ? (
        <Empty
          icon={<Users size={30} />}
          title="Add your first person"
          text="Create a card for each family member, for example “P R Perera”, with photo and details. Scanned documents are filed into their folders automatically."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setForm({ open: true })}>
                <Plus size={18} /> Add person
              </button>
              <Link href="/scan" className="btn-ghost">
                <ScanLine size={18} /> Or just scan a document
              </Link>
            </div>
          }
        />
      ) : (
        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <PersonCard key={p.id} person={p} docs={byPerson.get(p.id) ?? []} onEdit={() => setForm({ open: true, person: p })} />
          ))}
          {!query && (
            <button
              onClick={() => setForm({ open: true })}
              className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border text-muted transition hover:border-indigo-400 hover:bg-indigo-500/5 hover:text-indigo-500"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10"><Plus size={28} /></span>
              <span className="text-sm font-semibold">Add person</span>
            </button>
          )}
          {query && shown.length === 0 && <p className="text-sm text-muted">No one matches “{q}”.</p>}
        </section>
      )}

      <div className="flex justify-center pt-2">
        <InstallButton size="sm" />
      </div>

      <PersonForm open={form.open} person={form.person} onClose={() => setForm({ open: false })} />
    </div>
  );
}

function PersonCard({ person, docs, onEdit }: { person: Person; docs: VaultDocument[]; onEdit: () => void }) {
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const alerts = docs.filter((d) => ["expired", "soon"].includes(expiryStatus(d.expiryDate) ?? "")).length;
  const details = [
    ...PERSON_FIELDS.filter((f) => person[f.key]).map((f) => ({ label: f.label, value: f.type === "date" ? formatDate(person[f.key]) : person[f.key]! })),
    ...(person.extraFields ?? []).filter((f) => f.value),
  ];

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Link href={`/vault/${person.id}`} className="group card relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/15">
      <div className={`relative h-28 bg-linear-to-br ${person.color}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.4),transparent_55%)]" />
        <div className="absolute right-3 top-3 flex gap-1.5">
          <button onClick={act(onEdit)} aria-label="Edit person" title="Edit details" className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35">
            <Pencil size={15} />
          </button>
          <button
            onClick={act(async () => {
              if (confirm(`Delete ${person.fullName} and all ${docs.length} of their documents? This cannot be undone.`)) await deletePerson(person.id);
            })}
            aria-label="Delete person"
            title="Delete"
            className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-rose-500"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-12 flex items-end gap-4">
          <div className="rounded-3xl shadow-xl ring-4 ring-card">
            <Avatar person={person} size={96} />
          </div>
          <div className="min-w-0 pb-1">
            <h3 className="truncate text-lg font-bold leading-tight">{person.fullName}</h3>
            <p className="truncate text-xs font-medium text-muted">{person.relationship || "Family member"}</p>
          </div>
        </div>

        {details.length > 0 ? (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {details.map((d, i) => (
              <div key={i} className={`min-w-0 ${d.label === "Address" ? "col-span-2" : ""}`}>
                <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">{d.label}</dt>
                <dd className="truncate text-sm font-medium" title={d.value}>{d.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <button onClick={act(onEdit)} className="mt-4 rounded-xl border border-dashed border-border p-3 text-xs text-muted hover:border-indigo-400 hover:text-indigo-500">
            + Add ID, date of birth, mobile, email…
          </button>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 border-t border-border pt-3 text-sm">
            <FileText size={16} className="text-indigo-500" />
            <span className="font-semibold">{docs.length}</span>
            <span className="text-muted">document{docs.length === 1 ? "" : "s"}</span>
            {alerts > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle size={12} /> {alerts} expiring
              </span>
            )}
            <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-indigo-600 transition group-hover:gap-1.5 dark:text-indigo-300">
              Open <ChevronRight size={14} />
            </span>
          </div>
          {counts.size > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[...counts.entries()].map(([cat, n]) => {
                const c = getCategory(cat);
                return (
                  <span key={cat} className="inline-flex items-center gap-1 rounded-lg bg-black/4 px-2 py-1 text-[11px] font-medium dark:bg-white/6">
                    {c.emoji} {c.label} <span className="text-muted">{n}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
