"use client";

/**
 * Scanner auto-import.
 *
 * Browsers cannot talk to scanner drivers (TWAIN/WIA/eSCL) directly. Every scanner
 * app (Windows Scan, HP Smart, Epson ScanSmart, Canon IJ, macOS Image Capture…)
 * saves scans into a folder, so we watch that folder with the File System Access
 * API (Chrome / Edge on Windows, macOS, Linux, ChromeOS) and import new files automatically.
 */
import { db, getSetting, setSetting, uid } from "./db";

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
  requestPermission?: (d: { mode: "read" }) => Promise<PermissionState>;
  values(): AsyncIterable<FileSystemHandle>;
};

const ACCEPT = /\.(jpe?g|png|webp|pdf|bmp|gif)$/i;

export function folderWatchSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickScannerFolder(): Promise<string | null> {
  const picker = (window as unknown as { showDirectoryPicker: (o?: object) => Promise<DirHandle> })
    .showDirectoryPicker;
  const handle = await picker({ id: "scanner-folder", mode: "read" });
  await setSetting("scannerFolder", handle);
  // Mark existing files as seen, only scans created from now on are imported.
  const seen: Record<string, number> = {};
  for await (const entry of handle.values()) {
    if (entry.kind === "file" && ACCEPT.test(entry.name)) {
      const f = await (entry as FileSystemFileHandle).getFile();
      seen[entry.name] = f.lastModified;
    }
  }
  await setSetting("scannerSeen", seen);
  return handle.name;
}

export async function getScannerFolder(): Promise<DirHandle | null> {
  return (await getSetting<DirHandle | null>("scannerFolder", null)) ?? null;
}

export async function forgetScannerFolder() {
  await db.settings.bulkDelete(["scannerFolder", "scannerSeen"]);
}

export async function folderPermission(handle: DirHandle, ask = false): Promise<boolean> {
  if (!handle.queryPermission) return true;
  let state = await handle.queryPermission({ mode: "read" });
  if (state !== "granted" && ask && handle.requestPermission) {
    state = await handle.requestPermission({ mode: "read" });
  }
  return state === "granted";
}

/** Checks the folder once, returns number of newly imported files. */
export async function pollScannerFolder(): Promise<number> {
  const handle = await getScannerFolder();
  if (!handle || !(await folderPermission(handle))) return 0;
  const seen = await getSetting<Record<string, number>>("scannerSeen", {});
  let added = 0;
  for await (const entry of handle.values()) {
    if (entry.kind !== "file" || !ACCEPT.test(entry.name)) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    if (seen[entry.name] === file.lastModified) continue;
    // Skip files still being written by the scanner app.
    if (Date.now() - file.lastModified < 1500 || file.size === 0) continue;
    seen[entry.name] = file.lastModified;
    const type = file.type || (entry.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    await db.inbox.add({ id: uid(), name: entry.name, blob: file, type, createdAt: Date.now() });
    added++;
  }
  if (added) await setSetting("scannerSeen", seen);
  return added;
}
