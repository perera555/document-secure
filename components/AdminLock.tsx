"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import {
  clearFailures, getLockConfig, getMemberPins, lockoutRemainingMs, loginWithPin, readSession, recordFailure, writeSession, type LockConfig, type LoginResult,
} from "@/lib/lock";

/**
 * Who is using the app:
 *  - "admin":  admin PIN — sees and manages everyone.
 *  - "member": a person's own PIN — sees and manages only their own documents.
 *  - "locked": nobody logged in — the People page shows the cards (photo and name only);
 *              tapping a card asks for that person's PIN. Everything else asks for a PIN.
 */
type Status = "loading" | "locked" | "admin" | "member";
type OkLogin = Extract<LoginResult, { ok: true }>;

interface AdminCtx {
  isAdmin: boolean;
  status: Status;
  config: LockConfig | null;
  /** Name shown in the header. */
  adminName?: string;
  /** The person whose PIN is in use (member). */
  memberId?: string;
  /** May the current user see this person's data? (No personal PIN set → open to everyone.) */
  canSee: (personId?: string) => boolean;
  /** May the current user update / remove this person's documents? (Admin, or the person themselves.) */
  canEdit: (personId?: string) => boolean;
  /** Start a session after a successful PIN. */
  login: (r: OkLogin, name?: string) => Promise<void>;
  lockNow: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AdminCtx>({
  isAdmin: false,
  status: "loading",
  config: null,
  canSee: () => false,
  canEdit: () => false,
  login: async () => {},
  lockNow: () => {},
  refresh: async () => {},
});

export const useAdmin = () => useContext(Ctx);

const ACTIVITY = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
const DEFAULT_AUTO_LOCK_MIN = 5;

export function AdminLockProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [adminName, setAdminName] = useState<string>();
  const [memberId, setMemberId] = useState<string>();
  // People who have their own PIN: only they (or the admin) may open them.
  const [protectedIds, setProtectedIds] = useState<Set<string>>(new Set());
  const lastActivity = useRef(0); // set in the browser; reading the clock during prerender isn't allowed

