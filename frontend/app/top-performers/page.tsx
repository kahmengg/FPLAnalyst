"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Gem, Search, Shield, Sparkles, Target, TrendingUp, Users, X } from "lucide-react"

import { EmptyState, ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { PlayerSummaryCard } from "@/components/player-summary-card"
import { TeamBadge } from "@/components/team-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getPlayerInsights } from "@/lib/supabase"

type Category = "season" | "goals" | "assists" | "defense" | "value" | "gems" | "overperformers" | "underperformers" | "sustainable"
type PrimaryCategory = "season" | "goals" | "assists" | "defense" | "value" | "gems" | "finishing"
type SortDirection = "asc" | "desc"

type InsightPlayer = {
  name: string
  team: string
  teamCode: string
  position: string
  price: number
  ownership: number
  form: number
  points: number
  pointsPerGame: number
  goals: number
  goalsPerGame: number
  assists: number
  assistsPerGame: number
  cleanSheets: number
  cleanSheetRate: number
  defensiveContribution: number
  pointsPerMillion: number
  xG: number
  xA: number
  potentialScore: number
  overperformance: number
  overperformancePer90: number
}

type Column = { key: keyof InsightPlayer; label: string; digits?: number; suffix?: string }

const dataCategories: Category[] = ["season", "goals", "assists", "defense", "value", "gems", "overperformers", "underperformers", "sustainable"]

const queryKey: Record<Category, string> = {
  season: "season_performers",
  goals: "goal_scorers",
  assists: "assist_providers",
  defense: "defensive_leaders",
  value: "value_players",
  gems: "hidden_gems",
  overperformers: "overperformers",
  underperformers: "underperformers",
  sustainable: "sustainable_scorers",
}

const primaryTabs: Array<{ value: PrimaryCategory; label: string; icon: typeof Users }> = [
  { value: "season", label: "Overall", icon: Users },
  { value: "goals", label: "Goals", icon: Target },
  { value: "assists", label: "Assists", icon: TrendingUp },
  { value: "defense", label: "Defense", icon: Shield },
  { value: "value", label: "Value", icon: Sparkles },
  { value: "gems", label: "Differentials", icon: Gem },
  { value: "finishing", label: "Finishing", icon: ArrowUpDown },
]

const categoryMeta: Record<Category, { title: string; description: string; columns: Column[]; defaultSort: keyof InsightPlayer }> = {
  season: { title: "Overall performers", description: "Reliable point scorers across the current season.", defaultSort: "points", columns: [{ key: "points", label: "Points", digits: 0 }, { key: "pointsPerGame", label: "Pts / match" }, { key: "form", label: "Form" }, { key: "ownership", label: "Owned", suffix: "%" }] },
  goals: { title: "Goal threat", description: "Players turning minutes into goals and sustained attacking output.", defaultSort: "goals", columns: [{ key: "goals", label: "Goals", digits: 0 }, { key: "goalsPerGame", label: "Goals / match" }, { key: "points", label: "Points", digits: 0 }, { key: "form", label: "Form" }] },
  assists: { title: "Creative output", description: "The strongest assist providers and creators in the player pool.", defaultSort: "assists", columns: [{ key: "assists", label: "Assists", digits: 0 }, { key: "assistsPerGame", label: "Assists / match" }, { key: "points", label: "Points", digits: 0 }, { key: "form", label: "Form" }] },
  defense: { title: "Defensive performers", description: "Clean-sheet production, FPL returns and defensive contribution.", defaultSort: "points", columns: [{ key: "points", label: "Points", digits: 0 }, { key: "cleanSheets", label: "Clean sheets", digits: 0 }, { key: "cleanSheetRate", label: "CS rate", suffix: "%" }, { key: "defensiveContribution", label: "Def. contrib.", digits: 0 }] },
  value: { title: "Best value", description: "The most FPL production for each million of budget.", defaultSort: "pointsPerMillion", columns: [{ key: "pointsPerMillion", label: "Pts / £m" }, { key: "points", label: "Points", digits: 0 }, { key: "form", label: "Form" }, { key: "ownership", label: "Owned", suffix: "%" }] },
  gems: { title: "Low-owned differentials", description: "Under-the-radar players with encouraging output or underlying numbers.", defaultSort: "potentialScore", columns: [{ key: "potentialScore", label: "Potential" }, { key: "ownership", label: "Owned", suffix: "%" }, { key: "xG", label: "xG" }, { key: "xA", label: "xA" }] },
  overperformers: { title: "Finishing above expectation", description: "Players whose goals currently exceed their expected-goal output.", defaultSort: "overperformancePer90", columns: [{ key: "goals", label: "Goals", digits: 0 }, { key: "xG", label: "xG" }, { key: "overperformance", label: "Goals − xG" }, { key: "overperformancePer90", label: "Difference / 90" }] },
  underperformers: { title: "Potential positive regression", description: "Players with expected goals that have not yet converted into matching returns.", defaultSort: "xG", columns: [{ key: "goals", label: "Goals", digits: 0 }, { key: "xG", label: "xG" }, { key: "overperformance", label: "Goals − xG" }, { key: "form", label: "Form" }] },
  sustainable: { title: "Sustainable scorers", description: "Goalscorers whose output remains supported by their underlying chance quality.", defaultSort: "goals", columns: [{ key: "goals", label: "Goals", digits: 0 }, { key: "xG", label: "xG" }, { key: "overperformance", label: "Goals − xG" }, { key: "form", label: "Form" }] },
}

function number(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizePlayer(player: any): InsightPlayer {
  return {
    name: player.player || player.web_name || player.player_name || "Unknown player",
    team: player.team || player.team_name || "Unknown club",
    teamCode: player.team_short || player.team || "FPL",
    position: player.position || player.position_name || "",
    price: number(player.price ?? player.cost ?? player.now_cost),
    ownership: number(player.ownership ?? player.selected_by_percent),
    form: number(player.form),
    points: number(player.points ?? player.totalPoints ?? player.total_points),
    pointsPerGame: number(player.ppg ?? player.points_per_game),
    goals: number(player.goals),
    goalsPerGame: number(player.goalsPerGame ?? player.goals_per_game),
    assists: number(player.assists),
    assistsPerGame: number(player.assistsPerGame ?? player.assists_per_game),
    cleanSheets: number(player.cleanSheets ?? player.clean_sheets),
    cleanSheetRate: number(player.csRate ?? player.clean_sheet_rate) * (number(player.csRate ?? player.clean_sheet_rate) <= 1 ? 100 : 1),
    defensiveContribution: number(player.defensiveContributions ?? player.defensive_contribution),
    pointsPerMillion: number(player.pointsPerMillion ?? player.points_per_million),
    xG: number(player.xG ?? player.xg),
    xA: number(player.xA ?? player.xa),
    potentialScore: number(player.potentialScore ?? player.points_per_game),
    overperformance: number(player.overperformance),
    overperformancePer90: number(player.overperformance_per_90),
  }
}

function formatValue(value: number, column: Column) {
  const formatted = value.toFixed(column.digits ?? 2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")
  return `${formatted}${column.suffix ?? ""}`
}

function positionCode(value: string) {
  const map: Record<string, string> = { Goalkeeper: "GK", Defender: "DEF", Midfielder: "MID", Forward: "FWD" }
  return map[value] ?? value
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5" />
  return direction === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
}

function emptyDatasets(): Record<Category, InsightPlayer[]> {
  return {
    season: [], goals: [], assists: [], defense: [], value: [], gems: [],
    overperformers: [], underperformers: [], sustainable: [],
  }
}

export default function TopPerformersPage() {
  const [datasets, setDatasets] = useState<Record<Category, InsightPlayer[]>>(emptyDatasets)
  const [activeTab, setActiveTab] = useState<PrimaryCategory>("season")
  const [finishingTab, setFinishingTab] = useState<Category>("overperformers")
  const [query, setQuery] = useState("")
  const [position, setPosition] = useState("all")
  const [price, setPrice] = useState("all")
  const [sortBy, setSortBy] = useState<keyof InsightPlayer>("points")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [visibleCount, setVisibleCount] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const results = await Promise.all(dataCategories.map((category) => getPlayerInsights(queryKey[category], 100)))
      setDatasets(Object.fromEntries(dataCategories.map((category, index) => [category, results[index].map(normalizePlayer)])) as Record<Category, InsightPlayer[]>)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load player insights")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const category: Category = activeTab === "finishing" ? finishingTab : activeTab
  const meta = categoryMeta[category]

  useEffect(() => {
    setSortBy(meta.defaultSort)
    setSortDirection("desc")
    setVisibleCount(20)
  }, [category, meta.defaultSort])

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return datasets[category]
      .filter((player) => !normalizedQuery || `${player.name} ${player.team}`.toLowerCase().includes(normalizedQuery))
      .filter((player) => position === "all" || positionCode(player.position) === position)
      .filter((player) => {
        if (price === "budget") return player.price > 0 && player.price < 6
        if (price === "mid") return player.price >= 6 && player.price <= 9
        if (price === "premium") return player.price > 9
        return true
      })
      .sort((a, b) => {
        const aValue = a[sortBy]
        const bValue = b[sortBy]
        if (typeof aValue === "number" && typeof bValue === "number") return sortDirection === "desc" ? bValue - aValue : aValue - bValue
        return String(aValue).localeCompare(String(bValue)) * (sortDirection === "desc" ? -1 : 1)
      })
  }, [category, datasets, position, price, query, sortBy, sortDirection])

  const setCategory = (value: PrimaryCategory) => {
    setActiveTab(value)
    setVisibleCount(20)
  }

  const toggleSort = (key: keyof InsightPlayer) => {
    if (sortBy === key) setSortDirection((direction) => direction === "desc" ? "asc" : "desc")
    else { setSortBy(key); setSortDirection("desc") }
  }

  const clearFilters = () => { setQuery(""); setPosition("all"); setPrice("all"); setVisibleCount(20) }
  const hasFilters = Boolean(query || position !== "all" || price !== "all")
  const visiblePlayers = filtered.slice(0, visibleCount)

  if (loading) return <PageSkeleton label="Loading top players" />
  if (error) return <ErrorState title="Player insights unavailable" description={error} onAction={() => void fetchData()} />

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="Player intelligence" title="Find the players driving FPL decisions." description="Search and rank the current player pool by returns, underlying output, defensive contribution, value, and finishing sustainability." />

        <section aria-label="Player filters" className="sticky top-0 z-20 mb-5 rounded-xl border border-border bg-background/95 p-3 shadow-sm backdrop-blur sm:p-4">
          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_190px_auto]">
            <label className="relative min-w-0"><span className="sr-only">Search player or club</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or club" className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />{query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button> : null}</label>
            <label className="relative min-w-0"><span className="sr-only">Filter by position</span><select value={position} onChange={(event) => setPosition(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"><option value="all">All positions</option><option value="GK">Goalkeepers</option><option value="DEF">Defenders</option><option value="MID">Midfielders</option><option value="FWD">Forwards</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></label>
            <label className="relative min-w-0"><span className="sr-only">Filter by price</span><select value={price} onChange={(event) => setPrice(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"><option value="all">All prices</option><option value="budget">Budget · under £6m</option><option value="mid">Mid-range · £6–9m</option><option value="premium">Premium · over £9m</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></label>
            {hasFilters ? <Button variant="ghost" className="h-11" onClick={clearFilters}>Clear filters</Button> : <div />}
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={(value) => setCategory(value as PrimaryCategory)}>
          <div className="mb-6 overflow-x-auto pb-1"><TabsList className="inline-flex h-auto min-w-max gap-1 bg-secondary p-1">{primaryTabs.map((tab) => <TabsTrigger key={tab.value} value={tab.value} className="gap-2 px-3 py-2.5"><tab.icon className="h-4 w-4" />{tab.label}</TabsTrigger>)}</TabsList></div>
          {primaryTabs.map((tab) => <TabsContent key={tab.value} value={tab.value} className="mt-0">{tab.value === "finishing" ? <div className="mb-5 grid gap-2 sm:grid-cols-3">{(["overperformers", "underperformers", "sustainable"] as Category[]).map((value) => <Button key={value} variant={finishingTab === value ? "default" : "outline"} onClick={() => setFinishingTab(value)}>{categoryMeta[value].title}</Button>)}</div> : null}</TabsContent>)}
        </Tabs>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-3xl font-medium">{meta.title}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div>
          <p className="text-xs text-muted-foreground" aria-live="polite">Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} matching players</p>
        </div>

        {filtered.length === 0 ? <EmptyState title="No players match" description="Change the search, position, or price filters to widen the shortlist." actionLabel="Clear filters" onAction={clearFilters} /> : (
          <>
            <div className="hidden max-h-[72vh] overflow-auto rounded-xl border border-border bg-card lg:block">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <caption className="sr-only">{meta.title} leaderboard</caption>
                <thead className="sticky top-0 z-10 bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="w-16 px-5 py-4">Rank</th><th className="min-w-60 px-4 py-4">Player</th>{meta.columns.map((column) => <th key={column.key} className="px-4 py-4 text-right"><button type="button" onClick={() => toggleSort(column.key)} className="inline-flex items-center gap-1.5 hover:text-foreground">{column.label}<SortIcon active={sortBy === column.key} direction={sortDirection} /></button></th>)}<th className="px-5 py-4 text-right">Price</th></tr></thead>
                <tbody className="divide-y divide-border">{visiblePlayers.map((player, index) => <tr key={`${player.name}-${player.teamCode}`} className="transition-colors hover:bg-secondary/30"><td className="px-5 py-4 font-mono text-sm text-muted-foreground">{index + 1}</td><th scope="row" className="px-4 py-4"><div className="flex items-center gap-3"><TeamBadge code={player.teamCode} /><div className="min-w-0"><p className="truncate font-semibold">{player.name}</p><p className="mt-0.5 text-xs font-normal text-muted-foreground">{player.team} · {positionCode(player.position) || "—"}</p></div></div></th>{meta.columns.map((column) => <td key={column.key} className="px-4 py-4 text-right font-mono font-medium tabular-nums">{formatValue(number(player[column.key]), column)}</td>)}<td className="px-5 py-4 text-right font-mono font-medium">{player.price ? `£${player.price.toFixed(1)}m` : "—"}</td></tr>)}</tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">{visiblePlayers.map((player, index) => <PlayerSummaryCard key={`${player.name}-${player.teamCode}`} rank={index + 1} player={{ name: player.name, teamCode: player.teamCode, teamName: player.team, position: positionCode(player.position), price: player.price || undefined, totalPoints: player.points, form: player.form, ownership: player.ownership, defensiveContribution: category === "defense" ? player.defensiveContribution : undefined }} footer={<div className="grid w-full grid-cols-2 gap-4">{meta.columns.slice(0, 2).map((column) => <div key={column.key}><p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{column.label}</p><p className="mt-1 font-mono text-sm font-semibold">{formatValue(number(player[column.key]), column)}</p></div>)}</div>} />)}</div>

            {visibleCount < filtered.length ? <div className="mt-6 flex justify-center"><Button variant="outline" onClick={() => setVisibleCount((count) => count + 20)}>Show 20 more</Button></div> : null}
          </>
        )}

        <Card className="mt-8 bg-secondary/35"><CardContent className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" /><p>Use rankings as a shortlist, not a transfer instruction. Confirm minutes, availability, fixtures and role before committing budget.</p></CardContent></Card>
      </div>
    </div>
  )
}
