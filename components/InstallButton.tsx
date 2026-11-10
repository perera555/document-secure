"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Download, Share, SquarePlus, MonitorDown, MoreVertical } from "lucide-react";
import { detectPlatform, promptInstall, useInstallState, type Platform } from "@/lib/install";
import { Modal } from "./ui";

type Info = ReturnType<typeof detectPlatform>;

const PLATFORM_NAME: Record<Platform, string> = {
  ios: "iPhone / iPad",
  android: "Android",
  mac: "Mac",
  windows: "Windows",
  linux: "Linux",
  other: "this device",
};

export function InstallButton({ size = "lg", className = "" }: { size?: "lg" | "sm"; className?: string }) {
  const { canPrompt, isInstalled } = useInstallState();
  const [info, setInfo] = useState<Info | null>(null);
  const [help, setHelp] = useState(false);
  useEffect(() => setInfo(detectPlatform()), []);

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300 ${className}`}>
        <CheckCircle2 size={18} /> App installed
      </span>
    );
  }

  const label = `Install on ${info ? PLATFORM_NAME[info.platform] : "your device"}`;
  return (
    <>
      <button
        className={`${size === "lg" ? "btn-primary px-6 py-3.5 text-base" : "btn-primary"} ${className}`}
        onClick={async () => {
          if (canPrompt) await promptInstall();
          else setHelp(true);
        }}
      >
        <Download size={size === "lg" ? 20 : 16} /> {label}
      </button>
      <Modal open={help} onClose={() => setHelp(false)} title={label}>
        {info && <InstallSteps info={info} />}
      </Modal>
    </>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-600 dark:text-indigo-300">{n}</span>
      <span className="pt-0.5 text-sm">{children}</span>
    </li>
  );
}

export function InstallSteps({ info }: { info: Info }) {
  const { platform, browser } = info;
  if (platform === "ios") {
    return (
      <div className="space-y-4">
        {browser !== "safari" && <p className="rounded-xl bg-amber-500/15 p-3 text-sm">On iPhone/iPad, open this page in <b>Safari</b> first.</p>}
        <ol className="space-y-3">
          <Step n={1}>Tap the <Share className="inline" size={16} /> <b>Share</b> button at the bottom of Safari.</Step>
          <Step n={2}>Scroll down and tap <SquarePlus className="inline" size={16} /> <b>Add to Home Screen</b>.</Step>
          <Step n={3}>Tap <b>Add</b>. DocSecure now opens like a normal app from your home screen.</Step>
        </ol>
      </div>
    );
  }
  if (platform === "mac" && browser === "safari") {
    return (
      <ol className="space-y-3">
        <Step n={1}>In the Safari menu bar click <b>File → Add to Dock…</b> (or the <Share className="inline" size={16} /> Share button → <b>Add to Dock</b>).</Step>
        <Step n={2}>Click <b>Add</b>. DocSecure appears in your Dock and Launchpad.</Step>
      </ol>
    );
  }
  if (browser === "firefox") {
    return (
      <div className="space-y-3 text-sm">
        <p>Firefox on computers can&apos;t install web apps. Open this page in <b>Chrome</b>, <b>Edge</b> or <b>Safari (Mac)</b> and click Install.</p>
        {platform === "android" && <p>On Android Firefox: tap the <MoreVertical className="inline" size={16} /> menu → <b>Install</b>.</p>}
      </div>
    );
  }
  if (platform === "android") {
    return (
      <ol className="space-y-3">
        <Step n={1}>Tap the <MoreVertical className="inline" size={16} /> menu in the top-right of Chrome.</Step>
        <Step n={2}>Tap <b>Install app</b> (or <b>Add to Home screen</b>).</Step>
        <Step n={3}>Tap <b>Install</b>. DocSecure appears in your app drawer.</Step>
      </ol>
    );
  }
  return (
    <ol className="space-y-3">
      <Step n={1}>Look for the <MonitorDown className="inline" size={16} /> <b>Install</b> icon at the right end of the address bar in Chrome or Edge.</Step>
      <Step n={2}>Or open the browser menu (⋮ / …) → <b>Cast, save and share → Install page as app</b> (Chrome) or <b>Apps → Install this site as an app</b> (Edge).</Step>
      <Step n={3}>Click <b>Install</b>. DocSecure gets its own window, Start menu / Dock icon and desktop shortcut.</Step>
    </ol>
  );
}
