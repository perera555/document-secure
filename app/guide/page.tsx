import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, BookOpen, ShieldCheck, Lightbulb } from "lucide-react";

export const metadata: Metadata = { title: "Guide" };

type Section = { id: string; title: string; intro?: string; steps: string[]; tip?: string };

/* ───────────── User guide: for every family member ───────────── */
const USER: Section[] = [
  {
    id: "open",
    title: "Open DocSecure",
    steps: [
      "Open document-secure.vercel.app in Chrome, Edge or Safari (or open the installed DocSecure app).",
      "Press “Go to My People”.",
      "You see a 3D card for every family member.",
    ],
  },
  {
    id: "install",
    title: "Install the app (only once)",
    steps: [
      "Windows / Mac (Chrome or Edge): on the home page press “Install”, or press the install icon at the right of the address bar.",
      "Android: press “Install”, or the ⋮ menu › “Install app”.",
      "iPhone / iPad: open in Safari › press Share › “Add to Home Screen”.",
      "Now DocSecure opens from the Desktop or home screen like a normal app.",
    ],
    tip: "When a new version is ready, a bar appears at the top of the page. Press “Update” to get it.",
  },
  {
    id: "cards",
    title: "Open a person (cards and PINs)",
    steps: [
      "Go to People. Every person has a card.",
      "A normal card has no PIN: press “Open documents” and the documents open for anyone.",
      "A card with a 🔒 lock has its own PIN. Tap the card — a keypad appears.",
      "Type that person's PIN (4–8 numbers) and press “Log in”. Only that person's documents open.",
      "Another person's PIN will not work here. The admin PIN works for every card.",
      "Press ↻ on a card to flip it and see all the details (ID, birthday, passport, mobile…).",
    ],
    tip: "Only the admin can create or change PINs. Ask the admin for your PIN.",
  },
  {
    id: "forgot",
    title: "I forgot my PIN",
    steps: [
      "Tap your locked card. On the keypad press “Forgot PIN? Admin reset”.",
      "Ask the admin to type the admin PIN.",
      "The admin types a new PIN for you two times and presses “Save new PIN”.",
      "Now type your new PIN — your documents open.",
    ],
  },
  {
    id: "find",
    title: "Find a document",
    steps: [
      "Open a person. Their documents are in folders: National ID, Passport, Medical, Birth certificate…",
      "Press a folder to see only those documents.",
      "Press a document to open it and see all its pages and details.",
    ],
  },
  {
    id: "camera",
    title: "Add a document with the phone camera",
    steps: [
      "Press “Scan” in the menu.",
      "Press “Camera” and take a photo of the page. Take more photos for more pages.",
      "Press “Read & file”. DocSecure reads the page and finds the person and the type (NIC, passport…).",
      "Check the name, person and folder. Change them if needed.",
      "Press “Save”. All pages are saved as one PDF in the person's folder.",
    ],
    tip: "Put the paper on a dark table in good light. Keep the phone straight above the page.",
  },
  {
    id: "upload",
    title: "Add PDFs or photos from the computer",
    steps: [
      "Press “Scan” › “Upload files” and choose the PDF or photos.",
      "Or, for many files: in the “Import many documents from this computer” box press “Choose files” or “Choose a folder”.",
      "Keep “File automatically” on. Every file is read and saved into the right person and folder.",
      "A good file name helps, e.g. “Shanthi Mallika NIC.pdf” or a folder named “P R Perera”.",
    ],
    tip: "The same file is never saved twice — you see “Already saved” instead.",
  },
  {
    id: "printer",
    title: "Scan with the printer-scanner (HP DeskJet)",
    intro: "Do steps 1–3 only once on the Windows computer.",
    steps: [
      "Press “Scan” › in the “Scan with printer” box press “Download helper (Windows)”.",
      "Open the downloaded ZIP, unzip it, and double-click “Install-DocSecure-Scan.cmd”. If Windows asks “Run anyway?”, say yes.",
      "Go back to DocSecure and press “Check again”. It shows “Scanner helper connected”. If the browser asks to allow access, press “Allow”.",
      "Switch the printer on and press “Search scanners”. Press your scanner (HP DeskJet) to select it.",
      "Choose “Whose document?” (or “Detect automatically”) and type the document, e.g. “NIC”.",
      "Put the page face down on the glass and press “Scan”. Wait about 20 seconds.",
      "The page is scanned in original colour and saved in the person's folder by itself. Scan again for the next page.",
    ],
    tip: "Choose “Black & white” for a smaller file, or “Best (600 DPI)” for very small text.",
  },
  {
    id: "show",
    title: "Show a document (e.g. to a doctor)",
    steps: [
      "Open the document.",
      "Press “Show”. It opens full screen with all pages.",
      "Pinch or zoom to make it bigger. Press ✕ to close.",
    ],
    tip: "Show works without internet.",
  },
  {
    id: "download",
    title: "Download, share and print",
    steps: [
      "One document: press ⬇ “Download PDF”.",
      "One folder: open the folder › “Download folder” (a ZIP of all documents in it).",
      "All of a person's documents: open the person › “Download all”.",
      "Share: open a document › “Share” › choose WhatsApp, email, Viber… (on phones).",
      "Print: open a document › 🖨 “Print”. All pages are printed.",
    ],
  },
  {
    id: "logout",
    title: "Log out",
    steps: [
      "Press “Log out” at the top when you finish.",
      "DocSecure also logs out by itself after a few minutes without use.",
    ],
  },
];

