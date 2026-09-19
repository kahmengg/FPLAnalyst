"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Check,
  ChevronDown,
  Search,
  Shield,
  Sparkles,
  Target,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import { getComparisonPlayers, getPlayerTrends } from "@/lib/supabase"

type Position = 1 | 2 | 3 | 4
type CompareMode = "output" | "underlying" | "security"

type Player = {
  id: string
  player_name: string
  web_name: string
  team: string
  team_short?: string
  position: Position
  cost: number
  ownership: number
  total_minutes: number
  total_points: number
  gameweeks_played: number
  form: number
  xgi_per90: number
  xg_per90: number
  xa_per90: number
  shots_per90: number
}

type GameweekData = {
  gameweek: number
  opponent: string
  was_home: boolean | null
  match_score: string | null
  total_points: number
  minutes: number
  goals: number
  assists: number
  clean_sheets: number
  xG: number
  xA: number
  xGI: number
  xP: number
  shots: number
  shots_on_target: number
  key_passes: number
  touches: number
  penalty_area_touches: number
  defensive_contribution: number
  xGC: number
  goals_conceded: number
}

type PlayerTrendData = {
  player_name: string
  team: string
  team_short?: string
  position: Position
  web_name: string
  cost: number
  ownership: number
  form: {
    avg_points: number
    avg_minutes: number
    games_played: number
  }
  total_stats: {
    games_played: number
    total_points: number
    total_goals: number
    total_assists: number
    total_xG: number
    total_xA: number
    total_xGI: number
    total_xP: number
    total_minutes: number
    total_shots: number
    total_key_passes: number
  }
  per90_stats: {
    points_per_90: number
    goals_per_90: number
    assists_per_90: number
    xG_per_90: number
    xA_per_90: number
    xGI_per_90: number
    shots_per_90: number
    key_passes_per_90: number
  }
  gameweeks: GameweekData[]
}

const POSITION_META: Record<Position, { label: string; short: string }> = {
  1: { label: "Goalkeepers", short: "GK" },
  2: { label: "Defenders", short: "DEF" },
  3: { label: "Midfielders", short: "MID" },
  4: { label: "Forwards", short: "FWD" },
}

// Distinct chart colors are intentionally limited to data visualization.
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]
const MAX_PLAYERS = 4

const MODE_META: Record<CompareMode, { label: string; description: string }> = {
  output: {
    label: "FPL Output",
    description: "What has actually returned points: recent form, points rate and end product.",
  },
  underlying: {
    label: "Underlying Attack",
    description: "Chance quality and involvement before FPL returns: xG, xA, xGI, shots and key passes.",
  },
  security: {
    label: "Minutes / Security",
    description: "How safe the minutes look: recent playing time, 60+ minute appearances and season workload.",
  },
}

function fmt(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0"
  return value.toFixed(digits).replace(/\.0$/, "")
}

function lastN(gws: GameweekData[], n = 5) {
  return [...gws].sort((a, b) => a.gameweek - b.gameweek).slice(-n)
}

