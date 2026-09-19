"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, Home, Plane, Search, Shield, Target, X } from "lucide-react"

import { EmptyState, ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getDashboardSummary, getFixtures } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type FdrMode = "overall" | "attack" | "defense"

type FixtureTeam = {
  name: string
  short_name: string
  attacking_fixture_rating: number
  defensive_fixture_rating: number
  rank: number | null
  attack_rank: number | null
  defense_rank: number | null
  fdr: Record<FdrMode, number>
}

type Fixture = {
  gw: number
  gameweek: number
  fixture: string
  home_team: FixtureTeam
  away_team: FixtureTeam
  favorability: string
  maxOpportunityRating: number
}

type TeamSchedule = {
  team: string
  code: string
  average: number
  fixtures: Array<{ gw: number; opponent: string; opponentCode: string; home: boolean; rating: number }>
}

function difficultyFromOpportunity(rating: number) {
  const clamped = Math.max(20, Math.min(100, rating))
  return Math.max(1, Math.min(5, 5 - ((clamped - 20) / 80) * 4))
}

function difficultyTone(difficulty: number) {
  if (difficulty <= 1.8) return "border-success/30 bg-success/12 text-success"
  if (difficulty <= 2.7) return "border-success/20 bg-success/5 text-foreground"
  if (difficulty <= 3.5) return "border-warning/25 bg-warning/10 text-warning"
  return "border-destructive/25 bg-destructive/10 text-destructive"
}

function ratingLabel(rating: number) {
  if (rating >= 75) return "Excellent"
  if (rating >= 60) return "Good"
  if (rating >= 45) return "Balanced"
  return "Difficult"
}

function RatingBar({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Target }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span><span className="font-mono font-semibold tabular-nums">{Math.round(value)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-foreground/65" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></div>
    </div>
  )
}

function FixtureTeamRow({ team, venue, favored }: { team: FixtureTeam; venue: "home" | "away"; favored: boolean }) {
  const average = (team.attacking_fixture_rating + team.defensive_fixture_rating) / 2
  return (
    <div className={cn("rounded-lg border border-border bg-background p-4", favored && "ring-1 ring-foreground/15")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><TeamBadge code={team.short_name || team.name} /><div className="min-w-0"><h3 className="truncate font-sans text-sm font-semibold">{team.name}</h3><p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">{venue === "home" ? <Home className="h-3 w-3" /> : <Plane className="h-3 w-3" />}{venue === "home" ? "Home" : "Away"}</p></div></div>
        <div className="text-right"><p className="font-mono text-lg font-semibold tabular-nums">{Math.round(average)}%</p><p className="text-[11px] text-muted-foreground">{ratingLabel(average)}</p></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><RatingBar label={`Attack #${team.attack_rank ?? "—"}`} value={team.attacking_fixture_rating} icon={Target} /><RatingBar label={`Defense #${team.defense_rank ?? "—"}`} value={team.defensive_fixture_rating} icon={Shield} /></div>
    </div>
  )
}

function FixtureCard({ fixture }: { fixture: Fixture }) {
  return (
    <Card className="overflow-hidden transition-colors hover:bg-secondary/15">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Gameweek {fixture.gw}</p>{fixture.favorability !== "Neutral" ? <Badge variant="outline" className="bg-secondary">Edge: {fixture.favorability}</Badge> : <Badge variant="outline">Even matchup</Badge>}</div>
        <FixtureTeamRow team={fixture.home_team} venue="home" favored={fixture.favorability === fixture.home_team.name} />
        <FixtureTeamRow team={fixture.away_team} venue="away" favored={fixture.favorability === fixture.away_team.name} />
      </CardContent>
    </Card>
  )
}

function DifficultyGrid({ fixtures }: { fixtures: Fixture[] }) {
  const [mode, setMode] = useState<FdrMode>("overall")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<"difficulty" | "team">("difficulty")

  const gameweeks = useMemo(() => [...new Set(fixtures.map((fixture) => fixture.gw))].sort((a, b) => a - b), [fixtures])
  const schedules = useMemo(() => {
    const map = new Map<string, TeamSchedule>()
    for (const fixture of fixtures) {
      for (const side of ["home", "away"] as const) {
        const team = side === "home" ? fixture.home_team : fixture.away_team
        const opponent = side === "home" ? fixture.away_team : fixture.home_team
        const existing = map.get(team.name) ?? { team: team.name, code: team.short_name, average: 0, fixtures: [] }
        existing.fixtures.push({ gw: fixture.gw, opponent: opponent.name, opponentCode: opponent.short_name, home: side === "home", rating: team.fdr?.[mode] ?? 50 })
        map.set(team.name, existing)
      }
    }
    return [...map.values()].map((team) => ({ ...team, fixtures: team.fixtures.sort((a, b) => a.gw - b.gw), average: team.fixtures.length ? team.fixtures.reduce((sum, fixture) => sum + fixture.rating, 0) / team.fixtures.length : 0 }))
      .filter((team) => team.team.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => sort === "team" ? a.team.localeCompare(b.team) : b.average - a.average)
  }, [fixtures, mode, query, sort])

  return (
    <div>
      <div className="mb-4 grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-[auto_minmax(180px,1fr)_180px] sm:p-4">
        <div className="grid grid-cols-3 rounded-lg bg-secondary p-1">{(["overall", "attack", "defense"] as FdrMode[]).map((value) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)} className={cn("rounded-md px-3 py-2 text-sm capitalize text-muted-foreground", mode === value && "bg-card font-medium text-foreground shadow-sm")}>{value}</button>)}</div>
        <label className="relative min-w-0"><span className="sr-only">Search clubs</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clubs" className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />{query ? <button type="button" aria-label="Clear club search" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button> : null}</label>
        <Button variant="outline" className="h-11" onClick={() => setSort((value) => value === "team" ? "difficulty" : "team")}><ArrowUpDown className="h-4 w-4" />{sort === "team" ? "Team name" : "Best run"}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] border-collapse text-sm"><caption className="sr-only">Fixture difficulty by club and gameweek</caption><thead className="bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="sticky left-0 z-10 min-w-52 bg-secondary px-4 py-4 text-left">Club</th><th className="w-24 px-3 py-4 text-center">Average</th>{gameweeks.map((gw) => <th key={gw} className="min-w-24 px-3 py-4 text-center">GW {gw}</th>)}</tr></thead><tbody className="divide-y divide-border">{schedules.map((team) => <tr key={team.team} className="hover:bg-secondary/20"><th scope="row" className="sticky left-0 z-[5] bg-card px-4 py-3"><div className="flex items-center gap-3"><TeamBadge code={team.code || team.team} /><span className="truncate font-semibold">{team.team}</span></div></th><td className="px-3 py-3 text-center"><Badge variant="outline" className={difficultyTone(difficultyFromOpportunity(team.average))}>{difficultyFromOpportunity(team.average).toFixed(1)}</Badge></td>{gameweeks.map((gw) => { const fixture = team.fixtures.find((item) => item.gw === gw); if (!fixture) return <td key={gw} className="px-3 py-3 text-center text-muted-foreground">—</td>; const difficulty = difficultyFromOpportunity(fixture.rating); return <td key={gw} className="px-3 py-3 text-center"><div className={cn("mx-auto w-20 rounded-lg border px-2 py-2", difficultyTone(difficulty))}><div className="flex items-center justify-center gap-1"><TeamBadge code={fixture.opponentCode || fixture.opponent} className="h-6 min-w-8 px-1 text-[9px]" /><span className="text-[10px] font-semibold">{fixture.home ? "H" : "A"}</span></div><p className="mt-1 font-mono text-xs font-semibold">{difficulty.toFixed(1)}</p></div></td>})}</tr>)}</tbody></table>
      </div>
      {!schedules.length ? <div className="mt-4"><EmptyState title="No clubs found" description="Try another team name or clear the search." actionLabel="Clear search" onAction={() => setQuery("")} /></div> : null}
    </div>
  )
}

