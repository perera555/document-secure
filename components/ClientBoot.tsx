"use client";

import { useEffect } from "react";
import { initInstallCapture } from "@/lib/install";
import { pollScannerFolder } from "@/lib/scanner-folder";

let booted = false;

export function ClientBoot() {
  useEffect(() => {
    if (booted) return;
    booted = true;
    initInstallCapture();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    // Ask the browser to keep our documents even when disk is low.
    navigator.storage?.persist?.().catch(() => {});

    // Auto-import new scans from the scanner folder while the app is open.
    const tick = () => {
      if (document.visibilityState === "visible") pollScannerFolder().catch(() => {});
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);
  return null;
}
