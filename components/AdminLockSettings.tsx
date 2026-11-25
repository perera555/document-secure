"use client";

import { useState } from "react";
import { Crown, KeyRound, LogOut, Timer, Trash2, UserPlus, Users } from "lucide-react";
import { removeAdmin, updateLockOptions, upsertAdmin } from "@/lib/lock";
import { useAdmin } from "./AdminLock";
import { toast } from "./Toast";

const AUTO_LOCK = [
  { v: 1, label: "1 minute" },
  { v: 5, label: "5 minutes" },
  { v: 15, label: "15 minutes" },
  { v: 30, label: "30 minutes" },
  { v: 60, label: "1 hour" },
  { v: 0, label: "Never (only when I log out)" },
];

const pinInput = "input text-center text-xl tracking-[0.4em]";

/** Admin page: list, add and remove admins (name + PIN), and lock options. */
export function AdminLockSettings() {
  const { config, refresh, lockNow, adminName } = useAdmin();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const admins = config?.admins ?? [];

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Enter a name.");
    if (!/^\d{4,8}$/.test(pin)) return setError("PIN must be 4 to 8 numbers.");
    if (pin !== pin2) return setError("The two PINs are different.");
    setBusy(true);
    try {
      await upsertAdmin(`a-${Date.now().toString(36)}`, name, pin);
      await refresh();
      toast(`${name.trim()} can now log in with their PIN`);
      setName("");
      setPin("");
      setPin2("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="admin" className="card animate-pop scroll-mt-24 overflow-hidden">
      <div className="flex items-start gap-4 p-5 pb-0">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-slate-700 to-indigo-700 text-white shadow-lg">
          <Users size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold">Admins</h2>
          <p className="mt-0.5 text-sm text-muted">People who can log in with a PIN to scan, add, update and delete.</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {admins.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`grid h-10 w-10 place-items-center rounded-xl text-sm font-bold text-white ${
                  a.id === "main" ? "bg-linear-to-br from-amber-500 to-orange-600" : "bg-linear-to-br from-indigo-500 to-sky-500"
                }`}
              >
                {a.id === "main" ? <Crown size={18} /> : a.name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {a.name} {a.name === adminName && <span className="text-xs font-normal text-emerald-600">(you)</span>}
                </p>
                <p className="text-xs text-muted">{a.id === "main" ? "Main admin · PIN kept on the server" : "PIN login · this device"}</p>
              </div>
              {a.id !== "main" && (
                <button
                  className="rounded-lg p-2 text-muted hover:bg-rose-500/10 hover:text-rose-600"
                  aria-label={`Remove ${a.name}`}
                  title="Remove admin"
                  onClick={async () => {
                    if (!confirm(`Remove ${a.name} as admin?`)) return;
                    await removeAdmin(a.id);
                    await refresh();
                    toast(`${a.name} removed`);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
          {admins.length === 0 && <li className="px-4 py-3 text-sm text-muted">No admins on this device yet.</li>}
        </ul>

        {adding ? (
          <form onSubmit={add} className="grid gap-3 rounded-2xl border border-indigo-400/40 bg-indigo-500/5 p-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="ad-name">Name</label>
              <input id="ad-name" className="input" autoFocus placeholder="e.g. Shanthi Mallika" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="ad-pin">PIN (4–8 numbers)</label>
              <input id="ad-pin" className={pinInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div>
              <label className="label" htmlFor="ad-pin2">PIN again</label>
              <input id="ad-pin2" className={pinInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} placeholder="••••" value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn-primary flex-1" disabled={busy}><KeyRound size={16} /> Add</button>
              <button type="button" className="btn-ghost" onClick={() => { setAdding(false); setError(""); }}>Cancel</button>
            </div>
            {error && <p className="text-sm font-medium text-rose-600 sm:col-span-3">{error}</p>}
          </form>
        ) : (
          <button className="btn-ghost" onClick={() => setAdding(true)}><UserPlus size={16} /> Add admin</button>
        )}

        {config && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="rounded-2xl border border-border p-4">
              <span className="flex items-center gap-2 text-sm font-semibold"><Timer size={16} /> Log out automatically after</span>
              <select
                className="input mt-2"
                value={config.autoLockMinutes}
                onChange={async (e) => {
                  await updateLockOptions({ autoLockMinutes: Number(e.target.value) });
                  await refresh();
                }}
              >
                {AUTO_LOCK.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
              <span className="mt-1 block text-xs text-muted">of not using the app</span>
            </label>
          </div>
        )}

        <button className="btn-primary" onClick={lockNow}><LogOut size={16} /> Log out now</button>

        <p className="text-xs text-muted">
          The main admin PIN is kept secret on the server. Other admins are saved on this device. The lock protects the app; documents stored in the browser are not encrypted by it.
        </p>
      </div>
    </section>
  );
}
