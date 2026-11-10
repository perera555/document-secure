"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Download, Pencil, Trash2 } from "lucide-react";
import { db, type VaultDocument } from "@/lib/db";
import { getCategory } from "@/lib/categories";
import { downloadDocument } from "@/lib/backup";
import { BlobImage, expiryStatus, formatDate } from "./ui";
import { Tilt3D } from "./Tilt3D";

export function DocTile({ doc, ownerName }: { doc: VaultDocument; ownerName?: string }) {
  const router = useRouter();
  const c = getCategory(doc.category);
  const st = expiryStatus(doc.expiryDate);

  const act = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  return (
    <Tilt3D max={12}>
    <Link href={`/doc/${doc.id}`} className="group card relative block overflow-hidden">
      <div className="relative aspect-[3/4] overflow-hidden bg-black/5 dark:bg-white/5">
        {doc.thumbnail ? (
          <BlobImage blob={doc.thumbnail} alt={doc.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className={`grid h-full place-items-center bg-linear-to-br ${c.gradient} text-6xl opacity-80`}>
            {doc.pages[0]?.type === "application/pdf" ? "📄" : c.emoji}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          {c.emoji} {c.label}
        </span>
        {doc.pages.length > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] text-white backdrop-blur">{doc.pages.length} pages</span>
        )}
        {st && st !== "ok" && (
          <span className={`absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white ${st === "expired" ? "bg-rose-600" : "bg-amber-500"}`}>
            <CalendarClock size={12} /> {st === "expired" ? "Expired" : "Expires soon"}
          </span>
        )}
        {/* Quick actions */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          {doc.pages.length > 0 && (
            <button title="Download" aria-label="Download" onClick={act(() => downloadDocument(doc, ownerName))} className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-gray-800 shadow hover:bg-white">
              <Download size={15} />
            </button>
          )}
          <button title="Edit" aria-label="Edit" onClick={act(() => router.push(`/doc/${doc.id}?edit=1`))} className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-gray-800 shadow hover:bg-white">
            <Pencil size={15} />
          </button>
          <button
            title="Delete"
            aria-label="Delete"
            onClick={act(async () => {
              if (confirm(`Delete “${doc.title}” permanently?`)) await db.documents.delete(doc.id);
            })}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/95 text-rose-600 shadow hover:bg-white"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold">{doc.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {[doc.documentNumber, formatDate(doc.issueDate) || formatDate(new Date(doc.createdAt).toISOString())].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
    </Tilt3D>
  );
}
