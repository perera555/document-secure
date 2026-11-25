"use client";

import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import type { VaultDocument } from "@/lib/db";
import { downloadDocument, shareDocument } from "@/lib/backup";
import { isImage } from "@/lib/image";
import { getCategory } from "@/lib/categories";
import { useObjectUrl } from "./ui";

/**
 * Full-screen "show" view, e.g. to show a report to a doctor.
 * All pages one under the other (images can be pinch-zoomed on phones), works offline.
 */
export function ShowMode({ doc, ownerName, onClose }: { doc: VaultDocument; ownerName?: string; onClose: () => void }) {
  const [current, setCurrent] = useState(1);
  const c = getCategory(doc.category);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Try real full screen (hides the browser bars); fine if the browser says no.
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={`Showing ${doc.title}`}>
      <div className="flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-to-br ${c.gradient} text-lg`}>{c.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{doc.title}</p>
          <p className="truncate text-xs text-white/70">
            {ownerName} · {c.label}
            {doc.pages.length > 1 ? ` · page ${current} of ${doc.pages.length}` : ""}
          </p>
        </div>
        <button onClick={() => shareDocument(doc, ownerName)} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Share" title="Share">
          <Share2 size={18} />
        </button>
        <button onClick={() => downloadDocument(doc, ownerName)} className="rounded-full bg-white/10 p-2.5 hover:bg-white/20" aria-label="Download PDF" title="Download PDF">
          <Download size={18} />
        </button>
        <button onClick={onClose} className="rounded-full bg-white p-2.5 text-black hover:bg-white/90" aria-label="Close" title="Close">
          <X size={18} />
        </button>
      </div>

      <div
        className="flex-1 snap-y snap-mandatory overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setCurrent(Math.min(doc.pages.length, Math.round(el.scrollTop / Math.max(1, el.clientHeight)) + 1));
        }}
      >
        {doc.pages.map((p, i) => (
          <ShowPage key={i} blob={p.blob} type={p.type} alt={`${doc.title} page ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

function ShowPage({ blob, type, alt }: { blob: Blob; type: string; alt: string }) {
  const url = useObjectUrl(blob);
  return (
    <div className="grid h-full min-h-full snap-start place-items-center p-2" style={{ touchAction: "pinch-zoom pan-y" }}>
      {!url ? null : isImage(type) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="max-h-full max-w-full rounded object-contain shadow-2xl" />
      ) : (
        <iframe src={url} title={alt} className="h-full w-full rounded bg-white" />
      )}
    </div>
  );
}
