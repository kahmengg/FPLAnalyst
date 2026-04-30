"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Calendar, RefreshCw, Shield, Users, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getHealth, getPlayers, formatLastUpdated, positionLabel, teamBadgeClass } from "@/lib/api"

export default function DashboardPage() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getHealth>> | null>(null)
  const [topPlayers, setTopPlayers] = useState<Awaited<ReturnType<typeof getPlayers>>["players"]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [health, players] = await Promise.all([
          getHealth(),
          getPlayers({ sort: "last_gw_points", order: "desc", limit: 3 }),
        ])

        if (!active) return

        setSummary(health)
        setTopPlayers(players.players || [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load dashboard")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="rounded-full border-2 border-slate-300 border-t-emerald-500 h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-lg font-semibold">Dashboard unavailable</p>
            <p className="text-sm text-muted-foreground">{error || "Unable to load summary data."}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-background"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const quickStats = [
    {
      label: "Total Players",
      value: summary.total_players.toLocaleString(),
      icon: Users,
      tone: "emerald",
    },
    {
      label: "Latest Gameweek",
      value: summary.latest_gameweek.toString(),
      icon: Calendar,
      tone: "blue",
    },
    {
      label: "Last Updated",
      value: formatLastUpdated(summary.last_updated),
      icon: Shield,
      tone: "slate",
    },
  ]

  const navCards = [
    {
      href: "/players",
      title: "Players",
      description: "Filter, sort, and compare every player.",
      icon: Users,
    },
    {
      href: "/teams",
      title: "Teams",
      description: "Rank sides by attack, defense, and home/away splits.",
      icon: TrendingUp,
    },
    {
      href: "/fixtures",
      title: "Fixtures",
      description: "Inspect difficulty grids and upcoming runs.",
      icon: Calendar,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-secondary/20 p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">FPL Analyst</p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Dashboard</h1>
          <p className="max-w-2xl text-muted-foreground">
            A lightweight entry point for the season overview, top performers, team strength, and fixture planning.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="border-border/60 bg-background/80 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Top 3 by last GW points</h2>
            <Badge variant="outline">{summary.status}</Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {topPlayers.map((player, index) => (
              <Card key={player.id} className="border-border/60 bg-background/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-lg">#{index + 1} {player.name}</CardTitle>
                    <Badge className={teamBadgeClass(player.team_short)}>{player.team_short}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Position</span>
                    <span>{positionLabel(player.position)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last GW</span>
                    <span className="font-semibold">{player.last_gw_points}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Season points</span>
                    <span className="font-semibold">{player.total_points}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {navCards.map((card) => {
            const Icon = card.icon
            return (
              <Link key={card.href} href={card.href}>
                <Card className="h-full border-border/60 bg-background/80 backdrop-blur-sm transition-transform hover:-translate-y-1 hover:shadow-lg">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </section>
      </div>
    </div>
  )
}
