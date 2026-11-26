"use client";


import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Camera, FileUp, Printer, RotateCw, Trash2, Sparkles, Loader2, Plus, Check, UserPlus, FolderSync,
  Inbox, PencilLine, ArrowLeft, AlertCircle, Wand2, Download,
} from "lucide-react";
import { createPerson, db, hashBlob, uid, type DocField, type Person } from "@/lib/db";
import { CATEGORIES, getCategory, type CategoryId } from "@/lib/categories";
import { FILTERS, isImage, makeThumbnail, processImage, type Filter } from "@/lib/image";
import { extractDocument, type ExtractSource } from "@/lib/extract";
import { emptyExtraction, type Extraction } from "@/lib/extract-types";
import { findOwner } from "@/lib/match";
import { detailsFromExtraction, detailsToFill, PERSON_FIELDS } from "@/lib/gather";
import {
  folderPermission, folderWatchSupported, getScannerFolder, pickScannerFolder, pollScannerFolder, forgetScannerFolder,
} from "@/lib/scanner-folder";
import { CameraCapture } from "@/components/CameraCapture";
import { Avatar, BlobImage } from "@/components/ui";
import { Tilt3D } from "@/components/Tilt3D";
import { toast } from "@/components/Toast";
import { ScannerConnect } from "@/components/ScannerConnect";
import { RequireLogin, useAdmin } from "@/components/AdminLock";
import { BulkImport } from "@/components/BulkImport";
import { DateSelect } from "@/components/DateSelect";
import {
  autoSaveToComputer, computerFolderPermission, computerFolderStatus, computerFolderSupported, getComputerFolder, pickComputerFolder, previewDocPath, saveAllToComputer,
} from "@/lib/export";
import { CheckCircle2, ChevronRight, FileText, FolderOpen } from "lucide-react";
import { categoryFromFileName, fileStem, smartTitle } from "@/lib/naming";
import { getSetting, setSetting } from "@/lib/db";

interface Page {
  id: string;
  original: Blob;
  type: string;
  processed?: Blob;
  rotate: number;
  filter: Filter;
  busy?: boolean;
  inboxId?: string;
  /** Original file name, used to recognise owner and folder, e.g. "P R Perera passport.jpg". */
  name?: string;
}

type Step = "collect" | "reading" | "review";

export default function ScanPage() {
  return (
    <RequireLogin>
      <ScanPageInner />
    </RequireLogin>
  );
}

