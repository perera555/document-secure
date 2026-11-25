"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { CHANGELOG } from "@/lib/changelog";

const CURRENT = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const CHECK_EVERY_MS = 5 * 60 * 1000;

function readSeen() {
  try {
    return localStorage.getItem("seenVersion");
  } catch {
    return null;
  }
}
function writeSeen(v: string) {
  try {
    localStorage.setItem("seenVersion", v);
  } catch {}
}

/**
 * Top-of-page bar:
 *  - "New update available" when a newer version has been deployed (Update reloads into it)
 *  - "What's new" once after the app was updated
 */
export function UpdateBar() {
  const [available, setAvailable] = useState(false);
  const [whatsNew, setWhatsNew] = useState(false);
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const seen = readSeen();
    if (seen === null) writeSeen(CURRENT); // first visit: nothing to announce
    else if (seen !== CURRENT) setWhatsNew(true);

    let stopped = false;
    async function check() {
      if (stopped || !navigator.onLine) return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        const { version } = (await res.json()) as { version?: string };
        if (version && version !== CURRENT) setAvailable(true);
      } catch {}
    }
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", check);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", check);
    };
  }, []);

  async function update() {
    setUpdating(true);
    try {
      // Drop cached pages so the new version loads fresh, then let the new service worker take over.
      const keys = (await caches?.keys?.()) ?? [];
      await Promise.all(keys.map((k) => caches.delete(k)));
      const reg = await navigator.serviceWorker?.getRegistration?.();
      await reg?.update();
    } catch {}
    window.location.reload();
  }

  function dismissWhatsNew() {
    writeSeen(CURRENT);
    setWhatsNew(false);
    setOpen(false);
  }

  if (!available && !whatsNew) return null;
  const latest = CHANGELOG[0];

  if (available) {
    return (
      <div className="relative z-[70] bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 text-white shadow-lg" role="status">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">
            <Sparkles size={15} />
          </span>
          <span className="font-semibold">New update available</span>
          <span className="hidden text-white/85 sm:inline">A newer version of DocSecure is ready.</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={update}
              disabled={updating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow hover:bg-indigo-50"
            >
              <RefreshCw size={14} className={updating ? "animate-spin" : ""} /> {updating ? "Updating…" : "Update now"}
            </button>
            <button onClick={() => setAvailable(false)} aria-label="Later" className="rounded-lg p-1.5 hover:bg-white/15">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-[70] border-b border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100" role="status">
      <div className="mx-auto max-w-6xl px-4 py-2.5 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">Updated</span>
          <span className="font-semibold">What&apos;s new: {latest.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setOpen((o) => !o)} className="rounded-lg px-2.5 py-1 text-xs font-semibold underline-offset-2 hover:underline">
              {open ? "Hide" : "See changes"}
            </button>
            <button onClick={dismissWhatsNew} aria-label="Dismiss" className="rounded-lg p-1.5 hover:bg-emerald-600/15">
              <X size={16} />
            </button>
          </div>
        </div>
        {open && (
          <ul className="animate-pop mt-2 grid gap-1 pb-1 pl-1 sm:grid-cols-2">
            {latest.items.map((i) => (
              <li key={i} className="flex gap-2 text-[13px]">
                <span className="text-emerald-600">✓</span> {i}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
