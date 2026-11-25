"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, KeyRound, Loader2, Lock } from "lucide-react";
import {
  clearFailures, getLockConfig, lockoutRemainingMs, loginWithPin, readSession, recordFailure, writeSession, type LockConfig,
} from "@/lib/lock";

type Status = "loading" | "open" | "locked" | "admin" | "viewer";

interface AdminCtx {
  /** True only when an admin is logged in: may add, edit, update and delete. */
  isAdmin: boolean;
  status: Status;
  config: LockConfig | null;
  /** Name of the logged-in admin. */
  adminName?: string;
  lockNow: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AdminCtx>({ isAdmin: false, status: "open", config: null, lockNow: () => {}, refresh: async () => {} });

export const useAdmin = () => useContext(Ctx);

const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

export function AdminLockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [adminName, setAdminName] = useState<string>();
  const lastActivity = useRef(0); // set in the browser; reading the clock during prerender isn't allowed

  const refresh = useCallback(async () => {
    const c = await getLockConfig();
    setConfig(c);
    const s = readSession();
    const expired = s && c && c.autoLockMinutes > 0 && Date.now() - s.last > c.autoLockMinutes * 60_000;
    if (s && !expired && s.role === "admin") {
      lastActivity.current = Date.now();
      setAdminName(s.name);
      setStatus("admin");
    } else {
      // Everyone may open the app and look at people and documents.
      // Adding, editing, deleting and scanning need the admin PIN (/login).
      writeSession(null);
      setStatus("open");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Log the admin out; the app stays open for viewing. */
  const lockNow = useCallback(() => {
    writeSession(null);
    setAdminName(undefined);
    setStatus("open");
  }, []);

  // Auto-lock after inactivity (also when the app sits in the background).
  useEffect(() => {
    if (!config || config.autoLockMinutes <= 0 || status !== "admin") return;
    const limit = config.autoLockMinutes * 60_000;
    const touch = () => {
      lastActivity.current = Date.now();
      const s = readSession();
      if (s) writeSession({ ...s, last: lastActivity.current });
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const tick = setInterval(() => {
      if (Date.now() - lastActivity.current > limit) lockNow();
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastActivity.current > limit) lockNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      ACTIVITY.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [config, status, lockNow]);

  // Pages are open to everyone, so they always render right away (Next.js also needs every
  // page segment rendered). Admin-only buttons appear once the admin login is confirmed.
  return (
    <Ctx.Provider value={{ isAdmin: status === "admin", status, config, adminName, lockNow, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

/** Full-screen PIN login. Used by the lock and by the /login page. */
export function LockScreen({
  config,
  onAdmin,
  onViewer,
  title = "DocSecure is locked",
}: {
  config: LockConfig | null;
  onAdmin: (name?: string, id?: string) => void;
  onViewer?: () => void;
  title?: string;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!pin) return;
    const wait = lockoutRemainingMs();
    if (wait) return setError(`Too many tries. Wait ${Math.ceil(wait / 1000)} seconds.`);
    setBusy(true);
    setError("");
    try {
      const r = await loginWithPin(pin);
      if (r.ok) {
        clearFailures();
        onAdmin(r.name, r.id);
      } else {
        if (r.error !== "offline" && r.error !== "not-configured") recordFailure();
        setError(
          r.error === "offline"
            ? "Wrong PIN, or you are offline. The first login on a device needs internet."
            : r.error === "too-many"
              ? "Too many tries. Please wait a few minutes."
              : r.error === "not-configured" && !config
                ? "No admin PIN has been set up yet."
                : "Wrong PIN.",
        );
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#05060f] px-4 text-slate-100" style={{ backgroundColor: "#05060f" }}>
      <div className="aurora pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-indigo-600/35 blur-[110px]" />
      <div className="aurora-slow pointer-events-none absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-sky-500/25 blur-[110px]" />

      <div className="animate-pop relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/40">
          <Lock size={28} />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-center text-sm text-slate-300">
          {config?.adminName ? `Welcome back, ${config.adminName}. ` : ""}Enter your admin PIN
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={12}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-center text-3xl tracking-[0.5em] text-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/30"
            placeholder="• • • •"
            value={pin}
            onChange={(e) => {
              setError("");
              setPin(e.target.value.replace(/\D/g, ""));
            }}
            aria-label="Admin PIN"
          />
          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {keys.map((k) =>
              k === "✓" ? (
                <button key={k} type="submit" disabled={busy} aria-label="Log in" className="grid h-14 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-sky-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30 active:scale-95">
                  {busy ? <Loader2 className="animate-spin" size={22} /> : "✓"}
                </button>
              ) : (
                <button
                  key={k}
                  type="button"
                  aria-label={k === "⌫" ? "Delete" : k}
                  onClick={() => {
                    setError("");
                    setPin((p) => (k === "⌫" ? p.slice(0, -1) : (p + k).slice(0, 12)));
                  }}
                  className="h-14 rounded-2xl border border-white/10 bg-white/10 text-2xl font-semibold text-white transition hover:bg-white/20 active:scale-95"
                >
                  {k}
                </button>
              ),
            )}
          </div>
          {error && <p className="text-center text-sm font-medium text-rose-300">{error}</p>}
        </form>

        {config?.allowViewOnly && onViewer && (
          <button onClick={onViewer} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            <Eye size={16} /> Open view-only
          </button>
        )}
        <p className="mt-4 text-center text-xs text-slate-400">Forgot your PIN? Ask the main admin.</p>
      </div>
    </div>
  );
}

/** Shown in place of admin-only pages when no admin is logged in. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAdmin();
  if (isAdmin) return <>{children}</>;
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Lock size={28} /></div>
      <h2 className="text-lg font-semibold">Admin only</h2>
      <p className="mt-1 text-sm text-muted">Log in with the admin PIN to scan, add, update or delete people and documents.</p>
      <a href="/login" className="btn-primary mt-5"><KeyRound size={16} /> Admin login</a>
    </div>
  );
}
