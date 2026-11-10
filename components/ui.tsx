"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { initials, type Person } from "@/lib/db";

export function useObjectUrl(blob?: Blob | null) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

export function BlobImage({ blob, alt, className }: { blob?: Blob | null; alt: string; className?: string }) {
  const url = useObjectUrl(blob);
  if (!url) return <div className={`${className ?? ""} bg-black/5 dark:bg-white/5`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} draggable={false} />;
}

export function Avatar({ person, size = 56 }: { person: Pick<Person, "fullName" | "color" | "photo">; size?: number }) {
  const url = useObjectUrl(person.photo);
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-2xl bg-linear-to-br ${person.color} grid place-items-center font-bold text-white shadow-md`}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={person.fullName} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        initials(person.fullName) || "?"
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={`animate-pop card max-h-[92vh] w-full overflow-y-auto rounded-b-none sm:rounded-2xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="rounded-lg p-1.5 hover:bg-black/5 dark:hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function formatDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function expiryStatus(s?: string): "expired" | "soon" | "ok" | null {
  if (!s) return null;
  const t = new Date(s).getTime();
  if (isNaN(t)) return null;
  const days = (t - Date.now()) / 86400000;
  return days < 0 ? "expired" : days < 90 ? "soon" : "ok";
}
