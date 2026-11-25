"use client";

import { KeyRound, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { AdminOnly, useAdmin } from "@/components/AdminLock";
import { AdminLockSettings } from "@/components/AdminLockSettings";
import { AdminDashboard } from "@/components/AdminDashboard";
import { DeviceTransfer } from "@/components/DeviceTransfer";

export default function AdminPage() {
  return (
    <AdminOnly>
      <AdminInner />
    </AdminOnly>
  );
}

function AdminInner() {
  const { config, status } = useAdmin();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-indigo-900 to-violet-800 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-400/25 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15 backdrop-blur">
            {config ? <ShieldCheck size={28} /> : <Lock size={28} />}
          </span>
          <div>
            <p className="text-sm text-white/70">DocSecure</p>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
            <p className="mt-1 text-sm text-white/80">
              Dashboard · manage people, documents and admins
            </p>
          </div>
        </div>
      </section>

      <AdminDashboard />

      <DeviceTransfer />

      <AdminLockSettings />

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: KeyRound, t: "PIN to open", d: "The app asks for the admin PIN before showing anyone's documents." },
          { icon: ShieldCheck, t: "Only admin changes", d: "Scanning, adding, editing and deleting need the admin." },
          { icon: Smartphone, t: "Each device", d: "Set the PIN once on every phone and computer you use." },
        ].map((x) => (
          <div key={x.t} className="card p-4">
            <x.icon className="text-indigo-500" size={22} />
            <p className="mt-2 font-semibold">{x.t}</p>
            <p className="mt-1 text-xs text-muted">{x.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