export default function FixtureAnalysisPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [gameweek, setGameweek] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [fixtureData, summary] = await Promise.all([getFixtures(), getDashboardSummary()])
      const all = fixtureData as Fixture[]
      const gameweeks = [...new Set(all.map((fixture) => fixture.gw))].sort((a, b) => a - b)
      const nextGameweek = Number(summary.total_gameweeks || 0) + 1
      const selected = gameweeks.find((value) => value >= nextGameweek) ?? gameweeks.at(-1) ?? nextGameweek
      const upcoming = all.filter((fixture) => fixture.gw >= selected)
      setFixtures(upcoming.length ? upcoming : all)
      setGameweek(selected)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load fixture analysis")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const gameweeks = useMemo(() => [...new Set(fixtures.map((fixture) => fixture.gw))].sort((a, b) => a - b), [fixtures])
  const selectedIndex = Math.max(0, gameweeks.indexOf(gameweek ?? gameweeks[0]))
  const selectedFixtures = useMemo(() => fixtures.filter((fixture) => fixture.gw === gameweek).sort((a, b) => b.maxOpportunityRating - a.maxOpportunityRating), [fixtures, gameweek])

  if (loading) return <PageSkeleton label="Loading fixture analysis" />
  if (error) return <ErrorState title="Fixtures unavailable" description={error} onAction={() => void fetchData()} />

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"><div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Fixture intelligence" title="See the schedule before it moves the market." description="Compare upcoming matchups through attacking opportunity, defensive potential, venue, and role-specific fixture difficulty." />
      <Tabs defaultValue="fixtures">
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-2 bg-secondary p-1"><TabsTrigger value="fixtures" className="gap-2"><CalendarDays className="h-4 w-4" />Matches</TabsTrigger><TabsTrigger value="difficulty" className="gap-2"><Target className="h-4 w-4" />Difficulty grid</TabsTrigger></TabsList>
        <TabsContent value="fixtures" className="mt-0">
          <div className="mb-5 flex items-center justify-between rounded-xl border border-border bg-card p-3 sm:p-4"><Button variant="ghost" size="icon" aria-label="Previous gameweek" disabled={selectedIndex <= 0} onClick={() => setGameweek(gameweeks[selectedIndex - 1])}><ChevronLeft className="h-5 w-5" /></Button><div className="text-center"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Selected round</p><p className="mt-1 font-mono text-xl font-semibold">Gameweek {gameweek ?? "—"}</p></div><Button variant="ghost" size="icon" aria-label="Next gameweek" disabled={selectedIndex >= gameweeks.length - 1} onClick={() => setGameweek(gameweeks[selectedIndex + 1])}><ChevronRight className="h-5 w-5" /></Button></div>
          {selectedFixtures.length ? <div className="grid gap-4 xl:grid-cols-2">{selectedFixtures.map((fixture) => <FixtureCard key={`${fixture.gw}-${fixture.fixture}`} fixture={fixture} />)}</div> : <EmptyState title="No fixtures in this gameweek" description="Use the arrows to select another available gameweek." />}
        </TabsContent>
        <TabsContent value="difficulty" className="mt-0"><DifficultyGrid fixtures={fixtures} /></TabsContent>
      </Tabs>
    </div></div>
  )
}
