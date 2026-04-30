"use client";
import Link from "next/link"
import { Users, Trophy, Calendar, Clock, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { getDashboardSummary, getAllPlayers } from "@/lib/supabase"

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
    href: "/players",
    icon: Users,
    color: "from-blue-500/20 to-blue-600/20",
    borderColor: "border-blue-500/30",
  },
  {
    title: "Teams",
    description: "View team strength and squad details",
    href: "/teams",
    icon: Trophy,
    color: "from-amber-500/20 to-amber-600/20",
    borderColor: "border-amber-500/30",
  },
  {
    title: "Fixtures",
    description: "Analyze upcoming fixtures and difficulty ratings",
    href: "/fixtures",
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
        const dashboardData = await getDashboardSummary()
        setSummary(dashboardData)

        // Get top 3 form players
        const allPlayers = await getAllPlayers(1000)
        const formPlayers = allPlayers
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

  const quickStats = [
    { label: "Total Players", value: summary?.total_players || "0", icon: Users, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { label: "Current Gameweek", value: `GW ${summary?.total_gameweeks || "0"}`, icon: Calendar, color: "text-purple-500", bgColor: "bg-purple-500/10" },
    { label: "Last Synced", value: formatLastSynced(summary?.last_synced_at), icon: Clock, color: "text-orange-500", bgColor: "bg-orange-500/10" },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-4 py-2 mb-6 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">FPL Analytics</span>
          </div>

          <h1 className="mb-4 text-5xl sm:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent leading-tight">
            FPL Analyst
          </h1>
          <p className="text-xl sm:text-2xl font-medium text-emerald-600 dark:text-emerald-400 mb-3">
            Your Strategic Advantage
          </p>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
            Comprehensive Fantasy Premier League analytics and insights
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="mb-12">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            {quickStats.map((stat, index) => (
              <Card
                key={stat.label}
                className="group relative overflow-hidden border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-8"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: "both",
                }}
              >
                <div className={`absolute inset-0 ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <CardContent className="relative flex items-center gap-4 p-6">
                  <div className={`rounded-xl ${stat.bgColor} p-3 transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Top Form Players */}
        {topFormPlayers.length > 0 && (
          <div className="mb-12">
            <Card className="border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-lg">
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
                    <div key={idx} className="p-4 rounded-lg border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-shadow">
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
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Explore Analytics
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-3">
            {navigationCards.map((card, index) => (
              <Link key={card.title} href={card.href} className="group block">
                <Card
                  className={`relative overflow-hidden border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98] active:shadow-md h-full animate-in fade-in slide-in-from-bottom-8 ${card.borderColor}`}
                  style={{
                    animationDelay: `${(index * 100) + 500}ms`,
                    animationFillMode: "both",
                  }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-all duration-500`}></div>

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
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
