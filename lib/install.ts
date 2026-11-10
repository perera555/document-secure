"use client";

import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function initInstallCapture() {
  if (typeof window === "undefined") return;
  installed = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}

export type Platform = "ios" | "android" | "mac" | "windows" | "linux" | "other";

export function detectPlatform(): { platform: Platform; browser: "safari" | "chrome" | "edge" | "firefox" | "samsung" | "other" } {
  const ua = navigator.userAgent;
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const platform: Platform = /iPhone|iPad|iPod/.test(ua) || iPadOS
    ? "ios"
    : /Android/.test(ua)
      ? "android"
      : /Mac/.test(ua)
        ? "mac"
        : /Win/.test(ua)
          ? "windows"
          : /Linux/.test(ua)
            ? "linux"
            : "other";
  const browser = /SamsungBrowser/.test(ua)
    ? "samsung"
    : /Edg\//.test(ua)
      ? "edge"
      : /Firefox|FxiOS/.test(ua)
        ? "firefox"
        : /Chrome|CriOS/.test(ua)
          ? "chrome"
          : /Safari/.test(ua)
            ? "safari"
            : "other";
  return { platform, browser };
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useInstallState() {
  const canPrompt = useSyncExternalStore(subscribe, () => Boolean(deferred), () => false);
  const isInstalled = useSyncExternalStore(subscribe, () => installed, () => false);
  return { canPrompt, isInstalled };
}
