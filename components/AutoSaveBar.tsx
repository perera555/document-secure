"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, FolderOpen, FolderSync, Loader2 } from "lucide-react";
import { computerFolderPermission, computerFolderStatus, computerFolderSupported, getComputerFolder, pickComputerFolder, saveAllToComputer } from "@/lib/export";
import { toast } from "./Toast";

/**
 * Auto-save to a folder on this computer (Chrome / Edge).
 * Browsers only allow a website to write files into a folder the person picks themselves,
 * so the admin chooses it once; after that every document is saved there automatically
 * as "<Person name>/<Folder>/<Document>.pdf".
 */
export function AutoSaveBar() {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<{ name: string; ok: boolean } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(computerFolderSupported());
    computerFolderStatus().then(setStatus);
  }, []);

  if (!supported || status === undefined) return null;

  if (status?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-800 dark:text-emerald-200">
        <CheckCircle2 size={18} className="text-emerald-600" />
        Auto-save is <b>ON</b> — every document is also saved in <b>{status.name}</b> on this computer, in each person&apos;s folder.
      </div>
    );
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 border-emerald-500/40 bg-emerald-500/5 p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white"><FolderSync size={18} /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Auto-save to this computer: {status ? "needs permission" : "OFF"}</p>
        <p className="text-sm text-muted">
          {status
            ? `Allow DocSecure to keep saving into “${status.name}”.`
            : "Choose a folder once. Every document is then saved there automatically: Person › Folder › Document.pdf."}
        </p>
      </div>
      <button
        className="btn-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            if (status) {
              const h = await getComputerFolder();
              if (h && (await computerFolderPermission(h, true))) {
                const n = await saveAllToComputer();
                setStatus({ name: h.name, ok: true });
                toast(`Auto-save on — ${n} documents saved`);
              }
            } else {
              const h = await pickComputerFolder();
              const n = await saveAllToComputer();
              setStatus({ name: h.name, ok: true });
              toast(`Auto-save on — ${n} documents saved in “${h.name}”`);
            }
          } catch {
            /* folder picker cancelled */
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />} {status ? "Allow" : "Turn on auto-save"}
      </button>
    </div>
  );
}
