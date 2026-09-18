"use client";
import Link from "next/link"
import { Users, Trophy, Calendar, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { getDashboardSummary, getPlayerInsights } from "@/lib/supabase"

function formatLastSynced(value: string | null) {
  if (!value) return "Unknown"
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface TopFormPlayer {
  name: string
  team: string
  team_short: string
  position_name: string
  form: number
}

const navigationCards = [
  {
    title: "Players",
    description: "Browse all players with advanced filters and sorting",
    href: "/top-performers",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/20",
    borderColor: "border-blue-500/30",
  },
  {
    title: "Teams",
    description: "View team strength and squad details",
    href: "/team-rankings",
    icon: Trophy,
    color: "from-amber-500/20 to-amber-600/20",
    borderColor: "border-amber-500/30",
  },
  {
    title: "Fixtures",
    description: "Analyze upcoming fixtures and difficulty ratings",
    href: "/fixture-analysis",
    icon: Calendar,
    color: "from-purple-500/20 to-purple-600/20",
    borderColor: "border-purple-500/30",
  },
]

export default function HomePage() {
  const [summary, setSummary] = useState<any>(null)
  const [topFormPlayers, setTopFormPlayers] = useState<TopFormPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // These requests are independent, so load the dashboard in one round.
        const [dashboardData, seasonPerformers] = await Promise.all([
          getDashboardSummary(),
          getPlayerInsights("season_performers", 100),
        ])
        setSummary(dashboardData)

        // Form lives in player_season_stats, not in the players table.
        const formPlayers = seasonPerformers
          .filter((p: any) => p.form && p.form > 0)
          .sort((a: any, b: any) => (b.form || 0) - (a.form || 0))
          .slice(0, 3)
          .map((p: any) => ({
            name: p.web_name || p.player_name,
            team: p.team,
            team_short: p.team_short || p.team?.slice(0, 3).toUpperCase() || "",
            position_name: p.position_name || p.position,
            form: p.form || 0,
          }))

        setTopFormPlayers(formPlayers)

        if (!dashboardData.total_players && formPlayers.length === 0) {
          throw new Error("Supabase returned no FPL data. Check the season key, schema, ETL sync, and read policies.")
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error"
        setError(`Failed to fetch data: ${message}`)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg">
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">Dashboard data could not be loaded</h2>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickStats = [
    { label: "Total Players", value: summary?.total_players || "0", icon: Users },
    { label: "Current Gameweek", value: `GW ${summary?.total_gameweeks || "0"}`, icon: Calendar },
    { label: "Last Synced", value: formatLastSynced(summary?.last_synced_at), icon: Clock },
  ]

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-success"></div>
            <span className="text-sm font-medium text-foreground">FPL Analytics</span>
          </div>

          <h1 className="mb-4 text-5xl font-semibold leading-tight tracking-tight text-foreground sm:text-6xl">
            FPL Analyst
          </h1>
          <p className="mb-3 text-xl font-medium text-foreground sm:text-2xl">
            Your Strategic Advantage
          </p>
          <p className="text-base text-muted-foreground sm:text-lg">
            Comprehensive Fantasy Premier League analytics and insights
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="mb-12">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            {quickStats.map((stat, index) => (
              <Card
                key={stat.label}
                className="group relative overflow-hidden bg-card transition-colors hover:bg-muted/35"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: "both",
                }}
              >
                <CardContent className="relative flex items-center gap-4 p-6">
                  <div className="rounded-xl bg-muted p-3">
                    <stat.icon className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Top Form Players */}
        {topFormPlayers.length > 0 && (
          <div className="mb-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  Top Form Players This Week
                </CardTitle>
                <CardDescription>Players with the highest form scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  {topFormPlayers.map((player, idx) => (
                    <div key={idx} className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-foreground">{player.name}</div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          player.form >= 7 ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" :
                          player.form >= 5 ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" :
                          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                        }`}>
                          {player.form.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                        <span>{player.team_short}</span>
                        <span>{player.position_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="mb-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Explore Analytics
            </h2>
            <div className="mx-auto h-px w-24 bg-border"></div>
          </div>

          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            {navigationCards.map((card, index) => (
              <Link key={card.title} href={card.href} className="group block">
                <Card
                  className="relative h-full overflow-hidden bg-card transition-colors hover:bg-muted/35"
                  style={{
                    animationDelay: `${(index * 100) + 500}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <CardContent className="relative p-6 sm:p-8 h-full flex flex-col">
                    <div className="mb-4 p-4 bg-secondary/50 rounded-xl w-fit">
                      <card.icon className="h-8 w-8" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground group-hover:text-opacity-90">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 flex-1">
                      {card.description}
                    </p>

                    <div className="flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all">
                      <span>Explore</span>
                      <ArrowRight className="h-4 w-4  transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