function ScanPageInner() {
  const router = useRouter();
  const allPeople = useLiveQuery(() => db.people.toArray(), [], [] as Person[]);
  const { isAdmin: adminUser, memberId, status: lockStatus, canSee } = useAdmin();
  const people = allPeople.filter((p) => canSee(p.id));
  const inbox = useLiveQuery(() => db.inbox.orderBy("createdAt").toArray(), []);
  const [pages, setPages] = useState<Page[]>([]);
  const [selected, setSelected] = useState<string>();
  const [camera, setCamera] = useState(false);
  const [step, setStep] = useState<Step>("collect");
  const [status, setStatus] = useState("");
  const [preset, setPreset] = useState<{ person?: string; category?: CategoryId }>({});
  const [result, setResult] = useState<{ extraction: Extraction; source: ExtractSource | "manual"; warning?: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const phoneCamRef = useRef<HTMLInputElement>(null);

  const [autoFile, setAutoFile] = useState(true);
  useEffect(() => {
    getSetting("autoFile", true).then(setAutoFile);
  }, []);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setPreset({ person: sp.get("person") ?? undefined, category: (sp.get("category") as CategoryId) ?? undefined });
  }, []);

  async function addBlobs(items: { blob: Blob; type?: string; inboxId?: string }[]) {
    const added: Page[] = items.map((it) => ({
      id: uid(),
      original: it.blob,
      type: it.type || it.blob.type || "image/jpeg",
      rotate: 0,
      // Scans from the printer-scanner keep original colours; camera photos get auto-enhance.
      filter: it.inboxId ? "original" : "auto",
      busy: isImage(it.type || it.blob.type || "image/jpeg"),
      inboxId: it.inboxId,
      name: it.blob instanceof File ? it.blob.name : undefined,
    }));
    setPages((p) => [...p, ...added]);
    setSelected((s) => s ?? added[0]?.id);
    for (const pg of added) if (pg.busy) await reprocess(pg);
  }

  async function reprocess(pg: Page, patch: Partial<Page> = {}) {
    const next = { ...pg, ...patch };
    setPages((ps) => ps.map((p) => (p.id === pg.id ? { ...next, busy: true } : p)));
    try {
      const { blob } = await processImage(next.original, { rotate: next.rotate, filter: next.filter });
      setPages((ps) => ps.map((p) => (p.id === pg.id ? { ...p, ...patch, processed: blob, busy: false } : p)));
    } catch {
      setPages((ps) => ps.map((p) => (p.id === pg.id ? { ...p, busy: false } : p)));
    }
  }

  const finalBlob = (p: Page) => p.processed ?? p.original;
  const sel = pages.find((p) => p.id === selected);

  async function read(list: Page[] = pages) {
    setStep("reading");
    const res = await extractDocument(list.map((p) => ({ blob: finalBlob(p), type: isImage(p.type) ? "image/jpeg" : p.type })), setStatus);
    // Use the file name too: "Shanthi Mallika NIC.jpg" → owner Shanthi Mallika, folder National ID.
    const stem = list.map((p) => fileStem(p.name?.split("/").join(" "))).filter(Boolean).join(" ");
    const fileTitle = list.map((p) => fileStem(p.name?.split("/").pop())).filter(Boolean).join(" ");
    if (stem) {
      const ex = res.extraction;
      ex.ownerNameVariants = [...(ex.ownerNameVariants ?? []), stem];
      if (ex.category === "other") ex.category = categoryFromFileName(stem);
      // Prefer the file's own name over a generic or OCR-guessed title ("Scanned document").
      if (fileTitle && (!ex.title || res.source === "ocr" || /^scanned document$/i.test(ex.title))) ex.title = fileTitle;
      else if (!ex.title) ex.title = stem;
    }
    setResult(res);
    setStep("review");
  }

  function manual() {
    setResult({ extraction: emptyExtraction(), source: "manual" });
    setStep("review");
  }

  /*
   * Hands-free scanner: while this page is open with "File automatically" on, every new scan
   * that arrives from the scanner folder is read and filed by itself, one after another.
   * Scans that aren't clear stop at the review screen for a person to choose.
   */
  const fromScanner = useRef(false);
  const tried = useRef(new Set<string>());
  useEffect(() => {
    if (lockStatus === "loading") return;
    if (!autoFile || step !== "collect" || pages.length > 0 || !inbox?.length) return;
    const item = inbox.find((i) => !tried.current.has(i.id));
    if (!item) return;
    tried.current.add(item.id);
    fromScanner.current = true;
    (async () => {
      const image = isImage(item.type || item.blob.type);
      // Scanner pages keep their original colours (no enhancement filter).
      const processed = image ? (await processImage(item.blob, { filter: "original" })).blob : undefined;
      const page: Page = { id: uid(), original: item.blob, type: item.type || item.blob.type, processed, rotate: 0, filter: "original", inboxId: item.id, name: item.name };
      setPages([page]);
      setSelected(page.id);
      await read([page]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFile, step, pages.length, inbox, lockStatus]);

  async function afterSave(pid: string, cat: CategoryId, docId: string, auto: boolean) {
    if (!fromScanner.current) {
      router.push(`/vault/${pid}/${cat}?saved=${docId}${auto ? "&auto=1" : ""}`);
      return;
    }
    // Scanner batch: stay here, report, and move on to the next scan.
    fromScanner.current = false;
    const [p, d] = await Promise.all([db.people.get(pid), db.documents.get(docId)]);
    toast(`Filed: ${d?.title ?? "scan"} → ${p?.fullName ?? ""} › ${getCategory(cat).label}`);
    setPages([]);
    setSelected(undefined);
    setResult(undefined);
    setStep("collect");
  }

  if (step === "reading") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-ping rounded-3xl bg-indigo-500/30" />
          <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-linear-to-br from-indigo-600 to-sky-500 text-white shadow-xl">
            <Sparkles size={40} />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Reading your document</h1>
        <p className="mt-2 text-muted">{status || "Starting…"}</p>
        <p className="mt-6 text-xs text-muted">Finding the owner, document type, numbers, dates and all other details.</p>
      </div>
    );
  }

  if (step === "review" && result) {
    return (
      <Review
        pages={pages}
        finalBlob={finalBlob}
        people={people}
        result={result}
        preset={lockStatus === "member" && !preset.person ? { ...preset, person: memberId } : preset}
        autoFile={autoFile}
        askFolder={pages.some((p) => !p.inboxId)}
        onBack={() => {
          fromScanner.current = false;
          setStep("collect");
        }}
        onSaved={afterSave}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Scan a document</h1>
        <p className="mt-1 text-muted">Take a photo, upload a scan, or let your scanner send pages here automatically. Add several pages for one document.</p>
        <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-sm">
          <input
            type="checkbox"
            className="h-5 w-5 accent-emerald-600"
            checked={autoFile}
            onChange={async (e) => {
              setAutoFile(e.target.checked);
              await setSetting("autoFile", e.target.checked);
            }}
          />
          <span>
            <b>File automatically</b>
            <span className="block text-xs text-muted">When it&apos;s clear whose document it is and what type, save it straight into their folder (you can still edit it).</span>
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SourceButton
          icon={<Camera size={26} />}
          title="Camera"
          text="Phone or webcam, full resolution"
          gradient="from-indigo-600 to-violet-600"
          onClick={() => {
            // On phones the native camera app gives the best quality & auto-focus.
            const mobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
            if (mobile) phoneCamRef.current?.click();
            else setCamera(true);
          }}
        />
        <SourceButton
          icon={<FileUp size={26} />}
          title="Upload files"
          text="Images or PDF from printer-scanner"
          gradient="from-sky-500 to-cyan-600"
          onClick={() => fileRef.current?.click()}
        />
        <SourceButton icon={<PencilLine size={26} />} title="Add manually" text="Type the details yourself" gradient="from-emerald-500 to-teal-600" onClick={manual} />
      </div>
      <input ref={fileRef} hidden multiple type="file" accept="image/*,application/pdf" onChange={(e) => { addBlobs([...(e.target.files ?? [])].map((f) => ({ blob: f, type: f.type }))); e.target.value = ""; }} />
      <input ref={phoneCamRef} hidden type="file" accept="image/*" capture="environment" onChange={(e) => { addBlobs([...(e.target.files ?? [])].map((f) => ({ blob: f, type: f.type }))); e.target.value = ""; }} />

      <BulkImport queued={inbox?.length ?? 0} ownerName={lockStatus === "member" ? allPeople.find((p) => p.id === memberId)?.fullName : undefined} />

      <ScannerConnect people={people} />

      <ScannerPanel inboxCount={inbox?.length ?? 0} />

      {inbox && inbox.length > 0 && (
        <section className="card border-amber-500/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Inbox size={18} className="text-amber-500" /> New from scanner ({inbox.length})</h2>
            <div className="flex gap-2">
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => addBlobs(inbox.map((i) => ({ blob: i.blob, type: i.type, inboxId: i.id })))}>Use all</button>
              <button className="btn-ghost px-3 py-1.5 text-xs text-rose-600" onClick={() => db.inbox.clear()}>Discard all</button>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {inbox.filter((i) => !pages.some((p) => p.inboxId === i.id)).map((i) => (
              <button key={i.id} className="group relative w-24 shrink-0" onClick={() => addBlobs([{ blob: i.blob, type: i.type, inboxId: i.id }])}>
                {isImage(i.type) ? (
                  <BlobImage blob={i.blob} alt={i.name} className="aspect-[3/4] w-24 rounded-xl object-cover ring-1 ring-border" />
                ) : (
                  <div className="grid aspect-[3/4] w-24 place-items-center rounded-xl bg-black/5 text-3xl dark:bg-white/5">📄</div>
                )}
                <span className="absolute inset-0 grid place-items-center rounded-xl bg-indigo-600/70 text-white opacity-0 transition group-hover:opacity-100"><Plus /></span>
                <p className="mt-1 truncate text-[11px] text-muted">{i.name}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {pages.length > 0 && (
        <section className="card overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_320px]">
            <div className="relative grid min-h-80 place-items-center bg-[repeating-conic-gradient(rgb(0_0_0/0.03)_0_25%,transparent_0_50%)] bg-size-[24px_24px] p-4">
              {sel && (isImage(sel.type) ? (
                <BlobImage blob={finalBlob(sel)} alt="Selected page" className="max-h-[60vh] rounded-lg object-contain shadow-2xl" />
              ) : (
                <div className="text-center"><div className="text-7xl">📄</div><p className="mt-2 text-sm text-muted">PDF document</p></div>
              ))}
              {sel?.busy && <div className="absolute inset-0 grid place-items-center bg-background/50"><Loader2 className="animate-spin text-indigo-500" size={36} /></div>}
            </div>
            <div className="space-y-5 border-t border-border p-5 lg:border-l lg:border-t-0">
              {sel && isImage(sel.type) && (
                <>
                  <div>
                    <p className="label flex items-center gap-1.5"><Wand2 size={14} /> Scan quality</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => reprocess(sel, { filter: f.id })}
                          className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${sel.filter === f.id ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "border-border hover:bg-black/5 dark:hover:bg-white/5"}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="btn-ghost w-full" onClick={() => reprocess(sel, { rotate: sel.rotate + 90 })}>
                    <RotateCw size={16} /> Rotate
                  </button>
                </>
              )}
              {sel && (
                <button
                  className="btn-ghost w-full text-rose-600"
                  onClick={() => {
                    const rest = pages.filter((p) => p.id !== sel.id);
                    setPages(rest);
                    setSelected(rest[0]?.id);
                  }}
                >
                  <Trash2 size={16} /> Remove page
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto border-t border-border p-4">
            {pages.map((p, i) => (
              <button key={p.id} onClick={() => setSelected(p.id)} className={`relative w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition ${selected === p.id ? "ring-indigo-500" : "ring-transparent"}`}>
                {isImage(p.type) ? <BlobImage blob={finalBlob(p)} alt={`Page ${i + 1}`} className="aspect-[3/4] w-20 object-cover" /> : <div className="grid aspect-[3/4] w-20 place-items-center bg-black/5 text-2xl dark:bg-white/5">📄</div>}
                <span className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 text-[10px] text-white">{i + 1}</span>
              </button>
            ))}
            <button onClick={() => fileRef.current?.click()} className="grid aspect-[3/4] w-20 shrink-0 place-items-center rounded-xl border-2 border-dashed border-border text-muted hover:border-indigo-400 hover:text-indigo-500">
              <Plus />
            </button>
          </div>
        </section>
      )}

      {pages.length > 0 && (
        <div className="safe-bottom sticky bottom-20 z-30 md:bottom-4">
          <button className="btn-primary w-full py-4 text-base" disabled={pages.some((p) => p.busy)} onClick={() => read()}>
            <Sparkles size={20} /> Read & file {pages.length} page{pages.length > 1 ? "s" : ""}
          </button>
        </div>
      )}

      {camera && <CameraCapture onClose={() => setCamera(false)} onCapture={(b) => addBlobs([{ blob: b, type: "image/jpeg" }])} />}
    </div>
  );
}

function SourceButton({ icon, title, text, gradient, onClick }: { icon: React.ReactNode; title: string; text: string; gradient: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group card flex items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-xl">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${gradient} text-white shadow-lg transition group-hover:scale-105`}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </button>
  );
}

function ScannerPanel({ inboxCount }: { inboxCount: number }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [msg, setMsg] = useState("");

  async function refresh() {
    setSupported(folderWatchSupported());
    const h = await getScannerFolder();
    setFolder(h?.name ?? null);
    setNeedsPermission(h ? !(await folderPermission(h)) : false);
  }
  useEffect(() => {
    refresh();
  }, []);

  if (supported === null) return null;

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600"><Printer size={24} /></span>
        <div className="flex-1">
          <h2 className="font-semibold">Printer / scanner auto-import</h2>
          {!supported ? (
            <p className="text-xs text-muted">Open DocSecure in Chrome or Edge on a computer to auto-import from your scanner. Here, scan to a file and use “Upload files”.</p>
          ) : folder ? (
            <p className="text-xs text-muted">
              Watching folder <b className="text-foreground">{folder}</b>: new scans appear here automatically{inboxCount ? ` · ${inboxCount} waiting` : ""}. {msg}
            </p>
          ) : (
            <p className="text-xs text-muted">Choose the folder your scanner app saves into (Windows Scan, HP Smart, Epson, Canon, macOS Image Capture…). Every new scan is imported automatically.</p>
          )}
        </div>
        {supported && (
          <div className="flex flex-wrap gap-2">
            {folder && needsPermission ? (
              <button className="btn-primary" onClick={async () => { const h = await getScannerFolder(); if (h && (await folderPermission(h, true))) { setNeedsPermission(false); await pollScannerFolder(); } }}>
                <FolderSync size={16} /> Reconnect
              </button>
            ) : folder ? (
              <>
                <button className="btn-ghost" onClick={async () => { const n = await pollScannerFolder(); setMsg(n ? `${n} imported.` : "No new scans yet."); }}>
                  <FolderSync size={16} /> Check now
                </button>
                <button className="btn-ghost text-xs" onClick={async () => { await forgetScannerFolder(); refresh(); }}>Change</button>
              </>
            ) : (
              <button className="btn-primary" onClick={async () => { try { await pickScannerFolder(); refresh(); } catch {} }}>
                <FolderSync size={16} /> Choose scanner folder
              </button>
            )}
          </div>
        )}
      </div>

      {/* Windows helper that drives the scanner itself (HP DeskJet and any WIA scanner) */}
      <div className="mt-4 rounded-2xl border border-border bg-black/2 p-4 dark:bg-white/3">
        <p className="text-sm font-semibold">Scan straight from your printer-scanner (Windows)</p>
        <p className="mt-1 text-xs text-muted">
          Websites cannot control a scanner, so DocSecure gives you a small Windows helper. Double-click <b>DocSecure Scan</b>, say whose document it is,
          and the page is scanned (300 DPI) into <b>Documents › DocSecure Scans</b>. Choose that folder above once — every scan is then read and filed automatically.
        </p>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-muted">
          <li>Download and unzip the helper, then double-click <b>Install-DocSecure-Scan.cmd</b> once (Windows may ask “Run anyway?” — it only uses your scanner).</li>
          <li>Use the <b>Scan with printer</b> box above: Search scanners › choose yours › Scan. Or double-click <b>DocSecure Scan</b> on the Desktop.</li>
          <li>Keep “File automatically” on: every page is read and saved into the person&apos;s folder.</li>
        </ol>
        <a href="/tools/DocSecure-Scan.zip" download className="btn-ghost mt-3 w-fit text-xs">
          <Download size={14} /> Download “DocSecure Scan” for Windows
        </a>
      </div>
    </section>
  );
}

function Review({
  pages, finalBlob, people, result, preset, autoFile, askFolder, onBack, onSaved,
}: {
  pages: Page[];
  finalBlob: (p: Page) => Blob;
  people: Person[];
  result: { extraction: Extraction; source: ExtractSource | "manual"; warning?: string };
  preset: { person?: string; category?: CategoryId };
  autoFile: boolean;
  /** Files the user uploaded by hand: always ask which person and folder before saving. */
  askFolder: boolean;
  onBack: () => void;
  onSaved: (personId: string, category: CategoryId, docId: string, auto: boolean) => void;
}) {
  const ex = result.extraction;
  const match = findOwner(people, ex);
  // Anyone may add a new person, except someone logged in with their own PIN (they save only for themselves).
  const { status: lockStatus } = useAdmin();
  const canCreate = lockStatus !== "member";
  const initialOwner = preset.person ?? match?.person.id ?? (ex.ownerName && canCreate ? "new" : people[0]?.id ?? "new");

  const [owner, setOwner] = useState<string>(initialOwner);
  const [newName, setNewName] = useState(ex.ownerName);
  const initialCategory: CategoryId = ex.category !== "other" ? ex.category : preset.category ?? "other";
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  // Best possible name from what was read, e.g. "Passport N1234567" or "Blood test – Asiri Hospital".
  const [title, setTitle] = useState(result.source === "manual" ? "" : smartTitle(ex, initialCategory));
  const [documentNumber, setDocumentNumber] = useState(ex.documentNumber);
  const [issueDate, setIssueDate] = useState(ex.issueDate);
  const [expiryDate, setExpiryDate] = useState(ex.expiryDate);
  const [issuer, setIssuer] = useState(ex.issuer);
  const [summary, setSummary] = useState(ex.summary);
  const [fields, setFields] = useState<DocField[]>(ex.fields);
  const [notes, setNotes] = useState("");
  const [fill, setFill] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentEx: Extraction = { ...ex, category, documentNumber, fields };
  const ownerPerson = people.find((p) => p.id === owner);
  const ownerDocs = useLiveQuery(() => (owner && owner !== "new" ? db.documents.where("personId").equals(owner).toArray() : []), [owner], []);
  const toFill = ownerPerson ? detailsToFill(ownerPerson, currentEx) : detailsFromExtraction(currentEx);
  const fillList = Object.entries(toFill) as [string, string][];
  const labelOf = (k: string) => PERSON_FIELDS.find((f) => f.key === k)?.label ?? k;

  async function save() {
    setSaving(true);
    try {
      // No duplicates: the very same file already saved for this person → don't save it again.
      const fileHash = pages[0] ? await hashBlob(pages[0].original) : undefined;
      if (fileHash && owner !== "new") {
        const existing = (await db.documents.where("personId").equals(owner).toArray()).find((d) => d.fileHash === fileHash);
        if (existing) {
          const inboxIds = pages.map((p) => p.inboxId).filter(Boolean) as string[];
          if (inboxIds.length) await db.inbox.bulkDelete(inboxIds);
          toast(`Already saved: ${existing.title} (not added again)`, "error");
          onSaved(existing.personId, existing.category, existing.id, auto);
          return;
        }
      }
      let personId = owner;
      if (owner === "new") {
        const p = await createPerson({ fullName: newName.trim() || "Unknown person", ...(fill ? toFill : {}) });
        personId = p.id;
      } else if (fill && fillList.length && ownerPerson) {
        await db.people.update(ownerPerson.id, { ...toFill, updatedAt: Date.now() });
      }
      const firstImage = pages.find((p) => isImage(p.type));
      const now = Date.now();
      const docId = uid();
      await db.documents.add({
        id: docId,
        personId,
        category,
        title: title.trim() || getCategory(category).label,
        documentNumber, issueDate, expiryDate, issuer, summary, notes,
        fields: fields.filter((f) => f.label.trim() || f.value.trim()),
        text: ex.fullText,
        pages: pages.map((p) => ({ blob: finalBlob(p), type: isImage(p.type) ? "image/jpeg" : p.type })),
        thumbnail: firstImage ? await makeThumbnail(finalBlob(firstImage)) : undefined,
        extractedBy: result.source,
        fileHash,
        createdAt: now,
        updatedAt: now,
      });
      const inboxIds = pages.map((p) => p.inboxId).filter(Boolean) as string[];
      if (inboxIds.length) await db.inbox.bulkDelete(inboxIds);
      // Also copy into "<computer folder>/<Person name>/<Folder>/" when set up.
      void autoSaveToComputer(personId, docId);
      onSaved(personId, category, docId, auto);
    } finally {
      setSaving(false);
    }
  }

  // Automatic filing: the owner and the document type were recognised with confidence.
  const confidentOwner = Boolean(preset.person) || (match !== null && match.score >= 0.8);
  const auto = !askFolder && autoFile && result.source !== "manual" && confidentOwner && initialCategory !== "other";
  const started = useRef(false);
  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      void save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  if (auto) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center">
        <div className="mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-linear-to-br from-emerald-500 to-teal-600 text-white shadow-xl">
          <FolderOpen size={40} />
        </div>
        <h1 className="text-2xl font-bold">Filing automatically</h1>
        <p className="mt-2 text-muted">
          {ownerPerson?.fullName} › {getCategory(category).emoji} {getCategory(category).label}
        </p>
        <p className="mt-1 text-sm font-medium">{title}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Back to pages</button>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{result.source === "manual" ? "Add document details" : "Check & save"}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          {result.source === "ai" && (<><Sparkles size={14} className="text-indigo-500" /> Details read by AI, please check them before saving.</>)}
          {result.source === "ocr" && "Details read with on-device text recognition. Please check and complete them."}
          {result.source === "manual" && "Fill in what you know. You can edit it later."}
        </p>
        {askFolder && (
          <p className="mt-3 flex items-center gap-2 rounded-2xl bg-indigo-500/10 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            <FolderOpen size={18} className="shrink-0" /> Which folder? Choose the person and the folder below, then press Save.
          </p>
        )}
        {result.warning && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"><AlertCircle size={14} /> AI not used: {result.warning}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          {/* Owner */}
          <section className="card p-5">
            <h2 className="mb-1 font-semibold">Whose document is this?</h2>
            {ex.ownerName && <p className="mb-3 text-xs text-muted">Name on document: <b className="text-foreground">{ex.ownerName}</b>{match && owner === match.person.id ? ` · matched to ${match.person.fullName}` : ""}</p>}
            <div className="grid gap-2">
              {people.map((p) => (
                <button key={p.id} onClick={() => setOwner(p.id)} className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${owner === p.id ? "border-indigo-500 bg-indigo-500/10" : "border-border hover:bg-black/3 dark:hover:bg-white/3"}`}>
                  <Avatar person={p} size={40} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{p.fullName}</span>
                    <span className="block text-xs text-muted">{p.relationship}</span>
                  </span>
                  {match?.person.id === p.id && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Match</span>}
                  {owner === p.id && <Check size={18} className="text-indigo-500" />}
                </button>
              ))}
              {canCreate && <div className={`rounded-xl border p-2.5 ${owner === "new" ? "border-indigo-500 bg-indigo-500/10" : "border-border"}`}>
                <button onClick={() => setOwner("new")} className="flex w-full items-center gap-3 text-left">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-black/5 dark:bg-white/10"><UserPlus size={18} /></span>
                  <span className="text-sm font-semibold">New person</span>
                </button>
                {owner === "new" && <input className="input mt-2" placeholder="Full name, e.g. P R Perera" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />}
              </div>}
            </div>
            {fillList.length > 0 && (
              <label className="mt-4 flex gap-3 rounded-xl bg-indigo-500/5 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={fill} onChange={(e) => setFill(e.target.checked)} />
                <span>
                  <b>Add found details to profile</b>
                  <span className="mt-1 block text-xs text-muted">{fillList.map(([k, v]) => `${labelOf(k)}: ${v}`).join(" · ")}</span>
                </span>
              </label>
            )}
          </section>

          {/* Folder – shown inside the owner's card */}
          <Tilt3D max={5}>
            <section className="card overflow-hidden">
              <div className={`flex items-center gap-3 bg-linear-to-r ${ownerPerson?.color ?? "from-indigo-500 to-sky-500"} px-4 py-3 text-white`}>
                {ownerPerson ? (
                  <Avatar person={ownerPerson} size={44} />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/20"><UserPlus size={20} /></span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">Save into card</p>
                  <p className="truncate font-bold">{ownerPerson?.fullName ?? (newName || "New person")}</p>
                </div>
                <span className="ml-auto rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                  {getCategory(category).emoji} {getCategory(category).label}
                </span>
              </div>
              <div className="p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Choose folder</p>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                  {CATEGORIES.map((c) => {
                    const n = ownerDocs.filter((d) => d.category === c.id).length;
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`relative rounded-xl p-2.5 pt-3 text-center transition duration-300 ${
                          active
                            ? `bg-linear-to-br ${c.gradient} -translate-y-1 text-white shadow-xl ring-2 ring-white/60`
                            : "border border-border hover:-translate-y-0.5 hover:bg-black/3 hover:shadow-md dark:hover:bg-white/3"
                        }`}
                      >
                        {/* folder tab */}
                        <span className={`absolute left-2.5 top-0 h-1.5 w-8 rounded-b ${active ? "bg-white/40" : `bg-linear-to-r ${c.gradient} opacity-60`}`} />
                        <div className="text-2xl">{c.emoji}</div>
                        <div className="mt-1 text-[11px] font-semibold leading-tight">{c.label}</div>
                        {n > 0 && <div className={`text-[10px] ${active ? "text-white/80" : "text-muted"}`}>{n} saved</div>}
                        {active && <Check size={14} className="absolute right-1.5 top-1.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </Tilt3D>
        </div>

        {/* Details */}
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Document details</h2>
          <div><label className="label">Title</label><input className="input" placeholder={`e.g. ${getCategory(category).label} – ${new Date().getFullYear()}`} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Document / reference number</label><input className="input" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} /></div>
            <div><label className="label">Issued by</label><input className="input" value={issuer} onChange={(e) => setIssuer(e.target.value)} /></div>
            <div><label className="label">Issue / report date</label><DateSelect value={issueDate} onChange={setIssueDate} fromYear={1940} /></div>
            <div><label className="label">Expiry date</label><DateSelect value={expiryDate} onChange={setExpiryDate} fromYear={new Date().getFullYear() - 15} toYear={new Date().getFullYear() + 25} /></div>
          </div>
          <div><label className="label">Summary</label><textarea className="input min-h-16" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label mb-0">All details found ({fields.length})</span>
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setFields([...fields, { label: "", value: "" }])}><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input w-2/5" placeholder="Label" value={f.label} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input className="input flex-1" placeholder="Value" value={f.value} onChange={(e) => setFields(fields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button className="px-2 text-muted hover:text-rose-600" aria-label="Remove" onClick={() => setFields(fields.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="input min-h-16" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </section>
      </div>

      <SaveLocation
        personName={owner === "new" ? newName || "New person" : ownerPerson?.fullName ?? ""}
        path={previewDocPath(owner === "new" ? newName || "New person" : ownerPerson?.fullName ?? "", {
          category,
          title: title.trim() || getCategory(category).label,
          issueDate,
          createdAt: Date.now(),
        })}
      />

      <div className="safe-bottom sticky bottom-20 z-30 md:bottom-4">
        <button className="btn-primary w-full py-4 text-base" disabled={saving || (owner === "new" && !newName.trim())} onClick={save}>
          {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
          Save to {owner === "new" ? newName || "new person" : ownerPerson?.fullName} › {getCategory(category).label}
        </button>
      </div>
    </div>
  );
}

/** Shows the folder path the document will be saved under, and the computer-folder status. */
function SaveLocation({ path, personName }: { path: string; personName: string }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<{ name: string; ok: boolean } | null>(null);
  useEffect(() => {
    setSupported(computerFolderSupported());
    computerFolderStatus().then(setStatus);
  }, []);
  const parts = path.split("/");

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 bg-black/3 px-5 py-4 text-sm dark:bg-white/4">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted">Saved as</span>
        {parts.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} className="text-muted" />}
            <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium ${i === parts.length - 1 ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"}`}>
              {i === parts.length - 1 ? <FileText size={14} /> : <FolderOpen size={14} />} {p}
            </span>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs">
        {!supported ? (
          <span className="text-muted">Kept safely in the app under {personName || "this person"}. Use “Save all (ZIP)” on their page to get these folders on your device.</span>
        ) : status?.ok ? (
          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 size={15} /> Also saved on this computer in <b>{status.name}</b>
          </span>
        ) : status ? (
          <>
            <span className="text-amber-700 dark:text-amber-300">Computer folder <b>{status.name}</b> needs permission again.</span>
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={async () => {
                const h = await getComputerFolder();
                if (h && (await computerFolderPermission(h, true))) setStatus({ name: h.name, ok: true });
              }}
            >
              <FolderSync size={14} /> Allow
            </button>
          </>
        ) : (
          <>
            <span className="text-muted">Want real folders on this computer too?</span>
            <button
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={async () => {
                try {
                  const h = await pickComputerFolder();
                  setStatus({ name: h.name, ok: true });
                  await saveAllToComputer();
                } catch {
                  /* cancelled */
                }
              }}
            >
              <FolderOpen size={14} /> Choose a folder
            </button>
          </>
        )}
      </div>
    </section>
  );
}