  const refresh = useCallback(async () => {
    const c = await getLockConfig();
    setConfig(c);
    setProtectedIds(new Set((await getMemberPins()).map((m) => m.personId)));
    const s = readSession();
    const limit = (c?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MIN) * 60_000;
    const expired = s && limit > 0 && Date.now() - s.last > limit;
    if (s && !expired && s.role === "admin") {
      lastActivity.current = Date.now();
      setAdminName(s.name);
      setMemberId(undefined);
      setStatus("admin");
    } else if (s && !expired && s.role === "member" && s.personId) {
      lastActivity.current = Date.now();
      setAdminName(s.name);
      setMemberId(s.personId);
      setStatus("member");
    } else {
      writeSession(null);
      setStatus("locked");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Log out: everything asks for a PIN again. */
  const lockNow = useCallback(() => {
    writeSession(null);
    setAdminName(undefined);
    setMemberId(undefined);
    setStatus("locked");
  }, []);

  const login = useCallback(async (r: OkLogin, name?: string) => {
    lastActivity.current = Date.now();
    if (r.role === "admin") {
      writeSession({ role: "admin", last: lastActivity.current, name: r.name, adminId: r.id });
      setAdminName(r.name);
      setMemberId(undefined);
    } else {
      writeSession({ role: "member", last: lastActivity.current, personId: r.personId, name });
      setAdminName(name);
      setMemberId(r.personId);
    }
    setConfig(await getLockConfig());
    setStatus(r.role);
  }, []);

  // Log out automatically after inactivity (also when the app sits in the background).
  useEffect(() => {
    if (status !== "admin" && status !== "member") return;
    const minutes = config?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MIN;
    if (minutes <= 0) return;
    const limit = minutes * 60_000;
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

  // Pages always render (Next.js validates every page segment); each page asks for a PIN
  // where needed. While checking the session the page is hidden and shows a spinner.
  const ready = status !== "loading";
  const canEdit = (personId?: string) => status === "admin" || (status === "member" && !!personId && personId === memberId);
  const canSee = (personId?: string) => canEdit(personId) || (status !== "loading" && !!personId && !protectedIds.has(personId));
  return (
    <Ctx.Provider value={{ isAdmin: status === "admin", status, config, adminName, memberId, canSee, canEdit, login, lockNow, refresh }}>
      {!ready && (
        <div className="grid min-h-dvh place-items-center">
          <Loader2 className="animate-spin text-indigo-500" />
        </div>
      )}
      <div hidden={!ready}>{children}</div>
    </Ctx.Provider>
  );
}

/**
 * PIN keypad. `forPersonId`: only that person's own PIN (or the admin PIN) is accepted.
 * `adminOnly`: only an admin PIN is accepted.
 */
export function PinPad({
  onLogin,
  forPersonId,
  forName,
  adminOnly,
  dark = false,
}: {
  onLogin: (r: OkLogin, name?: string) => void;
  forPersonId?: string;
  forName?: string;
  adminOnly?: boolean;
  dark?: boolean;
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
      if (!r.ok) {
        if (r.error !== "offline" && r.error !== "not-configured") recordFailure();
        setError(
          r.error === "offline"
            ? "Wrong PIN, or you are offline. The first admin login on a device needs internet."
            : r.error === "too-many"
              ? "Too many tries. Please wait a few minutes."
              : "Wrong PIN.",
        );
        setPin("");
        return;
      }
      if (adminOnly && r.role !== "admin") {
        setError("This needs the admin PIN.");
        setPin("");
        return;
      }
      if (forPersonId && r.role === "member" && r.personId !== forPersonId) {
        recordFailure();
        setError(`That PIN is not for ${forName ?? "this person"}.`);
        setPin("");
        return;
      }
      clearFailures();
      let name: string | undefined;
      if (r.role === "member") {
        const { db } = await import("@/lib/db");
        name = (await db.people.get(r.personId))?.fullName;
      }
      onLogin(r, name);
    } finally {
      setBusy(false);
    }
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
  const field = dark
    ? "border-white/15 bg-black/30 text-white focus:border-indigo-400"
    : "border-border bg-background text-foreground focus:border-indigo-500";
  const key = dark ? "border-white/10 bg-white/10 text-white hover:bg-white/20" : "border-border bg-black/4 hover:bg-black/8 dark:bg-white/6 dark:hover:bg-white/12";

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        autoFocus
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={12}
        className={`w-full rounded-xl border px-4 py-3 text-center text-3xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-indigo-400/30 ${field}`}
        placeholder="• • • •"
        value={pin}
        onChange={(e) => {
          setError("");
          setPin(e.target.value.replace(/\D/g, ""));
        }}
        aria-label="PIN"
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
              className={`h-14 rounded-2xl border text-2xl font-semibold transition active:scale-95 ${key}`}
            >
              {k}
            </button>
          ),
        )}
      </div>
      {error && <p className={`text-center text-sm font-medium ${dark ? "text-rose-300" : "text-rose-600"}`}>{error}</p>}
    </form>
  );
}

/** "Forgot admin PIN?" — the main admin PIN is a server secret, so it is reset in Vercel, not in the app. */
export function ForgotAdminPin({ dark = false }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`text-xs font-semibold underline-offset-2 hover:underline ${dark ? "text-sky-300" : "text-indigo-600 dark:text-indigo-300"}`}
      >
        Forgot admin PIN?
      </button>
      {open && (
        <ol className={`mt-2 list-decimal space-y-1 rounded-xl p-3 pl-7 text-left text-xs ${dark ? "bg-white/10 text-slate-200" : "bg-black/4 text-muted dark:bg-white/6"}`}>
          <li>Open <b>vercel.com</b> and sign in (account perera555).</li>
          <li>Project <b>document-secure</b> › <b>Settings</b> › <b>Environment Variables</b>.</li>
          <li>Edit <b>ADMIN_PIN</b>, type a new PIN (numbers only) and save.</li>
          <li><b>Deployments</b> › the latest one › <b>Redeploy</b>. The new PIN works after about a minute.</li>
          <li>Other admins who forgot their PIN: the main admin removes and adds them again in Admin › Admins.</li>
        </ol>
      )}
    </div>
  );
}

/** Full-screen PIN page (used by /login). */
export function LockScreen({ onLogin, title = "Enter your PIN" }: { config?: LockConfig | null; onLogin: (r: OkLogin, name?: string) => void; title?: string }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#05060f] px-4 text-slate-100" style={{ backgroundColor: "#05060f" }}>
      <div className="aurora pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-indigo-600/35 blur-[110px]" />
      <div className="aurora-slow pointer-events-none absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-sky-500/25 blur-[110px]" />
      <div className="animate-pop relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/40">
          <Lock size={28} />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-center text-sm text-slate-300">Admin PIN, or your own PIN to see your documents</p>
        <div className="mt-5">
          <PinPad onLogin={onLogin} dark />
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Forgot your own PIN? Ask the admin to reset it.</p>
        <div className="mt-2">
          <ForgotAdminPin dark />
        </div>
      </div>
    </div>
  );
}

/**
 * PIN request shown inside a page (or a pop-up) when the page needs a login.
 * For a person's card it also offers "Forgot PIN? Admin reset": the admin types the admin PIN,
 * then sets a new PIN for that person on the spot.
 */