/* ───────────── Admin guide: for the person who manages everything ───────────── */
const ADMIN: Section[] = [
  {
    id: "admin-login",
    title: "Log in as admin",
    steps: [
      "Press “Log in” at the top (or “Admin login” on the home page).",
      "Type the admin PIN on the keypad and press “Log in”.",
      "The Admin dashboard opens. The top bar shows “Admin”.",
    ],
    tip: "The first admin login on a new phone or computer needs internet.",
  },
  {
    id: "dashboard",
    title: "The Admin dashboard",
    steps: [
      "At the top you see totals: people, documents, expiring documents and storage used.",
      "Tab “People”: everyone as a card. Press “List” to see a short list instead, “Cards” to go back.",
      "Tab “Documents”: every document with ✏️ Edit, 🗑 Delete and ⬇ Download.",
      "Use the search box to find a person or document fast.",
      "“Download all documents” saves everything as one ZIP (Person › Folder › Document.pdf).",
    ],
  },
  {
    id: "add-person",
    title: "Add a person",
    steps: [
      "Admin dashboard (or People page) › “Add person”.",
      "Step 1 – Photo & name: “Take photo” or “Upload” a photo, type the full name and relationship (Father, Mother…).",
      "Step 2 – Birth & ID: choose day, month and year of birth, gender, and NIC number.",
      "Step 3 – Contact: mobile, email and address.",
      "Step 4 – Certificates: passport, birth and marriage certificate numbers.",
      "Press “Save”. The new card appears at once.",
    ],
    tip: "“Fill from ID card”: take a photo of the NIC and the form is filled for you. If the person already exists, you are told.",
  },
  {
    id: "edit-person",
    title: "Update or delete a person",
    steps: [
      "Press ✏️ on the person's card (or in the List view).",
      "Change the details and press “Save”.",
      "To delete: press 🗑 and confirm. Their documents are deleted too — this cannot be undone.",
    ],
    tip: "Download the person's documents (⬇) before deleting, to keep a copy.",
  },
  {
    id: "pins",
    title: "Give a person their own PIN",
    steps: [
      "Admin dashboard › People › press “Set PIN” under the person's card.",
      "Type a new PIN (4–8 numbers) two times and press “Set PIN”. Each person needs a different PIN.",
      "Now the card shows “🔑 Has own PIN”. On the People page their card is locked.",
      "Tell the person their PIN. With it they open only their own documents.",
      "To change it: “Reset PIN”. To make the card open for everyone again: “Reset PIN” › “Remove PIN”.",
    ],
    tip: "People with no PIN are open to everyone. People with a PIN need their PIN or the admin PIN.",
  },
  {
    id: "reset",
    title: "Someone forgot their PIN",
    steps: [
      "Easiest: Admin dashboard › “Reset PIN” under their card › type a new PIN two times › “Reset PIN”.",
      "Or on their phone: tap their locked card › “Forgot PIN? Admin reset” › type the admin PIN › type the new PIN two times › “Save new PIN”.",
      "Tell them the new PIN. The old PIN stops working.",
    ],
  },
  {
    id: "forgot-admin",
    title: "I forgot the admin PIN",
    steps: [
      "Open vercel.com and log in.",
      "Open the project “document-secure” › Settings › Environment Variables.",
      "Find ADMIN_PIN, press ⋯ › Edit, type a new PIN and save.",
      "Go to Deployments › on the newest one press ⋯ › “Redeploy”. After about 1 minute the new admin PIN works.",
    ],
    tip: "The keypad also shows these steps: press “Forgot admin PIN?”.",
  },
  {
    id: "admins",
    title: "Add more admins",
    steps: [
      "Admin page › “Admins” › “Add admin”.",
      "Type a name and a PIN (4–8 numbers) and press “Add”.",
      "That person can now log in as admin with their own PIN on this device.",
      "Remove an admin with 🗑. The main admin (👑) cannot be removed.",
      "“Log out automatically after” sets how many minutes until the app logs out by itself.",
    ],
  },
  {
    id: "documents",
    title: "Update, move or delete documents",
    steps: [
      "Open the document › “Edit”. Change the name, folder, person, dates or details › “Save”.",
      "Inside a folder: “Add to this folder” adds a new document straight into it.",
      "Delete: press 🗑 on the document and confirm.",
    ],
    tip: "Documents with an expiry date (passport, licence…) are counted as “Expiring” on the dashboard before they expire.",
  },
  {
    id: "autosave",
    title: "Auto-save to a computer folder",
    steps: [
      "Use Chrome or Edge on a computer.",
      "Settings (or the People page bar) › “Turn on auto-save” › “Choose a folder”, e.g. Documents › DocSecure.",
      "Press “Allow” when the browser asks.",
      "Every new or changed document is now also saved there as Person › Folder › Document.pdf.",
    ],
  },
  {
    id: "transfer",
    title: "Use the same data on another computer or phone",
    steps: [
      "On this device: Admin page › “Use on another computer or phone” › “Download backup”. A file DocSecure-backup-(date).json is saved.",
      "Copy that file to the other device (USB pen drive, Google Drive, email or WhatsApp to yourself).",
      "On the other device: open DocSecure › log in as admin › Admin page › “Restore backup” › choose the file.",
      "All people, photos, details, PINs and documents appear.",
    ],
    tip: "Documents are kept on each device. Make a new backup after adding many documents.",
  },
  {
    id: "storage",
    title: "Storage and settings",
    steps: [
      "Settings shows how much space DocSecure uses.",
      "Settings › “Download backup” / “Restore backup” works the same as on the Admin page.",
      "To free space: delete old documents, or download them as a ZIP and then delete them.",
    ],
  },
];

