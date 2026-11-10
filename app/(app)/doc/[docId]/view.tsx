"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Download, Pencil, Printer, Trash2, Check, X, Plus, Sparkles, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { db, type DocField, type VaultDocument } from "@/lib/db";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/categories";
import { isImage } from "@/lib/image";
import { downloadDocument } from "@/lib/backup";
import { BlobImage, Empty, expiryStatus, formatDate, useObjectUrl } from "@/components/ui";

export default function DocPage() {
  const { docId } = useParams<{ docId: string }>();
  const router = useRouter();
  const doc = useLiveQuery(() => db.documents.get(docId), [docId]);
  const person = useLiveQuery(() => (doc ? db.people.get(doc.personId) : undefined), [doc?.personId]);
  const people = useLiveQuery(() => db.people.toArray(), []);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("edit")) setEditing(true);
  }, []);

  if (doc === undefined) return <div className="h-64 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />;
  if (!doc) return <Empty icon={<X size={28} />} title="Document not found" text="It may have been deleted." action={<Link href="/vault" className="btn-primary">Back</Link>} />;

  const c = getCategory(doc.category);
  const pg = doc.pages[Math.min(page, doc.pages.length - 1)];
  const st = expiryStatus(doc.expiryDate);

  return (
    <div className="space-y-6">
      <Link href={`/vault/${doc.personId}/${doc.category}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={16} /> {person?.fullName} › {c.emoji} {c.label}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card overflow-hidden">
          <div className="relative grid min-h-96 place-items-center bg-neutral-100 p-3 dark:bg-neutral-900">
            {pg ? <PageView blob={pg.blob} type={pg.type} onFull={() => setFull(true)} /> : <p className="text-muted">No scan attached</p>}
            {doc.pages.length > 1 && (
              <>
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="absolute left-3 top-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30" aria-label="Previous page"><ChevronLeft /></button>
                <button disabled={page >= doc.pages.length - 1} onClick={() => setPage(page + 1)} className="absolute right-3 top-1/2 rounded-full bg-black/50 p-2 text-white disabled:opacity-30" aria-label="Next page"><ChevronRight /></button>
                <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">Page {page + 1} / {doc.pages.length}</span>
              </>
            )}
          </div>
          {doc.pages.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-border p-3">
              <button className="btn-ghost" onClick={() => downloadDocument(doc, person?.fullName)}><Download size={16} /> Download</button>
              <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
              <button className="btn-ghost" onClick={() => printPages(doc)}><Printer size={16} /> Print</button>
              {pg && isImage(pg.type) && <button className="btn-ghost" onClick={() => setFull(true)}><Maximize2 size={16} /> Full screen</button>}
            </div>
          )}
        </section>

        <section className="space-y-4">
          {editing ? (
            <EditDoc doc={doc} people={people ?? []} onDone={() => setEditing(false)} />
          ) : (
            <div className="card p-5">
              <div className="flex items-start gap-3">
                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${c.gradient} text-2xl shadow`}>{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold">{doc.title}</h1>
                  <p className="text-sm text-muted">{person?.fullName} · {c.label}</p>
                </div>
                <button className="btn-ghost px-3" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
              </div>
              {doc.summary && <p className="mt-4 rounded-xl bg-indigo-500/5 p-3 text-sm">{doc.summary}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-4">
                {doc.documentNumber && <Info label="Number" value={doc.documentNumber} />}
                {doc.issuer && <Info label="Issued by" value={doc.issuer} />}
                {doc.issueDate && <Info label="Issue date" value={formatDate(doc.issueDate)} />}
                {doc.expiryDate && (
                  <Info label="Expiry date" value={<span className={st === "expired" ? "text-rose-600" : st === "soon" ? "text-amber-600" : ""}>{formatDate(doc.expiryDate)}{st === "expired" ? " (expired)" : st === "soon" ? " (soon)" : ""}</span>} />
                )}
              </dl>
              {doc.fields.length > 0 && (
                <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {doc.fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1.4fr] gap-3 px-3 py-2 text-sm">
                      <span className="text-muted">{f.label}</span>
                      <span className="font-medium break-words">{f.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {doc.notes && <p className="mt-4 text-sm"><b>Notes:</b> {doc.notes}</p>}
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                {doc.extractedBy === "ai" && <Sparkles size={12} />}Added {formatDate(new Date(doc.createdAt).toISOString())}
                {doc.extractedBy === "ai" ? " · read by AI" : doc.extractedBy === "ocr" ? " · read with text recognition" : ""}
              </p>
            </div>
          )}

          {doc.text && (
            <details className="card p-5">
              <summary className="cursor-pointer text-sm font-semibold">Full text from document</summary>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-xs text-muted">{doc.text}</pre>
            </details>
          )}

          <button
            className="btn-ghost text-rose-600"
            onClick={async () => {
              if (confirm("Delete this document permanently?")) {
                await db.documents.delete(doc.id);
                router.push(`/vault/${doc.personId}/${doc.category}`);
              }
            }}
          >
            <Trash2 size={14} /> Delete document
          </button>
        </section>
      </div>

      {full && pg && isImage(pg.type) && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/95 p-2" onClick={() => setFull(false)}>
          <BlobImage blob={pg.blob} alt={doc.title} className="max-h-full max-w-full object-contain" />
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close"><X /></button>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold break-words">{value}</dd>
    </div>
  );
}

function PageView({ blob, type, onFull }: { blob: Blob; type: string; onFull: () => void }) {
  const url = useObjectUrl(blob);
  if (!url) return null;
  if (type === "application/pdf") return <iframe src={url} title="PDF" className="h-[70vh] w-full rounded-lg bg-white" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Document page" onClick={onFull} className="max-h-[70vh] cursor-zoom-in rounded-lg object-contain shadow-xl" />;
}

function printPages(doc: VaultDocument) {
  const urls = doc.pages.filter((p) => isImage(p.type)).map((p) => URL.createObjectURL(p.blob));
  if (!urls.length) {
    const u = URL.createObjectURL(doc.pages[0].blob);
    window.open(u, "_blank");
    return;
  }
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(
    `<title>${doc.title.replace(/</g, "")}</title><style>@page{margin:0}body{margin:0}img{width:100%;page-break-after:always;display:block}</style>` +
      urls.map((u) => `<img src="${u}">`).join(""),
  );
  w.document.close();
  w.onload = () => w.print();
  setTimeout(() => w.print(), 800);
}

function EditDoc({ doc, people, onDone }: { doc: VaultDocument; people: { id: string; fullName: string }[]; onDone: () => void }) {
  const [d, setD] = useState(doc);
  const set = <K extends keyof VaultDocument>(k: K, v: VaultDocument[K]) => setD((x) => ({ ...x, [k]: v }));
  const setFields = (f: DocField[]) => set("fields", f);

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Edit document</h2>
        <div className="flex gap-2">
          <button className="btn-ghost px-3" onClick={onDone}><X size={16} /></button>
          <button className="btn-primary px-3" onClick={async () => { await db.documents.put({ ...d, updatedAt: Date.now() }); onDone(); }}><Check size={16} /> Save</button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Belongs to</label>
          <select className="input" value={d.personId} onChange={(e) => set("personId", e.target.value)}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
          </select>
        </div>
        <div><label className="label">Folder</label>
          <select className="input" value={d.category} onChange={(e) => set("category", e.target.value as CategoryId)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
        </div>
      </div>
      <div><label className="label">Title</label><input className="input" value={d.title} onChange={(e) => set("title", e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label">Number</label><input className="input" value={d.documentNumber ?? ""} onChange={(e) => set("documentNumber", e.target.value)} /></div>
        <div><label className="label">Issued by</label><input className="input" value={d.issuer ?? ""} onChange={(e) => set("issuer", e.target.value)} /></div>
        <div><label className="label">Issue date</label><input className="input" type="date" value={d.issueDate ?? ""} onChange={(e) => set("issueDate", e.target.value)} /></div>
        <div><label className="label">Expiry date</label><input className="input" type="date" value={d.expiryDate ?? ""} onChange={(e) => set("expiryDate", e.target.value)} /></div>
      </div>
      <div><label className="label">Summary</label><textarea className="input" value={d.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></div>
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="label mb-0">Details</span>
          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setFields([...d.fields, { label: "", value: "" }])}><Plus size={14} /> Add</button>
        </div>
        <div className="space-y-2">
          {d.fields.map((f, i) => (
            <div key={i} className="flex gap-2">
              <input className="input w-2/5" value={f.label} onChange={(e) => setFields(d.fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="input flex-1" value={f.value} onChange={(e) => setFields(d.fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <button className="px-2 text-muted hover:text-rose-600" aria-label="Remove" onClick={() => setFields(d.fields.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </div>
      <div><label className="label">Notes</label><textarea className="input" value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} /></div>
    </div>
  );
}
