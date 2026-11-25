"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Toast = { id: number; text: string; kind: "ok" | "error" };
const listeners = new Set<(t: Toast) => void>();
let seq = 0;

/** Shows a short message at the bottom of the screen, e.g. toast("Details saved"). */
export function toast(text: string, kind: Toast["kind"] = "ok") {
  const t = { id: ++seq, text, kind };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const add = (t: Toast) => {
      setItems((list) => [...list, t]);
      setTimeout(() => setItems((list) => list.filter((x) => x.id !== t.id)), 3200);
    };
    listeners.add(add);
    return () => {
      listeners.delete(add);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-pop pointer-events-auto flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-2xl ${
            t.kind === "ok" ? "bg-emerald-600" : "bg-rose-600"
          }`}
        >
          {t.kind === "ok" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {t.text}
        </div>
      ))}
    </div>
  );
}
