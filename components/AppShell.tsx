"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, ScanLine, Settings, Moon, Sun, Inbox } from "lucide-react";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { db } from "@/lib/db";

const NAV = [
  { href: "/vault", label: "People", icon: FolderOpen },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/settings", label: "Settings", icon: Settings },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      className="rounded-xl p-2 text-muted hover:bg-black/5 dark:hover:bg-white/10"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try {
          localStorage.setItem("theme", next ? "dark" : "light");
        } catch {}
      }}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

function useActive() {
  const path = usePathname();
  return (href: string) => path === href || path.startsWith(href + "/") || (href === "/vault" && path.startsWith("/doc"));
}

function TopNav({ highlight = true }: { highlight?: boolean }) {
  return highlight ? <TopNavActive /> : <TopNavLinks active={() => false} />;
}
function TopNavActive() {
  return <TopNavLinks active={useActive()} />;
}
function TopNavLinks({ active }: { active: (href: string) => boolean }) {
  return (
    <nav className="ml-6 hidden items-center gap-1 md:flex">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
            active(n.href) ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "text-muted hover:text-foreground"
          }`}
        >
          <n.icon size={18} /> {n.label}
        </Link>
      ))}
    </nav>
  );
}

function BottomNavActive() {
  return <BottomNavLinks active={useActive()} />;
}
function BottomNavLinks({ active }: { active: (href: string) => boolean }) {
  return (
    <div className="mx-auto grid max-w-md grid-cols-3">
      {NAV.map((n) => {
        const isScan = n.href === "/scan";
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active(n.href) ? "text-indigo-600 dark:text-indigo-300" : "text-muted"}`}
          >
            {isScan ? (
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-indigo-600 to-sky-500 text-white shadow-xl shadow-indigo-500/30">
                <n.icon size={26} />
              </span>
            ) : (
              <n.icon size={22} />
            )}
            {n.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const inbox = useLiveQuery(() => db.inbox.count(), [], 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/vault" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-9 w-9" />
            <span className="text-lg font-bold tracking-tight">
              Doc<span className="bg-linear-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">Secure</span>
            </span>
          </Link>
          <Suspense fallback={<TopNav highlight={false} />}>
            <TopNav />
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            {inbox > 0 && (
              <Link href="/scan" className="flex items-center gap-1.5 rounded-xl bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <Inbox size={16} /> {inbox} new scan{inbox > 1 ? "s" : ""}
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl md:hidden">
        <Suspense fallback={<BottomNavLinks active={() => false} />}>
          <BottomNavActive />
        </Suspense>
      </nav>
    </div>
  );
}
