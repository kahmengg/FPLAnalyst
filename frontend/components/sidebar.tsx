"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Trophy,
  Calendar,
  Menu,
  X,
  Clock,
  GitCompareArrows,
  Repeat2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { summaryQuery } from "@/lib/research-queries";
import { DATA_SEASON } from "@/lib/season";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "My Team", href: "/my-team", icon: Users },
  { name: "Top Players", href: "/top-performers", icon: Users },
  { name: "Teams", href: "/team-rankings", icon: Trophy },
  { name: "Fixtures", href: "/fixture-analysis", icon: Calendar },
  { name: "Compare Players", href: "/player-trends", icon: GitCompareArrows },
  { name: "Transfer Planner", href: "/transfer-targets", icon: Repeat2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: summary, error } = useQuery(summaryQuery);
  const gameweek = summary?.current_gameweek ?? summary?.total_gameweeks ?? 0;
  const lastSyncedAt = summary?.last_synced_at ?? null;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback((restoreFocus = true) => {
    setIsMobileOpen(false);
    if (restoreFocus) {
      // Wait until the sheet is closed before returning keyboard focus.
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileMenu, isMobileOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-sidebar px-3 text-sidebar-foreground shadow-sm lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          aria-label="Open navigation menu"
          aria-controls="primary-navigation-sheet"
          aria-expanded={isMobileOpen}
          onClick={() => setIsMobileOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sidebar-foreground transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-sidebar-primary">
          <Trophy className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">FPL Analyst</p>
          <p className="truncate text-[11px] text-sidebar-foreground/65">
            GW {gameweek || "—"} · {DATA_SEASON.label}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-medium text-sidebar-foreground/80">
          <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-400" : "bg-emerald-400"}`} />
          Synced
        </span>
      </header>

      {isMobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => closeMobileMenu()}
        />
      )}

      <aside
        id="primary-navigation-sheet"
        role={isMobileOpen ? "dialog" : undefined}
        aria-modal={isMobileOpen ? true : undefined}
        aria-label={isMobileOpen ? "Primary navigation" : undefined}
        className={`mobile-navigation-sheet fixed inset-y-0 left-0 z-50 w-[min(19rem,88vw)] border-r border-sidebar-border bg-sidebar shadow-2xl transition-transform duration-200 lg:z-30 lg:w-72 lg:translate-x-0 lg:shadow-none ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 px-5">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/8 text-sidebar-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-sidebar-foreground">
                FPL Analyst
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-sidebar-foreground/60">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-500" : DATA_SEASON.isComplete ? "bg-amber-500" : "bg-emerald-500"}`}
                />
                <span className="truncate">
                  GW {gameweek || "—"} · {DATA_SEASON.label}
                </span>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              aria-label="Close navigation menu"
              onClick={() => closeMobileMenu()}
              className="grid h-11 w-11 place-items-center rounded-xl text-sidebar-foreground/70 transition-colors hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
              Analytics
            </div>
            <div className="space-y-1">
              {navigation.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => closeMobileMenu(false)}
                    className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${active ? "bg-white/10 font-semibold text-sidebar-foreground" : "font-medium text-sidebar-foreground/68 hover:bg-white/7 hover:text-sidebar-foreground"}`}
                  >
                    {active ? (
                      <span
                        className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary"
                        aria-hidden="true"
                      />
                    ) : null}
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-sidebar-foreground/55">
                <Clock className="h-3.5 w-3.5" />
                Last synced
              </div>
              <div className="mt-1 text-sm font-medium text-sidebar-foreground">
                {lastSyncedAt
                  ? new Date(lastSyncedAt).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Unknown"}
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="hidden w-72 shrink-0 lg:block" />
    </>
  );
}
