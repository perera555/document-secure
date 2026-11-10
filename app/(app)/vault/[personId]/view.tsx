"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, ChevronDown, Pencil, ScanLine, Trash2, Sparkles, Folder, Plus, FileText } from "lucide-react";
import { DocTile } from "@/components/DocTile";
import { Download } from "lucide-react";
import { downloadDocument } from "@/lib/backup";
import { db, deletePerson } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { PERSON_FIELDS, collectDetails } from "@/lib/gather";
import { Avatar, Empty, formatDate } from "@/components/ui";
import { PersonForm } from "@/components/PersonForm";

export default function PersonPage() {
  const { personId } = useParams<{ personId: string }>();
  const router = useRouter();
  const person = useLiveQuery(() => db.people.get(personId), [personId]);
  const docs = useLiveQuery(() => db.documents.where("personId").equals(personId).toArray(), [personId]);
  const [editing, setEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showCollected, setShowCollected] = useState(false);

  if (person === undefined || docs === undefined) {
    return <div className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />;
  }
  if (!person) {
    return <Empty icon={<Folder size={30} />} title="Person not found" text="This person may have been deleted." action={<Link href="/vault" className="btn-primary">Back to people</Link>} />;
  }

  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const used = CATEGORIES.filter((c) => counts.has(c.id));
  const unused = CATEGORIES.filter((c) => !counts.has(c.id));
  const folders = showAll ? [...used, ...unused] : used.length ? used : CATEGORIES.slice(0, 6);
  const details = PERSON_FIELDS.filter((f) => person[f.key]);
  const collected = collectDetails(docs);

  return (
    <div className="space-y-8">
      <Link href="/vault" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> All people
      </Link>

      {/* Person details card */}
      <section className="card overflow-hidden">
        <div className={`relative h-28 bg-linear-to-br ${person.color}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.35),transparent_50%)]" />
        </div>
        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-fit rounded-3xl ring-4 ring-card">
              <Avatar person={person} size={104} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{person.fullName}</h1>
              <p className="text-sm text-muted">
                {[person.relationship, `${docs.length} document${docs.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/scan?person=${person.id}`} className="btn-primary">
                <ScanLine size={18} /> Scan for {person.fullName.split(" ").at(-1)}
              </Link>
              <button className="btn-ghost" onClick={() => setEditing(true)}>
                <Pencil size={16} /> Edit details
              </button>
              {docs.length > 0 && (
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    for (const d of docs) await downloadDocument(d, person.fullName);
                  }}
                >
                  <Download size={16} /> Download all
                </button>
              )}
            </div>
          </div>

          {details.length > 0 || person.extraFields?.length ? (
            <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {details.map((f) => (
                <div key={f.key} className={f.key === "address" ? "sm:col-span-2 lg:col-span-3" : ""}>
                  <dt className="text-xs font-medium text-muted">{f.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{f.type === "date" ? formatDate(person[f.key]) : person[f.key]}</dd>
                </div>
              ))}
              {person.extraFields?.map((f, i) => (
                <div key={i}>
                  <dt className="text-xs font-medium text-muted">{f.label}</dt>
                  <dd className="mt-0.5 text-sm font-medium">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <button onClick={() => setEditing(true)} className="mt-6 w-full rounded-xl border border-dashed border-border p-4 text-sm text-muted hover:border-indigo-400 hover:text-indigo-500">
              + Add ID number, date of birth, mobile, email and other details
            </button>
          )}
          {person.notes && <p className="mt-4 rounded-xl bg-black/3 p-3 text-sm dark:bg-white/4">{person.notes}</p>}
        </div>
      </section>

      {/* Folders */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Folders</h2>
          <button className="text-sm font-medium text-indigo-600 dark:text-indigo-300" onClick={() => setShowAll((s) => !s)}>
            {showAll ? "Show used folders" : "Show all folders"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((c) => {
            const n = counts.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/vault/${person.id}/${c.id}`}
                className={`group relative overflow-hidden rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-xl ${
                  n ? `bg-linear-to-br ${c.gradient} text-white shadow-lg` : "card"
                }`}
              >
                {/* folder tab */}
                <div className={`absolute left-4 top-0 h-2 w-12 rounded-b-md ${n ? "bg-white/30" : "bg-black/10 dark:bg-white/10"}`} />
                <div className="text-3xl drop-shadow-sm">{c.emoji}</div>
                <p className="mt-3 font-semibold">{c.label}</p>
                <p className={`text-xs ${n ? "text-white/80" : "text-muted"}`}>{n ? `${n} document${n > 1 ? "s" : ""}` : "Empty"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* All documents, grouped by folder */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">All documents <span className="text-base font-medium text-muted">({docs.length})</span></h2>
          <Link href={`/scan?person=${person.id}`} className="btn-ghost"><Plus size={16} /> Add document</Link>
        </div>
        {docs.length === 0 ? (
          <Empty icon={<FileText size={28} />} title="No documents yet" text={`Scan or upload ${person.fullName}'s medical reports, passport, ID and certificates.`} action={<Link href={`/scan?person=${person.id}`} className="btn-primary"><ScanLine size={18} /> Scan now</Link>} />
        ) : (
          used.map((c) => {
            const list = docs.filter((d) => d.category === c.id).sort((a, b) => b.createdAt - a.createdAt);
            return (
              <div key={c.id}>
                <Link href={`/vault/${person.id}/${c.id}`} className="mb-3 inline-flex items-center gap-2 font-semibold hover:underline">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br ${c.gradient} text-base shadow`}>{c.emoji}</span>
                  {c.label} <span className="text-sm font-normal text-muted">{list.length}</span>
                </Link>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {list.map((d) => <DocTile key={d.id} doc={d} ownerName={person.fullName} />)}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* All details gathered from documents */}
      {collected.length > 0 && (
        <section className="card">
          <button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setShowCollected((s) => !s)}>
            <span className="flex items-center gap-2 font-semibold">
              <Sparkles size={18} className="text-indigo-500" /> All collected details
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-600 dark:text-indigo-300">{collected.length}</span>
            </span>
            <ChevronDown size={18} className={`transition ${showCollected ? "rotate-180" : ""}`} />
          </button>
          {showCollected && (
            <div className="divide-y divide-border border-t border-border">
              {collected.map((f, i) => (
                <Link key={i} href={`/doc/${f.docId}`} className="grid grid-cols-[1fr_1.4fr] gap-3 px-5 py-2.5 text-sm hover:bg-black/3 dark:hover:bg-white/3">
                  <span className="text-muted">{f.label}</span>
                  <span className="font-medium">
                    {f.value} <span className="block text-xs font-normal text-muted">from {f.docTitle}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex justify-center">
        <button
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-rose-600"
          onClick={async () => {
            if (confirm(`Delete ${person.fullName} and all ${docs.length} of their documents? This cannot be undone.`)) {
              await deletePerson(person.id);
              router.push("/vault");
            }
          }}
        >
          <Trash2 size={14} /> Delete person
        </button>
      </div>

      <PersonForm open={editing} onClose={() => setEditing(false)} person={person} />
    </div>
  );
}