function avg(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

type PlayerMetric = {
  data: PlayerTrendData
  recentPoints: number
  recentMinutes: number
  recentXGI: number
  recentDefCon: number
  recentCS: number
}

type RecentColumn = {
  label: string
  value: (gameweek: GameweekData) => string | number
  emphasize?: boolean
}

// Each role gets only the gameweek metrics that map to realistic FPL point routes.
function recentColumns(position: Position): RecentColumn[] {
  const common: RecentColumn[] = [
    { label: "Score", value: (gw) => gw.match_score || "—" },
    { label: "Pts", value: (gw) => gw.total_points, emphasize: true },
    { label: "Min", value: (gw) => gw.minutes },
  ]

  if (position === 1) {
    return [...common, { label: "CS", value: (gw) => gw.clean_sheets > 0 ? "Yes" : "—" }, { label: "GC", value: (gw) => gw.goals_conceded }, { label: "xGC", value: (gw) => fmt(gw.xGC, 2) }]
  }
  if (position === 2) {
    return [...common, { label: "CS", value: (gw) => gw.clean_sheets > 0 ? "Yes" : "—" }, { label: "DC", value: (gw) => fmt(gw.defensive_contribution, 1) }, { label: "xGI", value: (gw) => fmt(gw.xGI, 2) }]
  }
  if (position === 3) {
    return [...common, { label: "G", value: (gw) => gw.goals }, { label: "A", value: (gw) => gw.assists }, { label: "xGI", value: (gw) => fmt(gw.xGI, 2) }, { label: "DC", value: (gw) => fmt(gw.defensive_contribution, 1) }]
  }
  return [...common, { label: "G", value: (gw) => gw.goals }, { label: "A", value: (gw) => gw.assists }, { label: "xGI", value: (gw) => fmt(gw.xGI, 2) }, { label: "Shots", value: (gw) => gw.shots }]
}

function summaryMetrics(item: PlayerMetric) {
  const { data } = item
  const recent = lastN(data.gameweeks, 5)
  const xGCPerMatch = avg(recent.map((gw) => gw.xGC))

  if (data.position === 1) {
    return [
      { label: "Last 5 pts", value: fmt(item.recentPoints, 1) },
      { label: "Clean-sheet rate", value: `${fmt(item.recentCS * 100, 0)}%` },
      { label: "xGC / match", value: fmt(xGCPerMatch, 2) },
      { label: "Avg mins", value: fmt(item.recentMinutes, 0) },
    ]
  }
  if (data.position === 2) {
    return [
      { label: "Last 5 pts", value: fmt(item.recentPoints, 1) },
      { label: "Clean-sheet rate", value: `${fmt(item.recentCS * 100, 0)}%` },
      { label: "Def. con / match", value: fmt(item.recentDefCon, 1) },
      { label: "xGI / 90", value: fmt(data.per90_stats.xGI_per_90, 2) },
    ]
  }
  if (data.position === 3) {
    return [
      { label: "Last 5 pts", value: fmt(item.recentPoints, 1) },
      { label: "xGI / 90", value: fmt(data.per90_stats.xGI_per_90, 2) },
      { label: "Def. con / match", value: fmt(item.recentDefCon, 1) },
      { label: "Avg mins", value: fmt(item.recentMinutes, 0) },
    ]
  }
  return [
    { label: "Last 5 pts", value: fmt(item.recentPoints, 1) },
    { label: "xGI / 90", value: fmt(data.per90_stats.xGI_per_90, 2) },
    { label: "Shots / 90", value: fmt(data.per90_stats.shots_per_90, 2) },
    { label: "Avg mins", value: fmt(item.recentMinutes, 0) },
  ]
}

export default function PlayerTrendsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedNames, setSelectedNames] = useState<string[]>([])
  const [trendData, setTrendData] = useState<Record<string, PlayerTrendData>>({})
  const [position, setPosition] = useState<Position | null>(null)
  const [query, setQuery] = useState("")
  const [team, setTeam] = useState("all")
  const [loading, setLoading] = useState(true)
  const [loadingTrends, setLoadingTrends] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<CompareMode>("output")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setLoading(true)
        const nextPlayers = (await getComparisonPlayers()) as Player[]
        // Ignore a late response after navigation or a development remount.
        if (active) setPlayers(nextPlayers)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load players")
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedNames.length) {
      setTrendData({})
      return
    }

    let active = true
    ;(async () => {
      try {
        setLoadingTrends(true)
        setError(null)
        const nextTrends = (await getPlayerTrends(selectedNames, 10)) as Record<string, PlayerTrendData>
        // Selection can change while Supabase is responding; only render the latest request.
        if (active) setTrendData(nextTrends)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Failed to load comparison")
      } finally {
        if (active) setLoadingTrends(false)
      }
    })()
    return () => { active = false }
  }, [selectedNames])

  const teams = useMemo(() => {
    const base = position ? players.filter((player) => player.position === position) : players
    return [...new Set(base.map((player) => player.team).filter(Boolean))].sort()
  }, [players, position])

  const eligiblePlayers = useMemo(() => {
    if (!position) return []
    const normalizedQuery = query.trim().toLowerCase()

    return players
      .filter((player) => player.position === position)
      .filter((player) => team === "all" || player.team === team)
      .filter((player) => {
        if (!normalizedQuery) return true
        return `${player.web_name} ${player.player_name} ${player.team}`.toLowerCase().includes(normalizedQuery)
      })
      .sort((a, b) => {
        if (b.total_minutes !== a.total_minutes) return b.total_minutes - a.total_minutes
        return b.form - a.form
      })
      .slice(0, query.trim() ? 16 : 10)
  }, [players, position, query, team])

  const selectedPlayers = useMemo(
    () =>
      selectedNames
        .map((name) => players.find((player) => (player.web_name || player.player_name) === name))
        .filter(Boolean) as Player[],
    [players, selectedNames]
  )

  const selectPosition = (next: Position) => {
    if (position === next) return
    setPosition(next)
    setSelectedNames([])
    setTrendData({})
    setQuery("")
    setTeam("all")
  }

  const togglePlayer = (player: Player) => {
    const name = player.web_name || player.player_name
    if (selectedNames.includes(name)) {
      setSelectedNames((current) => current.filter((item) => item !== name))
      return
    }
    if (selectedNames.length >= MAX_PLAYERS) return
    setSelectedNames((current) => [...current, name])
  }

  const metrics = useMemo(() => {
    return selectedNames.map((name) => {
      const data = trendData[name]
      if (!data) return null
      const recent = lastN(data.gameweeks, 5)
      return {
        name,
        data,
        recentPoints: avg(recent.map((gw) => gw.total_points)),
        recentMinutes: avg(recent.map((gw) => gw.minutes)),
        recentXGI: avg(recent.map((gw) => gw.xGI)),
        recentDefCon: avg(recent.map((gw) => gw.defensive_contribution)),
        recentCS: recent.length ? recent.filter((gw) => gw.clean_sheets > 0).length / recent.length : 0,
      }
    }).filter(Boolean) as Array<{
      name: string
      data: PlayerTrendData
      recentPoints: number
      recentMinutes: number
      recentXGI: number
      recentDefCon: number
      recentCS: number
    }>
  }, [selectedNames, trendData])

  const metricRows = useMemo(() => {
    if (mode === "security") {
      return [
        { label: "Last 5 avg minutes", key: "recentMinutes", values: metrics.map((item) => item.recentMinutes), digits: 0 },
        {
          label: "Last 5: 60+ mins",
          key: "recent60",
          values: metrics.map((item) => {
            const recent = lastN(item.data.gameweeks, 5)
            return recent.length ? (recent.filter((gw) => gw.minutes >= 60).length / recent.length) * 100 : 0
          }),
          suffix: "%",
          digits: 0,
        },
        {
          label: "Season avg minutes",
          key: "seasonAvgMinutes",
          values: metrics.map((item) => item.data.total_stats.games_played ? item.data.total_stats.total_minutes / item.data.total_stats.games_played : 0),
          digits: 0,
        },
        { label: "Games played", key: "gamesPlayed", values: metrics.map((item) => item.data.total_stats.games_played), digits: 0 },
        { label: "Total minutes", key: "totalMinutes", values: metrics.map((item) => item.data.total_stats.total_minutes), digits: 0 },
      ]
    }

    if (mode === "underlying") {
      return [
        { label: "xGI / 90", key: "xgi90", values: metrics.map((item) => item.data.per90_stats.xGI_per_90) },
        { label: "xG / 90", key: "xg90", values: metrics.map((item) => item.data.per90_stats.xG_per_90) },
        { label: "xA / 90", key: "xa90", values: metrics.map((item) => item.data.per90_stats.xA_per_90) },
        { label: "Shots / 90", key: "shots90", values: metrics.map((item) => item.data.per90_stats.shots_per_90) },
        { label: "Key passes / 90", key: "kp90", values: metrics.map((item) => item.data.per90_stats.key_passes_per_90) },
        { label: "Last 5 avg xGI", key: "recentXGI", values: metrics.map((item) => item.recentXGI) },
      ]
    }

    if (position === 1 || position === 2) {
      return [
        { label: "Last 5 avg pts", key: "recentPoints", values: metrics.map((item) => item.recentPoints) },
        { label: "Points / 90", key: "points90", values: metrics.map((item) => item.data.per90_stats.points_per_90) },
        { label: "Total points", key: "totalPoints", values: metrics.map((item) => item.data.total_stats.total_points), digits: 0 },
        { label: "Last 5 clean sheet %", key: "recentCS", values: metrics.map((item) => item.recentCS * 100), suffix: "%", digits: 0 },
        { label: "Last 5 def. contrib.", key: "recentDefCon", values: metrics.map((item) => item.recentDefCon) },
      ]
    }

    return [
      { label: "Last 5 avg pts", key: "recentPoints", values: metrics.map((item) => item.recentPoints) },
      { label: "Points / 90", key: "points90", values: metrics.map((item) => item.data.per90_stats.points_per_90) },
      { label: "Total points", key: "totalPoints", values: metrics.map((item) => item.data.total_stats.total_points), digits: 0 },
      { label: "Goals", key: "goals", values: metrics.map((item) => item.data.total_stats.total_goals), digits: 0 },
      { label: "Assists", key: "assists", values: metrics.map((item) => item.data.total_stats.total_assists), digits: 0 },
    ]
  }, [metrics, mode, position])

  if (loading) {
    return <PageSkeleton label="Loading player comparison data" />
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Player comparison"
          title="Compare players in the same role."
          description="Choose a position, then compare up to four active players using current-season output, underlying threat, and minute security."
        />

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">1. Choose a position</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([1, 2, 3, 4] as Position[]).map((value) => {
                  const meta = POSITION_META[value]
                  const active = position === value
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={active ? "default" : "outline"}
                      className="h-auto justify-start gap-3 px-3 py-3"
                      onClick={() => selectPosition(value)}
                    >
                      <span className="rounded-md bg-background/20 px-2 py-1 text-xs font-semibold">{meta.short}</span>
                      <span className="truncate">{meta.label}</span>
                    </Button>
                  )
                })}
              </div>
            </div>

            {position && (
              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">2. Add players</div>
                    <p className="mt-1 text-sm text-muted-foreground">Showing active {POSITION_META[position].label.toLowerCase()} with minutes this season.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{selectedNames.length}/{MAX_PLAYERS} selected</span>
                </div>

                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
                  <label className="relative block">
                    <span className="sr-only">Search players</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={`Search ${POSITION_META[position].short} by name or club…`}
                      className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                  <label className="relative block">
                    <span className="sr-only">Filter by club</span>
                    <select
                      value={team}
                      onChange={(event) => setTeam(event.target.value)}
                      className="h-11 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-9 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    >
                      <option value="all">All clubs</option>
                      {teams.map((club) => <option key={club} value={club}>{club}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </label>
                </div>

                {selectedPlayers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPlayers.map((player, index) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => togglePlayer(player)}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-sm"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES[index] }} />
                        <span className="font-medium">{player.web_name}</span>
                        <TeamBadge code={player.team_short || player.team} className="h-6 min-w-9 px-1.5 text-[10px]" />
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-border/70">
                  <div className="grid min-w-[560px] grid-cols-[minmax(0,1fr)_80px_80px_72px] gap-2 border-b border-border/60 bg-secondary/25 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <span>Player</span><span className="text-right">Minutes</span><span className="text-right">Form</span><span className="text-right">Price</span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {eligiblePlayers.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">No eligible players match your filters.</div>
                    ) : eligiblePlayers.map((player) => {
                      const name = player.web_name || player.player_name
                      const selected = selectedNames.includes(name)
                      const disabled = !selected && selectedNames.length >= MAX_PLAYERS
                      return (
                        <button
                          key={player.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => togglePlayer(player)}
                          className="grid min-w-[560px] w-full grid-cols-[minmax(0,1fr)_80px_80px_72px] items-center gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {selected ? <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span> : <TeamBadge code={player.team_short || player.team} className="h-8 min-w-10 px-1.5 text-[10px]" />}
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{player.web_name || player.player_name}</span>
                              <span className="block truncate text-xs text-muted-foreground">{player.team}</span>
                            </span>
                          </span>
                          <span className="text-right tabular-nums">{player.total_minutes}</span>
                          <span className="text-right tabular-nums">{fmt(player.form)}</span>
                          <span className="text-right tabular-nums">£{fmt(player.cost)}m</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!position ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Target className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Start with a position</p>
                <p className="mt-1 text-sm text-muted-foreground">This keeps every comparison meaningful.</p>
              </div>
            </CardContent>
          </Card>
        ) : selectedNames.length < 2 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Pick at least two {POSITION_META[position].short}s</p>
                <p className="mt-1 text-sm text-muted-foreground">You can compare up to four players at once.</p>
              </div>
            </CardContent>
          </Card>
        ) : loadingTrends ? (
          <div className="rounded-xl border border-border/60 px-5 py-10 text-center text-sm text-muted-foreground">Building comparison…</div>
        ) : metrics.length < 2 ? (
          <Card className="border-dashed">
            <CardContent className="px-6 py-12 text-center">
              <p className="font-medium">Comparison data is unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">Try different players or reload the page. The selector remains available above.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="gap-4 pb-3">
                <div>
                  <CardTitle className="text-lg">At a glance</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{MODE_META[mode].description}</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(Object.keys(MODE_META) as CompareMode[]).map((value) => {
                    const active = mode === value
                    const Icon = value === "output" ? Sparkles : value === "underlying" ? Target : Shield
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMode(value)}
                        className={`flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/45 text-foreground hover:bg-secondary/70"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="font-medium">{MODE_META[value].label}</span>
                      </button>
                    )
                  })}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="border-y border-border/60 bg-secondary/20">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Metric</th>
                      {metrics.map((item, index) => (
                        <th key={item.name} className="px-4 py-3 text-right font-medium">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SERIES[index] }} />
                            {item.data.web_name || item.data.player_name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-3 text-muted-foreground">Price</td>
                      {metrics.map((item) => <td key={item.name} className="px-4 py-3 text-right tabular-nums">£{fmt(item.data.cost)}m</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-3 text-muted-foreground">Ownership</td>
                      {metrics.map((item) => <td key={item.name} className="px-4 py-3 text-right tabular-nums">{fmt(item.data.ownership)}%</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="px-4 py-3 text-muted-foreground">Minutes</td>
                      {metrics.map((item) => <td key={item.name} className="px-4 py-3 text-right tabular-nums">{item.data.total_stats.total_minutes}</td>)}
                    </tr>
                    {metricRows.map((row) => {
                      const max = Math.max(...row.values)
                      return (
                        <tr key={row.key} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 text-muted-foreground">{row.label}</td>
                          {row.values.map((value, index) => {
                            const best = metrics.length > 1 && value === max && max > 0
                            return (
                              <td key={`${row.key}-${metrics[index].name}`} className="px-4 py-3 text-right tabular-nums">
                                <span className={best ? "rounded-md bg-primary/10 px-2 py-1 font-semibold text-primary" : ""}>
                                  {fmt(value, row.digits ?? 2)}{row.suffix || ""}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {metrics.map((item, index) => {
                const recent = lastN(item.data.gameweeks, 5).reverse()
                const columns = recentColumns(item.data.position)
                const summaries = summaryMetrics(item)
                return (
                  <Card key={item.name}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SERIES[index] }} />
                            <CardTitle className="truncate text-lg">{item.data.web_name || item.data.player_name}</CardTitle>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{item.data.team} · £{fmt(item.data.cost)}m · {fmt(item.data.ownership)}% owned</p>
                        </div>
                        <div className="flex items-center gap-2"><TeamBadge code={item.data.team_short || item.data.team} className="h-7 min-w-10 px-1.5 text-[10px]" /><Badge variant="secondary">{POSITION_META[item.data.position].short}</Badge></div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {summaries.map((summary) => <div key={summary.label} className="rounded-lg bg-secondary/35 p-3"><div className="text-xs text-muted-foreground">{summary.label}</div><div className="mt-1 font-mono text-lg font-semibold tabular-nums">{summary.value}</div></div>)}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent gameweeks</div>
                        <div className="overflow-x-auto rounded-lg border border-border/60">
                          <table className="w-full min-w-[560px] border-collapse text-sm">
                            <thead className="bg-secondary/25 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"><tr><th className="px-3 py-2 text-left">GW</th><th className="px-3 py-2 text-left">Opponent</th>{columns.map((column) => <th key={column.label} className="px-3 py-2 text-right">{column.label}</th>)}</tr></thead>
                            <tbody className="divide-y divide-border/50">
                              {recent.map((gw) => <tr key={gw.gameweek}><td className="px-3 py-2 font-mono tabular-nums">{gw.gameweek}</td><td className="px-3 py-2 text-muted-foreground">{gw.was_home ? "vs" : "@"} {gw.opponent || "—"}</td>{columns.map((column) => <td key={column.label} className={`px-3 py-2 text-right font-mono tabular-nums ${column.emphasize ? "font-semibold text-foreground" : ""}`}>{column.value(gw)}</td>)}</tr>)}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-secondary/25 px-4 py-3 text-xs text-muted-foreground">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          Per-90 metrics are most useful once a player has meaningful minutes. Check recent minutes alongside the role-specific numbers before comparing a regular starter with a substitute.
        </div>
      </div>
    </div>
  )
}
