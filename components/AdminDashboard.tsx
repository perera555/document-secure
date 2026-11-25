"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AlertTriangle, KeyRound, LayoutGrid, List, Download, ExternalLink, FileText, FolderDown, HardDrive, Loader2, Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { downloadAllZip, downloadPersonZip } from "@/lib/export";
import { db, deleteDocument, deletePerson, type Person } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { downloadDocument } from "@/lib/backup";
import { Avatar, expiryStatus, formatDate } from "./ui";
import { PersonForm } from "./PersonForm";
import { toast } from "./Toast";
import { PersonPinDialog } from "./PersonPinDialog";
import { PersonIdCard } from "./PersonIdCard";
import { useAdmin } from "./AdminLock";
import { getMemberPins } from "@/lib/lock";

/** Admin dashboard: totals, every person and every document with update / delete. */
export function AdminDashboard() {
  const { refresh } = useAdmin();
  const people = useLiveQuery(() => db.people.orderBy("createdAt").toArray(), [], [] as Person[]);
  const docs = useLiveQuery(() => db.documents.orderBy("createdAt").reverse().toArray(), [], []);
  const [form, setForm] = useState<{ open: boolean; person?: Person }>({ open: false });
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"people" | "documents">("people");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [usedMb, setUsedMb] = useState<number>();
  const [zipping, setZipping] = useState(""); // person id, or "all"
  const [pinFor, setPinFor] = useState<Person | null>(null);
  const [withPin, setWithPin] = useState<Set<string>>(new Set());
  const loadPins = () => getMemberPins().then((list) => setWithPin(new Set(list.map((m) => m.personId))));
  useEffect(() => {
    loadPins();
  }, []);

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsedMb((e.usage ?? 0) / 1024 / 1024));
  }, [docs.length]);

  const nameOf = useMemo(() => new Map(people.map((p) => [p.id, p.fullName])), [people]);
  const docsOf = useMemo(() => {
    const m = new Map<string, typeof docs>();
    for (const d of docs) m.set(d.personId, [...(m.get(d.personId) ?? []), d]);
    return m;
  }, [docs]);
  const countOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of docs) m.set(d.personId, (m.get(d.personId) ?? 0) + 1);
    return m;
  }, [docs]);
  const expiring = docs.filter((d) => ["expired", "soon"].includes(expiryStatus(d.expiryDate) ?? "")).length;

  const query = q.trim().toLowerCase();
  const shownPeople = people.filter((p) => !query || [p.fullName, p.relationship, p.nicNumber, p.mobile].join(" ").toLowerCase().includes(query));
  const shownDocs = docs.filter(
    (d) => !query || [d.title, d.documentNumber, nameOf.get(d.personId), getCategory(d.category).label].join(" ").toLowerCase().includes(query),
  );

  const tiles = [
    { icon: Users, label: "People", value: people.length, color: "from-indigo-500 to-violet-600" },
    { icon: FileText, label: "Documents", value: docs.length, color: "from-sky-500 to-cyan-600" },
    { icon: AlertTriangle, label: "Expiring / expired", value: expiring, color: "from-amber-500 to-orange-600" },
    { icon: HardDrive, label: "Storage used", value: usedMb === undefined ? "…" : `${usedMb.toFixed(1)} MB`, color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card relative overflow-hidden p-4">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br ${t.color} text-white shadow`}><t.icon size={18} /></span>
            <p className="mt-3 text-2xl font-extrabold">{t.value}</p>
            <p className="text-xs font-medium text-muted">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
          {(["people", "documents"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition ${tab === t ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" : "text-muted hover:text-foreground"}`}
            >
              {t} <span className="text-xs opacity-70">{t === "people" ? people.length : docs.length}</span>
            </button>
          ))}
          <div className="relative ml-auto min-w-48 flex-1 sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input py-2 pl-9" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {docs.length > 0 && (
            <button
              className="btn-ghost py-2"
              disabled={zipping === "all"}
              onClick={async () => {
                setZipping("all");
                try {
                  await downloadAllZip();
                } finally {
                  setZipping("");
                }
              }}
            >
              {zipping === "all" ? <Loader2 size={16} className="animate-spin" /> : <FolderDown size={16} />} Download all documents
            </button>
          )}
          {tab === "people" && (
            <div className="flex rounded-xl border border-border p-0.5" role="group" aria-label="View">
              {(["cards", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${view === v ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300" : "text-muted"}`}
                >
                  {v === "cards" ? <LayoutGrid size={14} /> : <List size={14} />} {v}
                </button>
              ))}
            </div>
          )}
          {tab === "people" ? (
            <button className="btn-primary py-2" onClick={() => setForm({ open: true })}><UserPlus size={16} /> Add person</button>
          ) : (
            <Link href="/scan" className="btn-primary py-2"><FileText size={16} /> Add document</Link>
          )}
        </div>

        {tab === "people" && view === "cards" ? (
          <div className="grid items-start gap-6 p-5 md:grid-cols-2 xl:grid-cols-3">
            {shownPeople.map((p) => (
              <div key={p.id} className="space-y-2">
                <PersonIdCard person={p} docs={docsOf.get(p.id) ?? []} onEdit={() => setForm({ open: true, person: p })} />
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className={`text-xs font-semibold ${withPin.has(p.id) ? "text-emerald-600" : "text-muted"}`}>{withPin.has(p.id) ? "🔑 Has own PIN" : "No PIN (open to everyone)"}</span>
                  <button
                    onClick={() => setPinFor(p)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${withPin.has(p.id) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"}`}
                  >
                    <KeyRound size={14} /> {withPin.has(p.id) ? "Reset PIN" : "Set PIN"}
                  </button>
                </div>
              </div>
            ))}
            {shownPeople.length === 0 && <p className="text-sm text-muted">No people{query ? ` match “${q}”` : " yet"}.</p>}
          </div>
        ) : tab === "people" ? (
          <ul className="divide-y divide-border">
            {shownPeople.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Avatar person={p} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.fullName}</p>
                  <p className="truncate text-xs text-muted">
                    {[p.relationship, p.nicNumber && `ID ${p.nicNumber}`, `${countOf.get(p.id) ?? 0} documents`].filter(Boolean).join(" · ")}
                  </p>
                  <p className={`mt-0.5 text-[11px] font-semibold ${withPin.has(p.id) ? "text-emerald-600" : "text-muted"}`}>{withPin.has(p.id) ? "🔑 Has own PIN" : "No PIN — only the admin can see their documents"}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPinFor(p)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold ${withPin.has(p.id) ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"}`}
                    title="Personal PIN"
                    aria-label={`PIN for ${p.fullName}`}
                  >
                    <KeyRound size={14} /> {withPin.has(p.id) ? "Reset PIN" : "Set PIN"}
                  </button>
                  {(countOf.get(p.id) ?? 0) > 0 && (
                    <button
                      onClick={async () => {
                        setZipping(p.id);
                        try {
                          await downloadPersonZip(p.id);
                        } finally {
                          setZipping("");
                        }
                      }}
                      className="rounded-lg p-2 text-muted hover:bg-emerald-500/10 hover:text-emerald-600"
                      title={`Download all ${countOf.get(p.id)} documents (ZIP)`}
                      aria-label={`Download all of ${p.fullName}'s documents`}
                    >
                      {zipping === p.id ? <Loader2 size={16} className="animate-spin" /> : <FolderDown size={16} />}
                    </button>
                  )}
                  <Link href={`/vault/${p.id}`} className="rounded-lg p-2 text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10" title="Open" aria-label={`Open ${p.fullName}`}><ExternalLink size={16} /></Link>
                  <button onClick={() => setForm({ open: true, person: p })} className="rounded-lg p-2 text-muted hover:bg-indigo-500/10 hover:text-indigo-600" title="Edit / update" aria-label={`Edit ${p.fullName}`}><Pencil size={16} /></button>
                  <button
                    onClick={async () => {
                      const n = countOf.get(p.id) ?? 0;
                      if (!confirm(`Delete ${p.fullName}${n ? ` and their ${n} document${n > 1 ? "s" : ""}` : ""}? This cannot be undone.`)) return;
                      await deletePerson(p.id);
                      toast(`${p.fullName} deleted`);
                    }}
                    className="rounded-lg p-2 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                    title="Delete"
                    aria-label={`Delete ${p.fullName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
            {shownPeople.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No people{query ? ` match “${q}”` : " yet"}.</li>}
          </ul>
        ) : (
          <ul className="divide-y divide-border">
            {shownDocs.map((d) => {
              const c = getCategory(d.category);
              const st = expiryStatus(d.expiryDate);
              return (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br ${c.gradient} text-xl shadow`}>{c.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{d.title}</p>
                    <p className="truncate text-xs text-muted">
                      {nameOf.get(d.personId) ?? "Unknown"} › {c.label} · {formatDate(new Date(d.createdAt).toISOString())}
                      {st === "expired" && <span className="ml-1 font-semibold text-rose-600">· expired</span>}
                      {st === "soon" && <span className="ml-1 font-semibold text-amber-600">· expires soon</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {d.pages.length > 0 && (
                      <button onClick={() => downloadDocument(d, nameOf.get(d.personId))} className="rounded-lg p-2 text-muted hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10" title="Download" aria-label={`Download ${d.title}`}><Download size={16} /></button>
                    )}
                    <Link href={`/doc/${d.id}?edit=1`} className="rounded-lg p-2 text-muted hover:bg-indigo-500/10 hover:text-indigo-600" title="Edit / update" aria-label={`Edit ${d.title}`}><Pencil size={16} /></Link>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete “${d.title}”? This cannot be undone.`)) return;
                        await deleteDocument(d.id);
                        toast("Document deleted");
                      }}
                      className="rounded-lg p-2 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                      title="Delete"
                      aria-label={`Delete ${d.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
            {shownDocs.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">No documents{query ? ` match “${q}”` : " yet"}.</li>}
          </ul>
        )}
      </div>

      <PersonForm open={form.open} person={form.person} onClose={() => setForm({ open: false })} />
      <PersonPinDialog person={pinFor} hasPin={!!pinFor && withPin.has(pinFor.id)} onClose={() => setPinFor(null)} onChanged={() => { loadPins(); void refresh(); }} />
    </section>
  );
}
