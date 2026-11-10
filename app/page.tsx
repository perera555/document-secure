import Link from "next/link";
import {
  ArrowRight, BellRing, Camera, Check, FolderTree, Lock, Printer, ScanText, ShieldCheck, Sparkles, WifiOff, Smartphone, Monitor, Laptop, Tablet,
} from "lucide-react";
import { InstallButton } from "@/components/InstallButton";
import { Tilt3D } from "@/components/Tilt3D";
import { CATEGORIES } from "@/lib/categories";

/* ---------- Decorative pieces ---------- */

function IdCard({
  name, rel, nic, initials, gradient, className = "", style,
}: { name: string; rel: string; nic: string; initials: string; gradient: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute w-[300px] overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-2xl shadow-black/60 backdrop-blur sm:w-[340px] ${className}`}
      style={style}
    >
      <div className={`flex items-center gap-2 bg-linear-to-r ${gradient} px-4 py-2 text-white`}>
        <span className="text-[9px] font-bold uppercase tracking-[0.25em]">Family ID Card</span>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold">{rel}</span>
      </div>
      <div
        className="relative flex gap-3 p-4 text-white"
        style={{ backgroundImage: "repeating-linear-gradient(115deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 12px)" }}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={`grid h-20 w-20 place-items-center rounded-xl bg-linear-to-br ${gradient} text-2xl font-black shadow-lg`}>{initials}</div>
          <div className="h-5 w-7 rounded-md bg-linear-to-br from-amber-200 via-yellow-400 to-amber-500" />
        </div>
        <div className="min-w-0 flex-1 font-mono text-[11px]">
          <p className="text-[8px] uppercase tracking-widest text-white/70">Name</p>
          <p className="truncate font-sans text-base font-extrabold uppercase">{name}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1">
            <div><p className="text-[8px] uppercase tracking-widest text-white/70">ID / NIC</p><p>{nic}</p></div>
            <div><p className="text-[8px] uppercase tracking-widest text-white/70">Blood</p><p>O+</p></div>
            <div><p className="text-[8px] uppercase tracking-widest text-white/70">Docs</p><p>12</p></div>
            <div><p className="text-[8px] uppercase tracking-widest text-white/70">Folders</p><p>6</p></div>
          </div>
        </div>
        <div
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full opacity-70"
          style={{ background: "conic-gradient(#f0abfc, #93c5fd, #86efac, #fde68a, #f0abfc)", maskImage: "radial-gradient(circle, #000 55%, transparent 56%, transparent 62%, #000 63%)" }}
        />
      </div>
      <div className="bg-white/5 px-4 py-1 font-mono text-[9px] tracking-[0.15em] text-white/65">IDLKA{name.toUpperCase().replace(/\s/g, "<")}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
    </div>
  );
}

function Chip({ emoji, title, sub, className }: { emoji: string; title: string; sub: string; className: string }) {
  return (
    <div className={`absolute flex items-center gap-2.5 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 text-white shadow-xl backdrop-blur-md ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-lg">{emoji}</span>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[10px] text-white/80">{sub}</p>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-base text-slate-300 sm:text-lg">{text}</p>}
    </div>
  );
}

const DEVICES = [
  { icon: Monitor, name: "Windows", how: "Chrome or Edge → Install button" },
  { icon: Laptop, name: "Mac", how: "Safari → File → Add to Dock" },
  { icon: Smartphone, name: "Android", how: "Chrome → ⋮ → Install app" },
  { icon: Tablet, name: "iPhone & iPad", how: "Safari → Share → Add to Home Screen" },
];

