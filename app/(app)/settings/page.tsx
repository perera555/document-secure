"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Download, FolderDown, FolderOpen, FolderSync, HardDrive, KeyRound, Sparkles, Upload, ShieldCheck, Smartphone, CheckCircle2, X,
} from "lucide-react";
import { db, getSetting, setSetting } from "@/lib/db";
import { downloadBlob, exportBackup, importBackup } from "@/lib/backup";
import { getServerInfo, type ServerInfo } from "@/lib/extract";
import {
  computerFolderPermission, computerFolderSupported, downloadAllZip, forgetComputerFolder, getComputerFolder, pickComputerFolder, saveAllToComputer,
} from "@/lib/export";
import { InstallButton } from "@/components/InstallButton";

function Section({ icon, gradient, title, subtitle, children }: { icon: ReactNode; gradient: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="card animate-pop overflow-hidden">
      <div className="flex items-start gap-4 p-5 pb-0">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br ${gradient} text-white shadow-lg`}>{icon}</span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [info, setInfo] = useState<ServerInfo>();
  const [useAI, setUseAI] = useState(true);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean }>();
  const [msg, setMsg] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState<{ name: string; ok: boolean } | null>(null);
  const [fsSupported, setFsSupported] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const counts = useLiveQuery(async () => ({ people: await db.people.count(), docs: await db.documents.count() }), []);

  async function refreshFolder() {
    setFsSupported(computerFolderSupported());
    const h = await getComputerFolder();
    setFolder(h ? { name: h.name, ok: await computerFolderPermission(h) } : null);
  }

  useEffect(() => {
    getServerInfo().then(setInfo);
    getSetting("useAI", true).then(setUseAI);
    getSetting("accessCode", "").then((c) => setCode(String(c)));
    refreshFolder();
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted });
    })();
  }, []);

  const mb = (n: number) => (n / 1024 / 1024).toFixed(n > 1e9 ? 0 : 1) + " MB";

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setSaveMsg("");
    try {
      setSaveMsg(await fn());
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-800 via-indigo-900 to-violet-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-400/20 blur-2xl" />
        <p className="text-sm text-white/70">DocSecure</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-white/75">
          {counts?.people ?? 0} people · {counts?.docs ?? 0} documents{usage ? ` · ${mb(usage.used)} used` : ""}
        </p>
      </section>

      {/* Save under person's name */}
      <Section
        icon={<FolderDown size={22} />}
        gradient="from-emerald-500 to-teal-600"
        title="Save under each person's name"
        subtitle="Every document is saved in folders named after its owner, e.g. P R Perera › Medical › Blood test.jpg, plus a details.txt with all their details."
      >
        <div className="rounded-2xl border border-border bg-black/2 p-4 font-mono text-xs leading-relaxed dark:bg-white/3">
          📁 P R Perera<br />
          &nbsp;&nbsp;&nbsp;├─ 📁 Medical<br />
          &nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└─ Blood test – Asiri Hospital (2026-11-10).jpg<br />
          &nbsp;&nbsp;&nbsp;├─ 📁 Passport<br />
          &nbsp;&nbsp;&nbsp;├─ 📁 National ID<br />
          &nbsp;&nbsp;&nbsp;└─ 📄 details.txt
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border p-4">
            <p className="font-semibold">Download as ZIP</p>
            <p className="mt-1 text-xs text-muted">Works on every phone and computer. One folder per person inside.</p>
            <button className="btn-primary mt-3 w-full" disabled={busy || !counts?.docs} onClick={() => run(async () => { await downloadAllZip(); return "ZIP downloaded."; })}>
              <Download size={16} /> Download everyone (ZIP)
            </button>
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="font-semibold">Auto-save to a computer folder</p>
            {!fsSupported ? (
              <p className="mt-1 text-xs text-muted">Available in Chrome or Edge on Windows, Mac and Linux. On phones use the ZIP download.</p>
            ) : folder ? (
              <>
                <p className="mt-1 flex items-center gap-1.5 text-xs">
                  {folder.ok ? <CheckCircle2 size={14} className="text-emerald-500" /> : <FolderSync size={14} className="text-amber-500" />}
                  <span>Saving into <b>{folder.name}</b>{folder.ok ? " — new documents are copied automatically" : " — click Reconnect to continue"}</span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="btn-primary flex-1"
                    disabled={busy}
                    onClick={() => run(async () => { const n = await saveAllToComputer(); await refreshFolder(); return `Saved ${n} documents into “${folder.name}”.`; })}
                  >
                    <FolderSync size={16} /> {folder.ok ? "Save all now" : "Reconnect & save"}
                  </button>
                  <button className="btn-ghost px-3" title="Stop auto-saving" aria-label="Stop auto-saving" onClick={async () => { await forgetComputerFolder(); refreshFolder(); }}>
                    <X size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs text-muted">Choose a folder (for example Documents › Family Documents). Each new scan is copied there automatically.</p>
                <button
                  className="btn-primary mt-3 w-full"
                  disabled={busy}
                  onClick={() => run(async () => { const h = await pickComputerFolder(); await refreshFolder(); const n = await saveAllToComputer(); return `Folder “${h.name}” set. Saved ${n} documents.`; })}
                >
                  <FolderOpen size={16} /> Choose folder
                </button>
              </>
            )}
          </div>
        </div>
        {saveMsg && <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{saveMsg}</p>}
      </Section>

      <Section
        icon={<Sparkles size={22} />}
        gradient="from-indigo-500 to-violet-600"
        title="Smart reading (AI)"
        subtitle={
          info?.aiEnabled
            ? "AI reads each scan and finds the owner, document type and every detail. Pages are sent securely only while reading."
            : "AI is not set up on this server, so documents are read with free on-device text recognition (works offline)."
        }
      >
        {info?.aiEnabled ? (
          <label className="flex items-center justify-between rounded-xl bg-black/3 p-3 dark:bg-white/4">
            <span className="text-sm font-medium">Use AI when online</span>
            <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={useAI} onChange={async (e) => { setUseAI(e.target.checked); await setSetting("useAI", e.target.checked); }} />
          </label>
        ) : (
          <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">The app owner can turn this on by adding an ANTHROPIC_API_KEY in Vercel.</p>
        )}
        {info?.accessCodeRequired && (
          <div className="mt-4">
            <label className="label flex items-center gap-1.5"><KeyRound size={14} /> Access code</label>
            <div className="flex gap-2">
              <input className="input" type="password" value={code} onChange={(e) => { setCode(e.target.value); setSaved(false); }} placeholder="Code from the app owner" />
              <button className="btn-primary" onClick={async () => { await setSetting("accessCode", code); setSaved(true); }}>{saved ? "Saved" : "Save"}</button>
            </div>
          </div>
        )}
      </Section>

      <Section
        icon={<HardDrive size={22} />}
        gradient="from-sky-500 to-blue-600"
        title="Storage & backup"
        subtitle="Documents are stored privately on this device. A backup file restores everything (people, photos, documents) on another phone or computer."
      >
        {usage && (
          <div className="mb-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-sky-500" style={{ width: `${Math.max(1, (usage.used / Math.max(usage.quota, 1)) * 100)}%` }} />
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              {mb(usage.used)} used of {mb(usage.quota)} available
              {usage.persisted && <><ShieldCheck size={12} className="text-emerald-500" /> protected from automatic clean-up</>}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={async () => { setMsg("Preparing backup…"); downloadBlob(await exportBackup(), `DocSecure-backup-${new Date().toISOString().slice(0, 10)}.json`); setMsg("Backup downloaded."); }}>
            <Download size={16} /> Download backup
          </button>
          <button className="btn-ghost" onClick={() => importRef.current?.click()}><Upload size={16} /> Restore backup</button>
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { const r = await importBackup(f); setMsg(`Restored ${r.people} people and ${r.documents} documents.`); }
            catch (err) { setMsg(err instanceof Error ? err.message : "Restore failed"); }
            e.target.value = "";
          }} />
        </div>
        {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      </Section>

      <Section icon={<Smartphone size={22} />} gradient="from-fuchsia-500 to-pink-600" title="Install app" subtitle="Install DocSecure on Windows, Mac, Android, iPhone or iPad. It opens in its own window and works offline.">
        <InstallButton size="sm" />
      </Section>
    </div>
  );
}
