"use client";

/**
 * Admin PIN lock (per device).
 *
 * - The MAIN admin PIN lives on the server (Vercel env ADMIN_PIN) and is checked by /api/admin/login.
 *   After the first successful login a device keeps a salted hash of it, so it can unlock offline.
 * - More admins (name + PIN) can be added on the Admin page; they are stored on this device as hashes.
 * - PINs are never stored in plain text.
 *
 * Note: this controls who can use the app on this device. Documents in browser storage
 * are not encrypted by it.
 */
import { getSetting, setSetting, db } from "./db";

export interface AdminEntry {
  id: string; // "main" for the server admin
  name: string;
  salt: string;
  hash: string;
  isPin: boolean;
  createdAt: number;
}

export interface LockConfig {
  admins: AdminEntry[];
  autoLockMinutes: number; // 0 = never
  allowViewOnly: boolean;
  /** True when every admin uses a numeric PIN: the lock screen shows a keypad. */
  isPin?: boolean;
  /** Name shown on the lock screen. */
  adminName?: string;
}

const KEY = "adminLock";
const ITERATIONS = 210_000;

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const randomB64 = (n: number) => b64(crypto.getRandomValues(new Uint8Array(n)));

async function derive(secret: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(atob(salt), (c) => c.charCodeAt(0)), iterations: ITERATIONS },
    key,
    256,
  );
  return b64(bits);
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type Stored = Omit<LockConfig, "isPin" | "adminName"> & {
  // older single-password format
  salt?: string;
  hash?: string;
};

function withDerived(c: Omit<LockConfig, "isPin" | "adminName">): LockConfig {
  return {
    ...c,
    isPin: c.admins.length > 0 && c.admins.every((a) => a.isPin),
    adminName: c.admins.length === 1 ? c.admins[0].name : undefined,
  };
}

export async function getLockConfig(): Promise<LockConfig | null> {
  const raw = (await getSetting<Stored | null>(KEY, null)) ?? null;
  if (!raw) return null;
  // Upgrade the earlier single-password format.
  if (!raw.admins && raw.salt && raw.hash) {
    raw.admins = [{ id: "legacy", name: (raw as { adminName?: string }).adminName ?? "Admin", salt: raw.salt, hash: raw.hash, isPin: Boolean((raw as { isPin?: boolean }).isPin), createdAt: Date.now() }];
  }
  if (!raw.admins?.length) return null;
  return withDerived({ admins: raw.admins, autoLockMinutes: raw.autoLockMinutes ?? 5, allowViewOnly: raw.allowViewOnly ?? false });
}

async function save(c: Omit<LockConfig, "isPin" | "adminName">) {
  await setSetting(KEY, { admins: c.admins, autoLockMinutes: c.autoLockMinutes, allowViewOnly: c.allowViewOnly });
}

async function makeEntry(id: string, name: string, pin: string): Promise<AdminEntry> {
  const salt = randomB64(16);
  return { id, name: name.trim() || "Admin", salt, hash: await derive(pin, salt), isPin: /^\d+$/.test(pin), createdAt: Date.now() };
}

/** Adds an admin (or replaces the one with the same id). */
export async function upsertAdmin(id: string, name: string, pin: string) {
  const c = (await getLockConfig()) ?? { admins: [], autoLockMinutes: 5, allowViewOnly: false };
  const entry = await makeEntry(id, name, pin);
  const admins = [...c.admins.filter((a) => a.id !== id), entry].sort((a, b) => (a.id === "main" ? -1 : b.id === "main" ? 1 : a.createdAt - b.createdAt));
  await save({ ...c, admins });
  return entry;
}

export async function removeAdmin(id: string) {
  const c = await getLockConfig();
  if (!c) return;
  await save({ ...c, admins: c.admins.filter((a) => a.id !== id) });
}

/** Returns the admin whose PIN matches, or null. */
export async function findAdminByPin(pin: string): Promise<AdminEntry | null> {
  const c = await getLockConfig();
  if (!c) return null;
  for (const a of c.admins) if (same(await derive(pin, a.salt), a.hash)) return a;
  return null;
}

/** Checks the main admin PIN on the server; on success remembers it on this device. */
export async function serverLogin(pin: string): Promise<{ ok: boolean; name?: string; error?: string }> {
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const json = (await res.json()) as { ok?: boolean; name?: string; error?: string };
    if (res.ok && json.ok) {
      await upsertAdmin("main", json.name ?? "Admin", pin);
      return { ok: true, name: json.name };
    }
    return { ok: false, error: json.error };
  } catch {
    return { ok: false, error: "offline" };
  }
}

/** Device check first (works offline), then the server's main admin PIN. */
export async function loginWithPin(pin: string): Promise<{ ok: boolean; name?: string; id?: string; error?: string }> {
  const local = await findAdminByPin(pin);
  if (local) return { ok: true, name: local.name, id: local.id };
  const remote = await serverLogin(pin);
  return remote.ok ? { ok: true, name: remote.name, id: "main" } : { ok: false, error: remote.error };
}

export async function updateLockOptions(patch: Partial<Pick<LockConfig, "autoLockMinutes" | "allowViewOnly">>) {
  const c = await getLockConfig();
  if (c) await save({ ...c, ...patch });
}

export async function removeLock() {
  await db.settings.delete(KEY);
}

/* ---- Unlock session (this browser tab; survives reloads, not closing the browser) ---- */

const SESSION = "docsecure-session";
export type Session = { role: "admin" | "viewer"; last: number; adminId?: string; name?: string };

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
export function writeSession(s: Session | null) {
  try {
    if (s) sessionStorage.setItem(SESSION, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION);
  } catch {}
}

/** Brute-force slow-down on this device: after 5 wrong tries, wait 30 s (doubling). */
const FAILS = "docsecure-fails";
export function lockoutRemainingMs(): number {
  try {
    const f = JSON.parse(localStorage.getItem(FAILS) ?? "null") as { n: number; until: number } | null;
    return f ? Math.max(0, f.until - Date.now()) : 0;
  } catch {
    return 0;
  }
}
export function recordFailure() {
  try {
    const f = (JSON.parse(localStorage.getItem(FAILS) ?? "null") as { n: number; until: number } | null) ?? { n: 0, until: 0 };
    f.n += 1;
    if (f.n >= 5) f.until = Date.now() + 30_000 * 2 ** Math.min(f.n - 5, 5);
    localStorage.setItem(FAILS, JSON.stringify(f));
  } catch {}
}
export function clearFailures() {
  try {
    localStorage.removeItem(FAILS);
  } catch {}
}
