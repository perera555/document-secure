"use client";

import { useRef, useState } from "react";
import { Download, Laptop, Loader2, Upload } from "lucide-react";
import { downloadBlob, exportBackup, importBackup } from "@/lib/backup";
import { toast } from "./Toast";

/** Admin panel: move all people and documents to another computer or phone with one backup file. */
export function DeviceTransfer() {
  const [busy, setBusy] = useState<"" | "export" | "import">("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="card animate-pop overflow-hidden">
      <div className="flex items-start gap-4 p-5 pb-0">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-indigo-600 text-white shadow-lg">
          <Laptop size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Use on another computer or phone</h2>
          <p className="mt-0.5 text-sm text-muted">Documents are kept on this device. Move everything to another device with one backup file.</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ol className="grid gap-3 sm:grid-cols-2">
          {[
            ["On this device", "Press “Download backup”. A file DocSecure-backup-(date).json is saved."],
            ["Move the file", "Copy it to the other device: USB pen drive, Google Drive, or email / WhatsApp to yourself."],
            ["On the other device", "Open DocSecure there, log in with the admin PIN, open Admin panel and press “Restore backup”."],
            ["Done", "All people, photos, details and documents appear. Repeat any time to bring the other device up to date."],
          ].map(([t, d], i) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-black/3 p-3 dark:bg-white/4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-600 dark:text-indigo-300">{i + 1}</span>
              <span>
                <span className="block text-sm font-semibold">{t}</span>
                <span className="block text-sm text-muted">{d}</span>
              </span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={!!busy}
            onClick={async () => {
              setBusy("export");
              try {
                downloadBlob(await exportBackup(), `DocSecure-backup-${new Date().toISOString().slice(0, 10)}.json`);
                toast("Backup downloaded");
              } finally {
                setBusy("");
              }
            }}
          >
            {busy === "export" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download backup
          </button>
          <button className="btn-ghost" disabled={!!busy} onClick={() => fileRef.current?.click()}>
            {busy === "import" ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Restore backup
          </button>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy("import");
              try {
                const r = await importBackup(f);
                toast(`Restored ${r.people} people and ${r.documents} documents`);
              } catch (err) {
                toast(err instanceof Error ? err.message : "Restore failed", "error");
              } finally {
                setBusy("");
              }
            }}
          />
        </div>
        <p className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
          Keep the backup file safe: it contains all documents. Restoring adds and updates; it never deletes anything on the other device.
        </p>
      </div>
    </section>
  );
}
