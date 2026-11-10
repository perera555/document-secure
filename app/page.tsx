import Link from "next/link";
import { ArrowRight, Camera, FolderTree, Printer, ScanText, ShieldCheck, Sparkles, WifiOff, Users, Bell } from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { CATEGORIES } from "@/lib/categories";

const FEATURES = [
  { icon: Camera, title: "Scan with your phone", text: "Use the camera at full resolution. Auto-enhance makes text sharp and the paper white.", color: "from-indigo-500 to-violet-600" },
  { icon: Printer, title: "Printer & scanner", text: "Pick your scanner's save folder once and every new scan is imported automatically.", color: "from-amber-500 to-orange-600" },
  { icon: ScanText, title: "Reads every detail", text: "Names, NIC, passport and certificate numbers, dates, hospital and more are read for you.", color: "from-sky-500 to-cyan-600" },
  { icon: FolderTree, title: "Filed per person", text: "“P R Perera” › Medical, Passport, ID… The owner is matched by name or ID number.", color: "from-emerald-500 to-teal-600" },
  { icon: Bell, title: "Expiry reminders", text: "Passports, licences and insurance that expire soon are highlighted.", color: "from-rose-500 to-pink-600" },
  { icon: WifiOff, title: "Private & offline", text: "Documents stay on your device. Works without internet once installed.", color: "from-slate-600 to-slate-800" },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-10 w-10" />
        <span className="text-xl font-bold tracking-tight">
          Doc<span className="bg-linear-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">Secure</span>
        </span>
        <Link href="/vault" className="btn-ghost ml-auto">
          Open app <ArrowRight size={16} />
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 lg:grid-cols-2 lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
              <Sparkles size={14} /> Smart family document vault
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Scan once.
              <br />
              <span className="bg-linear-to-r from-indigo-600 via-violet-500 to-sky-500 bg-clip-text text-transparent">Always organised.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Scan medical reports, passports, ID cards and certificates with your phone or scanner. DocSecure reads every detail, finds whose document it is and saves it in that person&apos;s folder.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <InstallButton />
              <Link href="/vault" className="btn-ghost px-6 py-3.5 text-base">
                Use in browser <ArrowRight size={18} />
              </Link>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>🪟 Windows</span><span>🍎 Mac</span><span>🤖 Android</span><span>📱 iPhone & iPad</span><span>🐧 Linux</span>
            </p>
          </div>

          {/* Illustration: person card with folders */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-linear-to-br from-indigo-500/30 to-sky-400/30 blur-3xl" />
            <div className="card relative overflow-hidden rounded-3xl shadow-2xl">
              <div className="h-24 bg-linear-to-br from-indigo-500 to-violet-600" />
              <div className="px-6 pb-6">
                <div className="-mt-10 flex items-end gap-4">
                  <div className="grid h-20 w-20 place-items-center rounded-2xl bg-linear-to-br from-sky-500 to-blue-600 text-2xl font-bold text-white ring-4 ring-card">PRP</div>
                  <div className="pb-1">
                    <p className="text-lg font-bold">P R Perera</p>
                    <p className="text-xs text-muted">Father · NIC 195312345678</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2.5">
                  {CATEGORIES.slice(0, 6).map((c, i) => (
                    <div key={c.id} className={`rounded-xl bg-linear-to-br ${c.gradient} p-3 text-white shadow-md`} style={{ opacity: i < 4 ? 1 : 0.55 }}>
                      <div className="text-xl">{c.emoji}</div>
                      <p className="mt-1.5 text-[11px] font-semibold leading-tight">{c.label}</p>
                      <p className="text-[10px] text-white/75">{[5, 1, 2, 1, 0, 0][i] || "–"} docs</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card animate-pop absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl p-3 shadow-xl sm:-left-10">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600"><ShieldCheck size={20} /></span>
              <div>
                <p className="text-xs font-semibold">Blood report filed</p>
                <p className="text-[11px] text-muted">P R Perera › Medical</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-center text-3xl font-bold tracking-tight">Everything for your family&apos;s papers</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition hover:-translate-y-0.5 hover:shadow-xl">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-linear-to-br ${f.color} text-white shadow-lg`}><f.icon size={22} /></span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: 1, t: "Add people", d: "Create a card for each family member with photo, ID, birth & marriage certificate numbers, mobile and email.", icon: Users },
              { n: 2, t: "Scan", d: "Photograph or scan any document. Several pages become one document.", icon: Camera },
              { n: 3, t: "Done", d: "It's read, matched to the right person and saved into the right folder.", icon: FolderTree },
            ].map((s) => (
              <div key={s.n} className="card relative overflow-hidden p-6">
                <span className="absolute -right-2 -top-6 text-8xl font-black text-indigo-500/10">{s.n}</span>
                <s.icon className="text-indigo-500" />
                <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 to-sky-500 p-8 text-center text-white shadow-2xl sm:p-12">
            <div className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-3xl font-bold">Install DocSecure on this device</h2>
            <p className="relative mx-auto mt-2 max-w-lg text-white/85">Free. Opens in its own window like a normal app, from your home screen, Start menu or Dock.</p>
            <div className="relative mt-6 flex justify-center">
              <InstallButton className="bg-none! bg-white! text-indigo-700! shadow-xl" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">DocSecure · your documents stay on your device</footer>
    </div>
  );
}