function Block({ n, s, color }: { n: number; s: Section; color: string }) {
  return (
    <section id={s.id} className="card scroll-mt-6 p-5 sm:p-6">
      <h3 className="flex items-center gap-3 text-lg font-bold">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-linear-to-br ${color} text-sm text-white shadow`}>{n}</span>
        {s.title}
      </h3>
      {s.intro && <p className="mt-2 text-sm text-muted">{s.intro}</p>}
      <ol className="mt-4 space-y-2">
        {s.steps.map((step, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-black/3 p-3 dark:bg-white/4">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-black/8 text-xs font-bold dark:bg-white/10">{i + 1}</span>
            <span className="text-sm leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
      {s.tip && (
        <p className="mt-3 flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <Lightbulb size={16} className="mt-0.5 shrink-0" /> {s.tip}
        </p>
      )}
    </section>
  );
}

function Contents({ title, items, color }: { title: string; items: Section[]; color: string }) {
  return (
    <div className="card p-5">
      <p className="font-bold">{title}</p>
      <ol className="mt-2 space-y-1 text-sm">
        {items.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={`hover:underline ${color}`}>{i + 1}. {s.title}</a>
          </li>
        ))}
      </ol>
    </div>
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
        <p className="mt-2 max-w-xl text-white/85">Step by step. The User guide is for every family member. The Admin guide is for the person who manages people, PINs and documents.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Contents title="User guide" items={USER} color="text-sky-600 dark:text-sky-400" />
        <Contents title="Admin guide" items={ADMIN} color="text-indigo-600 dark:text-indigo-400" />
      </div>

      <div id="user" className="scroll-mt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold"><BookOpen className="text-sky-500" /> User guide</h2>
        {USER.map((s, i) => <Block key={s.id} n={i + 1} s={s} color="from-sky-500 to-cyan-600" />)}
      </div>

      <div id="admin" className="scroll-mt-6 space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold"><ShieldCheck className="text-indigo-500" /> Admin guide</h2>
        {ADMIN.map((s, i) => <Block key={s.id} n={i + 1} s={s} color="from-indigo-500 to-violet-600" />)}
      </div>
    </div>
  );
}