const FAQ = [
  { q: "Where are my documents stored?", a: "On your own phone or computer, inside the app. Nothing is uploaded to a server unless you turn on AI reading, and even then pages are only sent while being read." },
  { q: "Can I scan with my printer's scanner?", a: "Yes. Choose the folder your scanner app saves into once (Chrome or Edge on a computer). Every new scan is imported automatically. You can also upload images or PDFs." },
  { q: "How does it know whose document it is?", a: "It reads the name and ID numbers on the page and matches them to your people, even with initials, e.g. “P R Perera” = “Pathirage Ranjith Perera”." },
  { q: "Can I get my files out?", a: "Any time. Download one document, or a ZIP of everything saved under each person's name and folder, plus a details file." },
  { q: "Does it work without internet?", a: "Yes. Once installed it opens offline, and the built-in text recognition works offline too." },
];

export default function Home() {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#05060f] text-slate-200">
      {/* Aurora background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora absolute -left-40 -top-40 h-[620px] w-[620px] rounded-full bg-indigo-600/35 blur-[120px]" />
        <div className="aurora-slow absolute -right-40 top-20 h-[560px] w-[560px] rounded-full bg-sky-500/25 blur-[120px]" />
        <div className="aurora absolute left-1/3 top-[70vh] h-[520px] w-[520px] rounded-full bg-fuchsia-600/20 blur-[130px]" />
        <div className="grid-bg absolute inset-0" />
      </div>

      {/* Nav */}
      <header className="relative z-20 mx-auto mt-4 flex max-w-6xl items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl sm:mx-4 lg:mx-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-9 w-9" />
        <span className="text-lg font-bold tracking-tight text-white">
          Doc<span className="bg-linear-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">Secure</span>
        </span>
        <nav className="ml-8 hidden gap-6 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#install" className="hover:text-white">Install</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <Link href="/vault" className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200">
          Open app <ArrowRight size={16} />
        </Link>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-sky-200 backdrop-blur">
            <Sparkles size={14} /> Scan · Read · File, automatically
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-7xl">
            Every family document.{" "}
            <span className="shimmer-text bg-linear-to-r from-indigo-400 via-sky-300 via-50% to-fuchsia-400 bg-clip-text text-transparent">
              One secure place.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Scan medical reports, passports, ID cards and certificates with your phone or scanner. DocSecure reads every detail,
            finds whose document it is, and files it under their name.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <InstallButton />
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Open in browser <ArrowRight size={18} />
            </Link>
          </div>
          <p className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-slate-400">
            {["Free", "Works offline", "Windows · Mac · Android · iPhone"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> {t}</span>
            ))}
          </p>

          {/* 3D card stack */}
          <div className="relative mx-auto mt-16 h-[360px] max-w-3xl [perspective:1400px] sm:h-[420px]">
            <div className="card-stack absolute inset-0">
              <IdCard name="K M Perera" rel="Mother" nic="195867812345" initials="KMP" gradient="from-sky-500 to-blue-600"
                className="left-1/2 top-6 -translate-x-[85%] opacity-80" style={{ transform: "translateZ(-80px) rotate(-8deg)" }} />
              <IdCard name="Nimal Perera" rel="Self" nic="198812345678" initials="NP" gradient="from-emerald-500 to-teal-600"
                className="left-1/2 top-10 -translate-x-[15%] opacity-80" style={{ transform: "translateZ(-60px) rotate(7deg)" }} />
              <IdCard name="P R Perera" rel="Father" nic="195312345678" initials="PRP" gradient="from-indigo-500 to-violet-600"
                className="left-1/2 top-24 -translate-x-1/2" style={{ transform: "translateZ(40px)" }} />
            </div>
            <Chip emoji="🩺" title="Blood report filed" sub="P R Perera › Medical" className="float-y left-0 top-4 hidden sm:flex" />
            <Chip emoji="🛂" title="Passport expires soon" sub="Renew before Dec 2026" className="float-y-delay right-0 top-16 hidden sm:flex" />
            <Chip emoji="🪪" title="NIC 195312345678" sub="Detected automatically" className="float-y bottom-2 left-6 hidden md:flex" />
            <Chip emoji="📁" title="17 smart folders" sub="Medical, Passport, ID…" className="float-y-delay bottom-6 right-4 hidden md:flex" />
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["17", "smart folders"],
              ["3600px", "print-quality scans"],
              ["100%", "on your device"],
              ["0", "ads or tracking"],
            ].map(([n, l]) => (
              <div key={l} className="bg-[#080a18] p-6 text-center">
                <p className="bg-linear-to-r from-white to-slate-400 bg-clip-text text-3xl font-black text-transparent sm:text-4xl">{n}</p>
                <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Bento features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-28">
          <SectionTitle eyebrow="Features" title={<>Built for real family paperwork</>} text="From a hospital report to a 20-year-old deed: scan it once and always find it again." />
          <div className="mt-14 grid gap-4 md:grid-cols-6">
            {/* Scan tile */}
            <Tilt3D className="md:col-span-4" max={6}>
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-indigo-500/15 to-transparent p-6 h-full">
              <Camera className="text-indigo-300" />
              <h3 className="mt-4 text-xl font-bold text-white">Scan with phone, webcam or printer</h3>
              <p className="mt-2 max-w-md text-sm text-slate-300">Full-resolution camera capture, auto-enhance that turns paper white and text sharp, and automatic import from your scanner&apos;s folder.</p>
              <div className="relative mx-auto mt-6 h-44 max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white p-4">
                <div className="h-3 w-1/2 rounded bg-slate-800" />
                {[80, 92, 70, 88, 60, 84, 76].map((w, i) => (
                  <div key={i} className="mt-2.5 h-2 rounded bg-slate-300" style={{ width: `${w}%` }} />
                ))}
                <div className="scanline absolute inset-x-0 h-8 bg-linear-to-b from-transparent via-sky-400/50 to-transparent">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-sky-400 shadow-[0_0_16px_4px_rgb(56_189_248/0.7)]" />
                </div>
              </div>
            </div>
            </Tilt3D>
            {/* Printer */}
            <Tilt3D className="md:col-span-2" max={6}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-amber-500/15 to-transparent p-6 h-full">
              <Printer className="text-amber-300" />
              <h3 className="mt-4 text-xl font-bold text-white">Printer-scanner auto-import</h3>
              <p className="mt-2 text-sm text-slate-300">Pick the scan folder once. New scans appear in the app by themselves.</p>
              <div className="mt-6 space-y-2">
                {["scan_0012.jpg", "scan_0013.pdf", "scan_0014.jpg"].map((f, i) => (
                  <div key={f} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300" style={{ opacity: 1 - i * 0.25 }}>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" /> {f} <span className="ml-auto text-emerald-300">imported</span>
                  </div>
                ))}
              </div>
            </div>
            </Tilt3D>
            {/* Auto read */}
            <Tilt3D className="md:col-span-3" max={6}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-sky-500/15 to-transparent p-6 h-full">
              <ScanText className="text-sky-300" />
              <h3 className="mt-4 text-xl font-bold text-white">Reads every detail for you</h3>
              <p className="mt-2 text-sm text-slate-300">Names, NIC, passport and certificate numbers, dates, hospital and more, filled in automatically.</p>
              <div className="mt-5 space-y-2 font-mono text-xs">
                {[["Owner", "P R Perera"], ["NIC", "195312345678"], ["Hospital", "Asiri Central"], ["Report date", "2026-11-10"]].map(([k, v], i) => (
                  <div key={k} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                    <span className="text-slate-400">{k}</span>
                    <span className="type-in text-sky-200" style={{ animationDelay: `${i * 0.35}s` }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            </Tilt3D>
            {/* Folders */}
            <Tilt3D className="md:col-span-3" max={6}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-fuchsia-500/15 to-transparent p-6 h-full">
              <FolderTree className="text-fuchsia-300" />
              <h3 className="mt-4 text-xl font-bold text-white">Filed under each person&apos;s name</h3>
              <p className="mt-2 text-sm text-slate-300">Every person gets a 3D ID card and their own folders. Matching works with initials and ID numbers.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {CATEGORIES.slice(0, 10).map((c) => (
                  <span key={c.id} className={`rounded-xl bg-linear-to-br ${c.gradient} px-3 py-1.5 text-xs font-semibold text-white shadow-lg`}>
                    {c.emoji} {c.label}
                  </span>
                ))}
              </div>
            </div>
            </Tilt3D>
            {/* small tiles */}
            {[
              { icon: BellRing, color: "text-rose-300 from-rose-500/15", t: "Expiry reminders", d: "Passports, licences and insurance close to expiry are highlighted." },
              { icon: Lock, color: "text-emerald-300 from-emerald-500/15", t: "Private by design", d: "Documents stay on your device. Download a ZIP or backup any time." },
              { icon: WifiOff, color: "text-slate-300 from-slate-400/15", t: "Works offline", d: "Installed app opens and reads text without internet." },
            ].map((f) => (
              <Tilt3D key={f.t} className="md:col-span-2" max={8}><div className={`h-full rounded-3xl border border-white/10 bg-linear-to-br ${f.color.split(" ")[1]} to-transparent p-6`}>
                <f.icon className={f.color.split(" ")[0]} />
                <h3 className="mt-4 text-lg font-bold text-white">{f.t}</h3>
                <p className="mt-1.5 text-sm text-slate-300">{f.d}</p>
              </div></Tilt3D>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-28">
          <SectionTitle eyebrow="How it works" title="Three steps. That's it." />
          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-10 hidden h-px bg-linear-to-r from-indigo-500 via-sky-400 to-fuchsia-500 md:block" />
            {[
              { n: "01", t: "Add your family", d: "Create a card for each person with photo, NIC, birth & marriage certificate numbers, mobile and email." },
              { n: "02", t: "Scan anything", d: "Phone camera, webcam or printer-scanner. Several pages become one document." },
              { n: "03", t: "Find it instantly", d: "It's read, matched to the right person, filed in the right folder, and searchable." },
            ].map((s) => (
              <div key={s.n} className="relative text-center">
                <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-white/15 bg-[#0b0e22] text-2xl font-black text-white shadow-[0_0_40px_-8px_rgb(99_102_241/0.7)]">
                  {s.n}
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{s.t}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm text-slate-300">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Install */}
        <section id="install" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-28">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-linear-to-br from-indigo-600/30 via-[#0b0e22] to-sky-600/20 p-8 sm:p-12">
            <div className="aurora absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-300">Install</p>
                <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-5xl">On every screen you own.</h2>
                <p className="mt-4 text-slate-300">One app for computer, phone and tablet. It gets its own icon and window, and opens offline.</p>
                <div className="mt-8">
                  <InstallButton />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DEVICES.map((d) => (
                  <Tilt3D key={d.name} max={14}><div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:bg-white/10">
                    <d.icon className="text-sky-300" size={28} />
                    <p className="mt-3 font-bold text-white">{d.name}</p>
                    <p className="mt-1 text-xs text-slate-300">{d.how}</p>
                  </div></Tilt3D>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-28">
          <SectionTitle eyebrow="FAQ" title="Questions" />
          <div className="mt-10 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                  {f.q}
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-300">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-r from-indigo-600 via-violet-600 to-sky-500 p-10 text-center shadow-[0_30px_120px_-30px_rgb(99_102_241/0.8)] sm:p-16">
            <div className="grid-bg absolute inset-0 opacity-60" />
            <ShieldCheck className="relative mx-auto text-white" size={44} />
            <h2 className="relative mt-4 text-3xl font-black text-white sm:text-5xl">Start your family vault today</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-white/80">Free, private, and ready in seconds.</p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <InstallButton className="bg-none! bg-white! text-indigo-700! shadow-xl" />
              <Link href="/vault" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
                Open in browser <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-slate-400">
        © {2026} DocSecure · Your documents stay on your device
      </footer>
    </div>
  );
}
