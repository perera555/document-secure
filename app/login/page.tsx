"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { getLockConfig, readSession, writeSession, type LockConfig } from "@/lib/lock";
import { LockScreen } from "@/components/AdminLock";

/** Admin login: PIN keypad only. */
export default function LoginPage() {
  const router = useRouter();
  const [config, setConfig] = useState<LockConfig | null | undefined>(undefined);
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    getLockConfig().then(setConfig);
    const s = readSession();
    if (s?.role === "admin") setSignedIn(s.name ?? "Admin");
  }, []);

  const back = (
    <Link href="/" className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white">
      <ArrowLeft size={16} /> Home
    </Link>
  );

  if (config === undefined) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#05060f]" style={{ backgroundColor: "#05060f" }}>
        <Loader2 className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="relative grid min-h-dvh place-items-center bg-[#05060f] px-4" style={{ backgroundColor: "#05060f" }}>
        {back}
        <div className="animate-pop w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-7 text-center text-white shadow-2xl backdrop-blur-xl">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 shadow-lg">
            <ShieldCheck size={28} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">You are logged in</h1>
          <p className="mt-1 text-sm text-slate-300">Admin: {signedIn}</p>
          <button className="btn-primary mt-5 w-full py-3" onClick={() => router.push("/vault")}>Open DocSecure</button>
          <button
            className="mt-2 w-full rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/10"
            onClick={() => {
              writeSession(null);
              setSignedIn(null);
            }}
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {back}
      <LockScreen
        config={config}
        title="Log in"
        onLogin={(r, name) => {
          if (r.role === "admin") {
            writeSession({ role: "admin", last: Date.now(), name: r.name, adminId: r.id });
            router.push("/admin"); // admin PIN → straight to the Admin dashboard
          } else {
            writeSession({ role: "member", last: Date.now(), personId: r.personId, name });
            router.push(`/vault/${r.personId}`);
          }
        }}
      />
    </div>
  );
}