export function PinGate({ forPersonId, forName, adminOnly, title, onDone }: { forPersonId?: string; forName?: string; adminOnly?: boolean; title?: string; onDone?: () => void }) {
  const { login, refresh } = useAdmin();
  const [mode, setMode] = useState<"pin" | "admin" | "newpin">("pin");
  const [notice, setNotice] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const heading =
    mode === "admin" ? "Admin reset" : mode === "newpin" ? `New PIN for ${forName ?? "this person"}` : title ?? (adminOnly ? "Admin PIN" : forName ? `${forName}'s PIN` : "Enter your PIN");
  const sub =
    mode === "admin"
      ? `Enter the admin PIN to reset ${forName ?? "this person"}'s PIN.`
      : mode === "newpin"
        ? "Type the new PIN twice. Give it only to this person."
        : adminOnly
          ? "Only the admin can open this."
          : forName
            ? `Enter ${forName}'s PIN (or the admin PIN).`
            : "Enter your PIN to continue.";

  return (
    <div className="card mx-auto w-full max-w-sm p-6">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/30">
        <Lock size={24} />
      </div>
      <h2 className="mt-4 text-center text-xl font-bold">{heading}</h2>
      <p className="mt-1 text-center text-sm text-muted">{sub}</p>
      {notice && <p className="mt-3 rounded-xl bg-emerald-500/10 px-3 py-2 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">{notice}</p>}

      <div className="mt-5">
        {mode === "pin" && (
          <PinPad
            key="pin"
            forPersonId={forPersonId}
            forName={forName}
            adminOnly={adminOnly}
            onLogin={async (r, name) => {
              await login(r, name);
              onDone?.();
            }}
          />
        )}
        {mode === "admin" && (
          <PinPad
            key="admin"
            adminOnly
            onLogin={() => {
              setErr("");
              setMode("newpin");
            }}
          />
        )}
        {mode === "newpin" && forPersonId && (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr("");
              if (!/^\d{4,8}$/.test(p1)) return setErr("PIN must be 4 to 8 numbers.");
              if (p1 !== p2) return setErr("The two PINs are different.");
              setBusy(true);
              try {
                const { pinInUse, setMemberPin } = await import("@/lib/lock");
                if (await pinInUse(p1, forPersonId)) return setErr("This PIN is already used. Choose another one.");
                await setMemberPin(forPersonId, p1);
                await refresh();
                setP1("");
                setP2("");
                setNotice(`New PIN saved. ${forName ?? "They"} can now open the card with it.`);
                setMode("pin");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input className="input text-center text-2xl tracking-[0.5em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} autoFocus placeholder="New PIN" aria-label="New PIN" value={p1} onChange={(e) => setP1(e.target.value.replace(/\D/g, ""))} />
            <input className="input text-center text-2xl tracking-[0.5em]" type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="Again" aria-label="New PIN again" value={p2} onChange={(e) => setP2(e.target.value.replace(/\D/g, ""))} />
            {err && <p className="text-center text-sm font-medium text-rose-600">{err}</p>}
            <button className="btn-primary w-full py-3" disabled={busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : null} Save new PIN</button>
          </form>
        )}
      </div>

      {(adminOnly || mode === "admin") && (
        <div className="mt-4">
          <ForgotAdminPin />
        </div>
      )}
      {forPersonId && !adminOnly && (
        <div className="mt-4 text-center">
          {mode === "pin" ? (
            <button className="text-xs font-semibold text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-300" onClick={() => { setNotice(""); setMode("admin"); }}>
              Forgot PIN? Admin reset
            </button>
          ) : (
            <button className="text-xs text-muted underline-offset-2 hover:underline" onClick={() => setMode("pin")}>
              Back
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Admin-only pages (Admin panel, Settings). */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin, status, lockNow } = useAdmin();
  if (isAdmin) return <>{children}</>;
  if (status === "member") {
    return (
      <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500"><Lock size={28} /></div>
        <h2 className="text-lg font-semibold">Admin only</h2>
        <p className="mt-1 text-sm text-muted">Only the admin can open this page.</p>
        <button className="btn-primary mt-5" onClick={lockNow}>Log out</button>
      </div>
    );
  }
  return <PinGate adminOnly />;
}

/** Shown when the current login may not see this person (or nobody is logged in). */
export function NotYours({ personId, personName }: { personId?: string; personName?: string } = {}) {
  const { status, lockNow } = useAdmin();
  if (status === "locked") return <PinGate forPersonId={personId} forName={personName} />;
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/10 text-rose-500"><Lock size={28} /></div>
      <h2 className="text-lg font-semibold">Private</h2>
      <p className="mt-1 text-sm text-muted">This belongs to someone else. You can only see your own documents.</p>
      <div className="mt-5 flex gap-2">
        <a href="/vault" className="btn-primary">My documents</a>
        <button className="btn-ghost" onClick={lockNow}>Switch user</button>
      </div>
    </div>
  );
}

/** Pages that need any login (e.g. Scan). */
export function RequireLogin({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
