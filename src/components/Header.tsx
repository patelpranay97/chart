"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { fmtUSDCompact } from "@/lib/format";
import { STARTING_CAPITAL } from "@/lib/lifetime";
import { useGame, useLifetimeStats } from "@/store/gameStore";
import { useTheme } from "@/store/theme";

function NetWorthChip() {
  const stats = useLifetimeStats();
  const up = stats.netWorth >= STARTING_CAPITAL;
  return (
    <div className="hidden flex-col items-end sm:flex">
      <span className="text-[10px] uppercase tracking-wide text-muted">Net worth</span>
      <span className={`font-mono text-sm font-bold ${up ? "text-up" : "text-down"}`}>
        {fmtUSDCompact(stats.netWorth)}
      </span>
    </div>
  );
}

function ThemeToggle() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="grid h-9 w-9 place-items-center rounded-md border border-line bg-panel-2 text-fg transition hover:bg-line"
    >
      {theme === "dark" ? "🌙" : "☀️"}
    </button>
  );
}

// Live items navigate; the rest are placeholders until the backend phase.
const MENU: { label: string; href?: string }[] = [
  { label: "Profile", href: "/profile" },
  { label: "Help Center" },
  { label: "Badges", href: "/profile" },
  { label: "Leaderboard" },
  { label: "Discord" },
  { label: "Logout" },
];

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel-2 text-sm font-semibold text-fg transition hover:bg-line"
      >
        ☰
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-panel py-1 shadow-xl">
          {MENU.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-sm text-fg transition hover:bg-panel-2"
              >
                <span>{item.label}</span>
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex items-center justify-between px-3 py-2 text-sm text-muted"
              >
                <span>{item.label}</span>
                <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  soon
                </span>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const toSetup = useGame((s) => s.toSetup);
  const phase = useGame((s) => s.phase);
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-panel px-4">
      <Link
        href="/"
        onClick={() => phase !== "playing" && toSetup()}
        className="flex items-center gap-2"
      >
        <span className="text-lg font-bold tracking-tight text-fg">
          ETF <span className="text-accent">Practice</span>
        </span>
        <span className="hidden rounded bg-panel-2 px-2 py-0.5 text-xs font-medium text-muted sm:inline">
          SPY · QQQ · VOO
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <NetWorthChip />
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  );
}
