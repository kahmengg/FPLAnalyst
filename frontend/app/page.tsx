"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowRight, Calendar, Clock3, GitCompareArrows, Repeat2, Scale, ShieldCheck, Target, Trophy, Users } from "lucide-react"

import { ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { getDashboardSummary } from "@/lib/supabase"

type DashboardSummary = {
  total_players: number
  total_teams: number
  total_gameweeks: number
  last_synced_at: string | null
}

const modules = [
  { title: "Top players", description: "Form, value, goals, assists and defensive contribution.", href: "/top-performers", icon: Users },
  { title: "Team rankings", description: "Compare attacking and defensive strength across the league.", href: "/team-rankings", icon: Trophy },
  { title: "Fixtures", description: "Scan upcoming opponents, difficulty and projected opportunity.", href: "/fixture-analysis", icon: Calendar },
  { title: "Player comparison", description: "Compare same-position players using output and underlying data.", href: "/player-trends", icon: GitCompareArrows },
  { title: "Transfer planner", description: "Spot fixture swings, then open a club to inspect its strongest player picks.", href: "/transfer-targets", icon: Repeat2 },
]

const modelNotes = [
  {
    title: "Compared by role",
    description: "Every eligible player is measured against players in the same position and time window. A score of 50 is roughly role average.",
    icon: Scale,
  },
  {
    title: "Process before points",
    description: "Attack scores combine xG, xA, box activity, shooting and chance creation. They describe underlying involvement—not predicted FPL points.",
    icon: Target,
  },
  {
    title: "A repeatable floor",
    description: "Defensive-floor scores combine contribution returns, actions per 90 and minute security to identify more dependable routes to points.",
    icon: ShieldCheck,
  },
]

function formatLastSynced(value: string | null) {
  if (!value) return "Unknown"
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dashboardData = await getDashboardSummary()
      if (!dashboardData.total_players) throw new Error("No FPL data was returned for the configured season.")
      setSummary(dashboardData as DashboardSummary)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  if (loading) return <PageSkeleton label="Loading dashboard" />
  if (error) return <ErrorState title="Dashboard unavailable" description={error} onAction={() => void fetchData()} />

  const stats = [
    { label: "Tracked players", value: summary?.total_players.toLocaleString() ?? "0", icon: Users },
    { label: "League teams", value: summary?.total_teams.toString() ?? "0", icon: Trophy },
    { label: "Latest gameweek", value: `GW ${summary?.total_gameweeks ?? 0}`, icon: Calendar },
    { label: "Last synced", value: formatLastSynced(summary?.last_synced_at ?? null), icon: Clock3 },
  ]

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Decision workspace"
          title="Make the next gameweek count."
          description="A focused view of form, fixtures, team strength and transfer signals—built to turn FPL data into confident decisions."
          actions={<Button asChild><Link href="/transfer-targets">Plan transfers<ArrowRight className="h-4 w-4" /></Link></Button>}
        />

        <section aria-label="Dataset overview" className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={stat.label} className={`flex min-h-28 items-center gap-4 p-5 sm:p-6 ${index ? "border-t border-border sm:border-l sm:border-t-0" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t xl:border-l xl:border-t-0" : ""}`}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><stat.icon className="h-5 w-5" aria-hidden="true" /></div>
                <div className="min-w-0"><p className="truncate font-mono text-xl font-semibold tabular-nums text-foreground">{stat.value}</p><p className="mt-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{stat.label}</p></div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section aria-labelledby="model-title">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Model guide</p><h2 id="model-title" className="mt-1 text-3xl font-medium">What the scores mean</h2></div>
              <Button asChild variant="ghost" size="sm"><Link href="/top-performers">Explore scores<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border p-5 sm:p-6">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">The model converts different underlying statistics into position-relative 0–100 ratings. Use the ratings to understand how a player can score points, then use the raw metrics and fixtures to make the final decision.</p>
              </div>
              <div className="divide-y divide-border">
                {modelNotes.map((note) => (
                  <div key={note.title} className="flex gap-4 p-5 sm:p-6">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><note.icon className="h-5 w-5" aria-hidden="true" /></div>
                    <div><h3 className="font-sans text-sm font-semibold text-foreground">{note.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{note.description}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="modules-title">
            <div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Analysis modules</p><h2 id="modules-title" className="mt-1 text-3xl font-medium">Explore the data</h2></div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {modules.map((module, index) => (
                <Link key={module.href} href={module.href} className={`group flex items-start gap-4 p-4 transition-colors hover:bg-secondary/35 sm:p-5 ${index ? "border-t border-border" : ""}`}>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors group-hover:text-foreground"><module.icon className="h-5 w-5" aria-hidden="true" /></div>
                  <div className="min-w-0 flex-1"><h3 className="font-sans text-sm font-semibold text-foreground">{module.title}</h3><p className="mt-1 text-sm leading-5 text-muted-foreground">{module.description}</p></div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
