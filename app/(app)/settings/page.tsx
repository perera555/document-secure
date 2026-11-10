"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Download, HardDrive, KeyRound, Sparkles, Upload, ShieldCheck, Smartphone } from "lucide-react";
import { db, getSetting, setSetting } from "@/lib/db";
import { downloadBlob, exportBackup, importBackup } from "@/lib/backup";
import { getServerInfo, type ServerInfo } from "@/lib/extract";
import { InstallButton } from "@/components/InstallButton";

export default function SettingsPage() {
  const [info, setInfo] = useState<ServerInfo>();
  const [useAI, setUseAI] = useState(true);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState<{ used: number; quota: number; persisted: boolean }>();
  const [msg, setMsg] = useState("");
  const importRef = useRef<HTMLInputElement>(null);
  const counts = useLiveQuery(async () => ({ people: await db.people.count(), docs: await db.documents.count() }), []);

  useEffect(() => {
    getServerInfo().then(setInfo);
    getSetting("useAI", true).then(setUseAI);
    getSetting("accessCode", "").then((c) => setCode(String(c)));
    (async () => {
      const est = await navigator.storage?.estimate?.();
      const persisted = (await navigator.storage?.persisted?.()) ?? false;
      if (est) setUsage({ used: est.usage ?? 0, quota: est.quota ?? 0, persisted });
    })();
  }, []);

  const mb = (n: number) => (n / 1024 / 1024).toFixed(n > 1e9 ? 0 : 1) + " MB";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles size={18} className="text-indigo-500" /> Smart reading (AI)</h2>
        <p className="mt-1 text-sm text-muted">
          {info?.aiEnabled
            ? "AI reads each scan and finds the owner, document type and every detail. Pages are sent securely to the AI service only while reading; they are not stored there."
            : "AI is not set up on this server, so documents are read with free on-device text recognition (works offline)."}
        </p>
        {info?.aiEnabled && (
          <label className="mt-4 flex items-center justify-between rounded-xl bg-black/3 p-3 dark:bg-white/4">
            <span className="text-sm font-medium">Use AI when online</span>
            <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={useAI} onChange={async (e) => { setUseAI(e.target.checked); await setSetting("useAI", e.target.checked); }} />
          </label>
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
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><HardDrive size={18} className="text-sky-500" /> Storage & backup</h2>
        <p className="mt-1 text-sm text-muted">
          Your {counts?.people ?? 0} people and {counts?.docs ?? 0} documents are stored privately <b>on this device</b>. Make a backup regularly and to move data to another phone or computer.
        </p>
        {usage && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div className="h-full rounded-full bg-linear-to-r from-indigo-500 to-sky-500" style={{ width: `${Math.max(1, (usage.used / Math.max(usage.quota, 1)) * 100)}%` }} />
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
              {mb(usage.used)} used of {mb(usage.quota)} available
              {usage.persisted && <><ShieldCheck size={12} className="text-emerald-500" /> protected from automatic clean-up</>}
            </p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
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
      </section>

      <section className="card p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Smartphone size={18} className="text-emerald-500" /> Install app</h2>
        <p className="mb-4 mt-1 text-sm text-muted">Install DocSecure on Windows, Mac, Android, iPhone or iPad. It opens in its own window and works offline.</p>
        <InstallButton size="sm" />
      </section>
    </div>
  );
}
