"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Trophy, Calendar, Menu, X, Clock, GitCompareArrows, Repeat2 } from "lucide-react"
import { useEffect, useState } from "react"
import { getDashboardSummary } from "@/lib/supabase"
import { DATA_SEASON } from "@/lib/season"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Top Players", href: "/top-performers", icon: Users },
  { name: "Teams", href: "/team-rankings", icon: Trophy },
  { name: "Fixtures", href: "/fixture-analysis", icon: Calendar },
  { name: "Compare Players", href: "/player-trends", icon: GitCompareArrows },
  { name: "Transfer Planner", href: "/transfer-targets", icon: Repeat2 },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [gameweek, setGameWeek] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const summary = await getDashboardSummary()
        setGameWeek(summary.total_gameweeks)
        setLastSyncedAt(summary.last_synced_at)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to load sync status")
      }
    }
    fetchData()
  }, [])

  return (
    <>
      <button
        aria-label="Open navigation menu"
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-50 grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground shadow-sm lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isMobileOpen && (
        <button
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:z-30 lg:translate-x-0 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 px-5">
            <div className="grid h-10 w-10 place-items-center rounded-lg border border-sidebar-border bg-card text-sidebar-foreground shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-sidebar-foreground">FPL Analyst</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${error ? "bg-red-500" : DATA_SEASON.isComplete ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span className="truncate">GW {gameweek || "—"} · {DATA_SEASON.label}</span>
              </div>
            </div>
            <button aria-label="Close navigation menu" onClick={() => setIsMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Analytics</div>
            <div className="space-y-1">
              {navigation.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setIsMobileOpen(false)}
                    className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-card font-semibold text-sidebar-foreground shadow-sm" : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                  >
                    {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" aria-hidden="true" /> : null}
                    <item.icon className="h-[18px] w-[18px]" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="rounded-lg border border-sidebar-border bg-card/65 p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last synced
              </div>
              <div className="mt-1 text-sm font-medium text-sidebar-foreground">
                {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Unknown"}
              </div>
            </div>
          </div>
        </div>
      </aside>
      <div className="hidden w-72 shrink-0 lg:block" />
    </>
  )
}
