"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ScanLine, Search, Users } from "lucide-react";
import { db, type Person, type VaultDocument } from "@/lib/db";
import { PERSON_FIELDS } from "@/lib/gather";
import { PersonForm } from "@/components/PersonForm";
import { InstallButton } from "@/components/InstallButton";
import { QuickAddCard } from "@/components/QuickAddCard";
import { PersonIdCard } from "@/components/PersonIdCard";

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
        <section className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="card-in">
            <QuickAddCard count={0} onFullForm={() => setForm({ open: true })} />
          </div>
          <div className="card-in flex flex-col justify-center gap-3 p-2 sm:col-span-1 lg:col-span-2" style={{ animationDelay: "120ms" }}>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Users size={28} /></span>
            <h2 className="text-2xl font-bold">Add your first person</h2>
            <p className="max-w-md text-muted">
              Create a card for each family member, for example “P R Perera”, with photo and details. Scanned documents are filed into their folders automatically.
            </p>
            <Link href="/scan" className="btn-ghost w-fit">
              <ScanLine size={18} /> Or just scan a document
            </Link>
          </div>
        </section>
      ) : (
        <section className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p, i) => (
            <div key={p.id} className="card-in" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
              <PersonIdCard person={p} docs={byPerson.get(p.id) ?? []} onEdit={() => setForm({ open: true, person: p })} />
            </div>
          ))}
          {!query && (
            <div className="card-in" style={{ animationDelay: `${Math.min(shown.length, 8) * 70}ms` }}>
              <QuickAddCard count={people.length} onFullForm={() => setForm({ open: true })} />
            </div>
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

