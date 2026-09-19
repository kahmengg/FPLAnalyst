"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { ArrowRight, Calendar, Clock3, GitCompareArrows, Repeat2, Sparkles, Trophy, Users } from "lucide-react"

import { ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { PlayerSummaryCard } from "@/components/player-summary-card"
import { Button } from "@/components/ui/button"
import { getDashboardSummary, getPlayerInsights } from "@/lib/supabase"

type DashboardSummary = {
  total_players: number
  total_teams: number
  total_gameweeks: number
  last_synced_at: string | null
}

type TopFormPlayer = {
  name: string
  team: string
  teamShort: string
  position: string
  form: number
  price?: number
  points?: number
  ownership?: number
}

const modules = [
  { title: "Top players", description: "Form, value, goals, assists and defensive contribution.", href: "/top-performers", icon: Users },
  { title: "Team rankings", description: "Compare attacking and defensive strength across the league.", href: "/team-rankings", icon: Trophy },
  { title: "Fixtures", description: "Scan upcoming opponents, difficulty and projected opportunity.", href: "/fixture-analysis", icon: Calendar },
  { title: "Player comparison", description: "Compare same-position players using output and underlying data.", href: "/player-trends", icon: GitCompareArrows },
  { title: "Recommendations", description: "Shortlists for attacking, defensive and differential picks.", href: "/quick-picks", icon: Sparkles },
  { title: "Transfer planner", description: "Spot fixture swings and plan moves across two horizons.", href: "/transfer-targets", icon: Repeat2 },
]

function formatLastSynced(value: string | null) {
  if (!value) return "Unknown"
  return new Date(value).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

export default function HomePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [topFormPlayers, setTopFormPlayers] = useState<TopFormPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Dashboard facts and player insights are independent requests.
      const [dashboardData, seasonPerformers] = await Promise.all([
        getDashboardSummary(),
        getPlayerInsights("season_performers", 100),
      ])
      const players = seasonPerformers
        .filter((player: any) => Number(player.form) > 0)
        .sort((a: any, b: any) => Number(b.form || 0) - Number(a.form || 0))
        .slice(0, 3)
        .map((player: any) => ({
          name: player.web_name || player.player_name || player.player,
          team: player.team,
          teamShort: player.team_short || player.team,
          position: player.position_name || player.position,
          form: Number(player.form || 0),
          price: Number(player.price ?? player.cost ?? 0),
          points: Number(player.points ?? player.total_points ?? 0),
          ownership: Number(player.ownership ?? player.selected_by_percent ?? 0),
        }))

      if (!dashboardData.total_players && players.length === 0) throw new Error("No FPL data was returned for the configured season.")
      setSummary(dashboardData as DashboardSummary)
      setTopFormPlayers(players)
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
          actions={<Button asChild><Link href="/quick-picks">View recommendations<ArrowRight className="h-4 w-4" /></Link></Button>}
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
          <section aria-labelledby="form-title">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Current signal</p><h2 id="form-title" className="mt-1 text-3xl font-medium">Players in form</h2></div>
              <Button asChild variant="ghost" size="sm"><Link href="/top-performers">All players<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
            <div className="grid gap-3">
              {topFormPlayers.map((player, index) => (
                <PlayerSummaryCard key={player.name} rank={index + 1} player={{ name: player.name, teamCode: player.teamShort, teamName: player.team, position: player.position, form: player.form, price: player.price, totalPoints: player.points, ownership: player.ownership }} />
              ))}
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
