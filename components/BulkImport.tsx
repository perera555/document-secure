"use client";

import { useRef, useState } from "react";
import { FileStack, FolderInput, Loader2 } from "lucide-react";
import { db, uid } from "@/lib/db";
import { toast } from "./Toast";

const ACCEPT = /\.(pdf|jpe?g|png|webp|gif|bmp)$/i;

function typeOf(f: File) {
  if (f.type) return f.type;
  return /\.pdf$/i.test(f.name) ? "application/pdf" : "image/jpeg";
}

/**
 * Import many documents from the computer: each file becomes its own document.
 * Files go into the same queue as scanner pages, so the Scan page reads and files
 * them one after another ("File automatically"). With a folder, the folder names
 * help: "P R Perera/Medical/blood test.pdf" → P R Perera › Medical.
 */
export function BulkImport({ queued, ownerName }: { queued: number; ownerName?: string }) {
  const filesRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function add(list: FileList | null) {
    const files = [...(list ?? [])].filter((f) => ACCEPT.test(f.name));
    if (!files.length) {
      toast("No PDF or image files found", "error");
      return;
    }
    setBusy(true);
    try {
      const now = Date.now();
      await db.inbox.bulkAdd(
        files.map((f, i) => ({
          id: uid(),
          // Keep the folder path in the name: it tells DocSecure whose document it is.
          // With a personal PIN, every file belongs to that person.
          name: (ownerName ? `${ownerName}/` : "") + (f.webkitRelativePath || f.name).replace(/\\/g, "/"),
          blob: f,
          type: typeOf(f),
          createdAt: now + i,
        })),
      );
      toast(`${files.length} document${files.length > 1 ? "s" : ""} added to the queue`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-500/15 text-violet-600"><FileStack size={24} /></span>
        <div className="flex-1">
          <h2 className="font-semibold">Import many documents from this computer</h2>
          <p className="text-xs text-muted">
            Each file becomes its own document and is filed automatically. Folder names help too, e.g. <b>P R Perera › Medical › blood test.pdf</b>.
            {queued > 0 && <b className="text-foreground"> {queued} waiting…</b>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy} onClick={() => filesRef.current?.click()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <FileStack size={16} />} Choose files
          </button>
          <button className="btn-ghost" disabled={busy} onClick={() => folderRef.current?.click()}>
            <FolderInput size={16} /> Choose a folder
          </button>
        </div>
      </div>
      <input
        ref={filesRef}
        hidden
        type="file"
        multiple
        accept="application/pdf,image/*"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={folderRef}
        hidden
        type="file"
        multiple
        // Folder picking (Chrome, Edge, Firefox, Safari)
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
    </section>
  );
}
