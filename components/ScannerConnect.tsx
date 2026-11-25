"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, Printer, RefreshCw, ScanLine, Usb, Wifi } from "lucide-react";
import { db, uid, type Person } from "@/lib/db";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "./Toast";

/**
 * "Scan with printer": talks to the small DocSecure Scanner helper running on this computer
 * (http://localhost:17321), which uses the Windows scanner system (works with HP DeskJet).
 * The scanned page goes into the scanner inbox; with "File automatically" on, the Scan page
 * then reads it and files it into the right person's folder by itself.
 */
const BRIDGE = "http://localhost:17321";
const headers = { "X-DocSecure": "1" };

type Scanner = { id: string; name: string; via: "USB" | "Network" };

/** Suggestions for "Document", without repeats (React keys must be unique). */
const DOC_TYPES = (() => {
  const seen = new Set<string>();
  return ["NIC", "Passport", "Birth certificate", "Marriage certificate", "Driving licence", "Medical report", "Bank statement", "Bill", ...CATEGORIES.map((c) => c.label)].filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
})();

async function bridge(path: string, init?: RequestInit, timeoutMs = 2500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(BRIDGE + path, { ...init, headers, signal: ctrl.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

function load(key: string) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function store(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {}
}

export function ScannerConnect({ people }: { people: Person[] }) {
  const [state, setState] = useState<"checking" | "online" | "offline">("checking");
  const [scanners, setScanners] = useState<Scanner[]>([]);
  const [searching, setSearching] = useState(false);
  const [device, setDevice] = useState("");
  const [person, setPerson] = useState("");
  const [docType, setDocType] = useState("");
  const [dpi, setDpi] = useState("300");
  const [gray, setGray] = useState(false);
  const [scanning, setScanning] = useState(false);

  const search = useCallback(async () => {
    setSearching(true);
    try {
      const res = await bridge("/scanners", undefined, 20000);
      const list = (await res.json()) as Scanner[];
      setScanners(list);
      setState("online");
      const saved = load("scannerDevice");
      setDevice(list.some((s) => s.id === saved) ? saved : list[0]?.id ?? "");
    } catch {
      setState("offline");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    setDpi(load("scannerDpi") || "300");
    (async () => {
      try {
        const res = await bridge("/status");
        if (!res.ok) throw new Error();
        setState("online");
        await search();
      } catch {
        setState("offline");
      }
    })();
  }, [search]);

  async function scan() {
    setScanning(true);
    try {
      const q = new URLSearchParams({ device, dpi, gray: gray ? "1" : "0" });
      // An explicit empty body: Windows' listener needs a length on POST requests.
      const res = await bridge(`/scan?${q}`, { method: "POST", body: "" }, 180_000);
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Scan failed");
      const blob = await res.blob();
      const who = people.find((p) => p.id === person)?.fullName ?? "";
      const label = [who, docType].filter(Boolean).join(" ") || "Scan";
      // The name helps automatic filing: "Shanthi Mallika NIC.jpg" → Shanthi Mallika › National ID.
      await db.inbox.add({ id: uid(), name: `${label}.jpg`, blob: new File([blob], `${label}.jpg`, { type: "image/jpeg" }), type: "image/jpeg", createdAt: Date.now() });
      toast("Page scanned");
    } catch (e) {
      toast(e instanceof Error && e.message !== "The user aborted a request." ? e.message : "Scan failed — is the scanner on?", "error");
    } finally {
      setScanning(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-linear-to-r from-sky-600 to-indigo-600 px-5 py-3 text-white">
        <Printer size={22} />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Scan with printer</h2>
          <p className="text-xs text-white/80">
            {state === "online" ? "Scanner helper connected" : state === "checking" ? "Looking for the scanner helper…" : "Scanner helper not running on this computer"}
          </p>
        </div>
        {state === "online" && <CheckCircle2 size={20} />}
        {state === "checking" && <Loader2 size={20} className="animate-spin" />}
      </div>

      {state === "offline" && (
        <div className="space-y-3 p-5 text-sm">
          <p className="text-muted">
            To scan from a printer-scanner (e.g. HP DeskJet), this computer needs the small <b>DocSecure Scanner</b> helper (Windows). It starts by itself with Windows after you install it once.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/tools/DocSecure-Scan.zip" download className="btn-primary"><Download size={16} /> Download helper (Windows)</a>
            <a href="docsecure-scan://bridge" className="btn-ghost"><Printer size={16} /> Start helper</a>
            <button className="btn-ghost" onClick={search}><RefreshCw size={16} /> Check again</button>
          </div>
          <p className="text-xs text-muted">Install: unzip, double-click <b>Install-DocSecure-Scan.cmd</b>. If the browser asks to allow access to devices on your network or to open DocSecure Scan, choose <b>Allow</b>.</p>
        </div>
      )}

      {state === "online" && (
        <div className="space-y-4 p-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label mb-0">Scanner</p>
              <button className="btn-ghost px-3 py-1.5 text-xs" onClick={search} disabled={searching}>
                {searching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Search scanners
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {scanners.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setDevice(s.id);
                    store("scannerDevice", s.id);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${device === s.id ? "border-indigo-500 bg-indigo-500/10" : "border-border hover:bg-black/3 dark:hover:bg-white/3"}`}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 dark:bg-white/10">{s.via === "USB" ? <Usb size={18} /> : <Wifi size={18} />}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.name}</span>
                    <span className="block text-xs text-muted">{s.via === "USB" ? "USB cable" : "Wi-Fi / network"}</span>
                  </span>
                </button>
              ))}
              {scanners.length === 0 && <p className="text-sm text-muted">No scanner found. Switch the printer on and press “Search scanners”.</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <label className="sm:col-span-2">
              <span className="label">Whose document?</span>
              <select className="input" value={person} onChange={(e) => setPerson(e.target.value)}>
                <option value="">Detect automatically</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Document</span>
              <input className="input" list="scan-doc-types" placeholder="e.g. NIC" value={docType} onChange={(e) => setDocType(e.target.value)} />
              <datalist id="scan-doc-types">
                {DOC_TYPES.map((t) => <option key={t} value={t} />)}
              </datalist>
            </label>
            <label>
              <span className="label">Quality</span>
              <select className="input" value={dpi} onChange={(e) => { setDpi(e.target.value); store("scannerDpi", e.target.value); }}>
                <option value="200">Normal (200 DPI)</option>
                <option value="300">High (300 DPI)</option>
                <option value="600">Best (600 DPI, slow)</option>
              </select>
            </label>
          </div>
          <label className="flex w-fit items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={gray} onChange={(e) => setGray(e.target.checked)} /> Black &amp; white (smaller file)
          </label>

          <button className="btn-primary w-full py-4 text-base" disabled={scanning || !device} onClick={scan}>
            {scanning ? <Loader2 size={20} className="animate-spin" /> : <ScanLine size={20} />}
            {scanning ? "Scanning… (about 20 seconds)" : "Scan"}
          </button>
          <p className="text-xs text-muted">Put the page face down on the glass. With “File automatically” on, the page is read and saved into the person&apos;s folder by itself. Scan again for the next page or document.</p>
        </div>
      )}
    </section>
  );
}
