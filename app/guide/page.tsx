import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Guide" };

type Step = { t: string; d: string };

const USER: { title: string; steps: Step[] }[] = [
  {
    title: "Open the app",
    steps: [
      { t: "Open DocSecure", d: "Go to document-secure.vercel.app and press “Go to My People”, or open the installed app from your home screen / Start menu." },
      { t: "Install it (once)", d: "On the home page press “Install”. On iPhone: Safari › Share › Add to Home Screen. On Android/Windows/Mac: the Install button or the install icon in the address bar." },
    ],
  },
  {
    title: "Find a document",
    steps: [
      { t: "People page", d: "Every family member has a 3D ID card with photo and details. Tap ↻ on a card to flip it and see all details." },
      { t: "Open a person", d: "Tap “Open documents”. All their documents are shown, grouped by folder (Medical, Passport, National ID…). Use the tabs to filter." },
      { t: "Search", d: "Type a name, ID number or mobile number in the search box at the top of the People page." },
    ],
  },
  {
    title: "Add people and documents (no login needed)",
    steps: [
      { t: "Add a person", d: "My People › “+ Add person”, or fill the “Add person” card. The full form has 4 short steps: Photo & name › Birth & ID › Contact › Certificates, with a live 3D card." },
      { t: "Fill from ID card", d: "In the form press “Fill from ID card” and take a photo of the ID card, passport or birth certificate. Empty fields are filled for you." },
      { t: "Save a document", d: "Press “Scan document”: use the camera, upload photos/PDF, or the printer-scanner folder. Several pages become one document." },
      { t: "Automatic filing", d: "DocSecure reads the document and its file name (e.g. “Shanthi Mallika NIC.jpg”), finds the person and folder, names it and saves it. If unsure, it asks you to choose." },
    ],
  },
  {
    title: "Show, share, download, print",
    steps: [
      { t: "Show (e.g. to a doctor)", d: "Open the document and press “Show”. It opens full screen with all pages. Pinch to zoom. Works without internet." },
      { t: "Share", d: "Press “Share” to send the PDF by WhatsApp, email or Viber (on phones). On computers it downloads the PDF." },
      { t: "Download", d: "⬇ on a document = one PDF. “Download folder” = one folder as ZIP. “Download all” on a person = all their documents in folders." },
      { t: "Print", d: "Press 🖨 Print on a document. All pages are printed." },
    ],
  },
];

const ADMIN: { title: string; steps: Step[] }[] = [
  {
    title: "Log in",
    steps: [
      { t: "Admin login", d: "Only needed to update, delete, open the Admin panel or Settings. Press “Admin login” (top of the page) and type the admin PIN on the keypad." },
      { t: "Log out", d: "Press “Log out” when you finish. The app also logs out by itself after a few minutes without use (Admin › Log out automatically after)." },
      { t: "First time on a new device", d: "The first login on each phone or computer needs internet. After that the PIN also works offline." },
    ],
  },
  {
    title: "Update and delete (admin only)",
    steps: [
      { t: "Update a person", d: "Log in, then press ✏️ on a person's card (or in Admin panel › People) and change the details." },
      { t: "Update a document", d: "Open the document and press “Edit”, or use Admin panel › Documents › ✏️. You can change the name, folder, person, dates and details." },
      { t: "Delete", d: "Press 🗑 on a card, a document or in the Admin panel. You are asked to confirm first; deleting cannot be undone." },
    ],
  },
  {
    title: "Admin panel",
    steps: [
      { t: "Dashboard", d: "Admin panel shows the totals and every person and document with Edit, Delete and Download. “Download all documents” saves everything as one ZIP." },
      { t: "More admins", d: "Admin panel › Admins › “Add admin”: give a name and a 4–8 number PIN. They can then log in with their own PIN on this device." },
      { t: "Auto-save to computer", d: "On the People page press “Turn on auto-save” and choose a folder (Chrome or Edge on a computer). Every document is then also saved there as Person › Folder › Document.pdf." },
    ],
  },
  {
    title: "Use on another computer or phone",
    steps: [
      { t: "Make a backup", d: "Settings › “Download backup”. A file DocSecure-backup-(date).json is saved." },
      { t: "Move it", d: "Copy it to the other device (USB, Google Drive, email or WhatsApp to yourself)." },
      { t: "Restore", d: "On the other device: open DocSecure › Admin login › Settings › “Restore backup” › choose the file. Everything appears." },
    ],
  },
];

function Block({ n, title, steps, color }: { n: number; title: string; steps: Step[]; color: string }) {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="flex items-center gap-3 text-lg font-bold">
        <span className={`grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br ${color} text-sm text-white shadow`}>{n}</span>
        {title}
      </h3>
      <ol className="mt-4 space-y-3">
        {steps.map((s) => (
          <li key={s.t} className="rounded-xl bg-black/3 p-3 dark:bg-white/4">
            <p className="font-semibold">{s.t}</p>
            <p className="mt-0.5 text-sm text-muted">{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/vault" className="btn-ghost"><ArrowLeft size={16} /> Back to My People</Link>
        <div className="ml-auto flex gap-2">
          <a href="#user" className="btn-ghost"><BookOpen size={16} /> User guide</a>
          <a href="#admin" className="btn-primary"><ShieldCheck size={16} /> Admin guide</a>
        </div>
      </div>

      <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-violet-600 to-sky-500 p-8 text-white shadow-xl">
        <p className="text-sm text-white/80">DocSecure</p>
        <h1 className="mt-1 text-4xl font-black tracking-tight">How to use DocSecure</h1>
        <p className="mt-2 max-w-xl text-white/85">Simple steps for family members (User guide) and for the person who manages everything (Admin guide).</p>
      </header>

      <div id="user" className="scroll-mt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold"><BookOpen className="text-sky-500" /> User guide</h2>
        {USER.map((b, i) => <Block key={b.title} n={i + 1} title={b.title} steps={b.steps} color="from-sky-500 to-cyan-600" />)}
      </div>

      <div id="admin" className="scroll-mt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck className="text-indigo-500" /> Admin guide</h2>
        {ADMIN.map((b, i) => <Block key={b.title} n={i + 1} title={b.title} steps={b.steps} color="from-indigo-500 to-violet-600" />)}
      </div>
    </div>
  );
}
