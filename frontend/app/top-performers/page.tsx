"use client"

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Info, Search, Shield, Sparkles, Target, X } from "lucide-react"
import { CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts"

import { EmptyState, ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { InsightWindow, PlayerRoleInsight, RolePosition } from "@/lib/player-role-insights"
import { getPlayerRoleInsights } from "@/lib/supabase"
import { getTeamBrand } from "@/lib/team-branding"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc"
type NumericKey = keyof Pick<PlayerRoleInsight,
  "attackScore" | "goalThreatScore" | "creationScore" | "defensiveFloorScore" | "hybridScore" |
  "completeScore" | "goalkeeperScore" | "pointsPer90" | "xGPer90" | "xAPer90" | "xGIPer90" |
  "shotsInBoxPer90" | "shotsOnTargetPer90" | "chancesCreatedPer90" | "dcReturnRate" |
  "defensiveContributionPer90" | "dcPoints" | "teamDefenseStrength" | "cleanSheetRate" |
  "minutes" | "price" | "ownership"
>
type Column = { key: NumericKey; label: string; digits?: number; percent?: boolean }
type Lens = { value: string; label: string; description: string; scoreKey: NumericKey; columns: Column[] }

const positions: Array<{ value: RolePosition; label: string; short: string }> = [
  { value: "Forward", label: "Forwards", short: "FWD" },
  { value: "Midfielder", label: "Midfielders", short: "MID" },
  { value: "Defender", label: "Defenders", short: "DEF" },
  { value: "Goalkeeper", label: "Goalkeepers", short: "GK" },
]

const lenses: Record<RolePosition, Lens[]> = {
  Forward: [
    { value: "attack", label: "Attack", description: "Underlying scoring and creative threat, weighted for forwards.", scoreKey: "attackScore", columns: [{ key: "xGPer90", label: "xG / 90" }, { key: "xAPer90", label: "xA / 90" }, { key: "pointsPer90", label: "Pts / 90" }] },
    { value: "goal", label: "Goal threat", description: "Chance quality, box shooting and penalty-area presence.", scoreKey: "goalThreatScore", columns: [{ key: "xGPer90", label: "xG / 90" }, { key: "shotsInBoxPer90", label: "Box shots / 90" }, { key: "shotsOnTargetPer90", label: "SoT / 90" }] },
    { value: "creation", label: "Creation", description: "Expected assists, chances created and delivered returns.", scoreKey: "creationScore", columns: [{ key: "xAPer90", label: "xA / 90" }, { key: "chancesCreatedPer90", label: "Chances / 90" }, { key: "pointsPer90", label: "Pts / 90" }] },
  ],
  Midfielder: [
    { value: "attack", label: "Attack", description: "Goal and assist threat without mixing in defensive work.", scoreKey: "attackScore", columns: [{ key: "xGIPer90", label: "xGI / 90" }, { key: "xGPer90", label: "xG / 90" }, { key: "xAPer90", label: "xA / 90" }] },
    { value: "floor", label: "Defensive floor", description: "How reliably a midfielder reaches the 12-action DC threshold.", scoreKey: "defensiveFloorScore", columns: [{ key: "dcReturnRate", label: "DC hit rate", percent: true }, { key: "defensiveContributionPer90", label: "DC / 90" }, { key: "dcPoints", label: "DC points", digits: 0 }] },
    { value: "hybrid", label: "Hybrid", description: "Players who combine attacking upside with a repeatable defensive floor.", scoreKey: "hybridScore", columns: [{ key: "attackScore", label: "Attack" }, { key: "defensiveFloorScore", label: "DC floor" }, { key: "pointsPer90", label: "Pts / 90" }] },
  ],
  Defender: [
    { value: "attack", label: "Attack", description: "Goal and creative upside among defenders.", scoreKey: "attackScore", columns: [{ key: "xGIPer90", label: "xGI / 90" }, { key: "xGPer90", label: "xG / 90" }, { key: "xAPer90", label: "xA / 90" }] },
    { value: "floor", label: "Defensive floor", description: "How reliably a defender reaches the 10-action DC threshold.", scoreKey: "defensiveFloorScore", columns: [{ key: "dcReturnRate", label: "DC hit rate", percent: true }, { key: "defensiveContributionPer90", label: "DC / 90" }, { key: "dcPoints", label: "DC points", digits: 0 }] },
    { value: "complete", label: "Complete", description: "Attack, defensive contribution and team clean-sheet context together.", scoreKey: "completeScore", columns: [{ key: "attackScore", label: "Attack" }, { key: "defensiveFloorScore", label: "DC floor" }, { key: "teamDefenseStrength", label: "Team defense" }] },
  ],
  Goalkeeper: [
    { value: "goalkeeper", label: "GK score", description: "Current returns and clean-sheet context; save data is not available in the source feed.", scoreKey: "goalkeeperScore", columns: [{ key: "teamDefenseStrength", label: "Team defense" }, { key: "cleanSheetRate", label: "CS rate", percent: true }, { key: "pointsPer90", label: "Pts / 90" }] },
    { value: "clean-sheet", label: "Clean-sheet outlook", description: "Prioritises team defensive strength and clean-sheet rate.", scoreKey: "teamDefenseStrength", columns: [{ key: "cleanSheetRate", label: "CS rate", percent: true }, { key: "pointsPer90", label: "Pts / 90" }, { key: "minutes", label: "Minutes", digits: 0 }] },
  ],
}

function metric(player: PlayerRoleInsight, key: NumericKey) {
  const candidate = player[key]
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null
}

function formatMetric(value: number | null, column: Column) {
  if (value === null) return "—"
  const formatted = (column.percent ? value * 100 : value).toFixed(column.digits ?? 1).replace(/\.0$/, "")
  return `${formatted}${column.percent ? "%" : ""}`
}

function archetype(player: PlayerRoleInsight, forwardMedian: number) {
  if (!player.isEligible) return { label: "Low sample", description: "More minutes are needed before this profile becomes reliable." }
  const attack = player.attackScore ?? 0
  if (player.position === "Forward") {
    if (attack >= 50 && player.pointsPer90 >= forwardMedian) return { label: "Threat + returns", description: "Above-average underlying attack is already translating into FPL points." }
    if (attack >= 50) return { label: "Underlying buy-low", description: "The attacking process is stronger than the current points return." }
    if (player.pointsPer90 >= forwardMedian) return { label: "Output ahead", description: "Returns are strong, but the underlying attacking profile is below the role average." }
    return { label: "Low current signal", description: "Both underlying attack and current returns sit below this role sample." }
  }
  const floor = player.defensiveFloorScore ?? 0
  if (attack >= 50 && floor >= 50) return { label: "Hybrid", description: "Above-average attacking upside and defensive-contribution reliability." }
  if (attack >= 50) return { label: "Attacking", description: "Value is driven primarily by goal and assist threat." }
  if (floor >= 50) return { label: "Defensive floor", description: "A repeatable defensive-contribution route supports the points floor." }
  return { label: "Below role average", description: "Neither model dimension is currently above the position average." }
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <ArrowUpDown className="h-3.5 w-3.5" />
  return direction === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />
}

function PlayerDot(props: any) {
  const { cx, cy, payload, onSelect } = props
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return null
  const brand = getTeamBrand(payload.teamCode)
  const select = () => onSelect(payload.id)
  const keyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select() }
  }
  return <g role="button" tabIndex={0} aria-label={`Select ${payload.name}`} onClick={select} onKeyDown={keyDown} className="cursor-pointer outline-none"><circle cx={cx} cy={cy} r={payload.selected ? 8 : 6} fill={brand.background} stroke={payload.selected ? "#20221F" : brand.border} strokeWidth={payload.selected ? 3 : 1.5} /></g>
}

function ChartTooltipContent({ active, payload }: any) {
  const player = payload?.[0]?.payload as PlayerRoleInsight & { x: number; y: number } | undefined
  if (!active || !player) return null
  return <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg"><p className="font-semibold text-foreground">{player.name}</p><p className="mt-0.5 text-muted-foreground">{player.team}</p><div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono tabular-nums"><span>Attack</span><span>{player.x.toFixed(1)}</span><span>{player.position === "Forward" ? "Pts / 90" : "DC floor"}</span><span>{player.y.toFixed(1)}</span></div></div>
}

export default function TopPerformersPage() {
  const [players, setPlayers] = useState<PlayerRoleInsight[]>([])
  const [position, setPosition] = useState<RolePosition>("Midfielder")
  const [window, setWindow] = useState<InsightWindow>("last_5")
  const [lensValue, setLensValue] = useState("attack")
  const [query, setQuery] = useState("")
  const [team, setTeam] = useState("all")
  const [price, setPrice] = useState("all")
  const [ownership, setOwnership] = useState("all")
  const [includeLowSample, setIncludeLowSample] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<NumericKey>("attackScore")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try { setPlayers(await getPlayerRoleInsights()) }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "Unable to load player intelligence") }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void fetchData() }, [fetchData])

  const positionLenses = lenses[position]
  const activeLens = positionLenses.find((lens) => lens.value === lensValue) ?? positionLenses[0]
  const choosePosition = (nextPosition: RolePosition) => {
    const nextLens = lenses[nextPosition][0]
    setPosition(nextPosition)
    setLensValue(nextLens.value); setSortBy(nextLens.scoreKey); setSortDirection("desc"); setSelectedId(null)
  }
  const chooseWindow = (nextWindow: InsightWindow) => {
    setWindow(nextWindow); setSortBy(activeLens.scoreKey); setSortDirection("desc"); setSelectedId(null)
  }
  const chooseLens = (nextLens: Lens) => {
    setLensValue(nextLens.value); setSortBy(nextLens.scoreKey); setSortDirection("desc"); setSelectedId(null)
  }

  const teams = useMemo(() => [...new Map(players.map((player) => [player.teamCode, player.team])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [players])
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return players
      .filter((player) => player.position === position && player.window === window)
      .filter((player) => includeLowSample || player.isEligible)
      .filter((player) => team === "all" || player.teamCode === team)
      .filter((player) => !normalizedQuery || `${player.name} ${player.team}`.toLowerCase().includes(normalizedQuery))
      .filter((player) => price === "all" || (price === "budget" ? player.price < 6 : price === "mid" ? player.price >= 6 && player.price <= 9 : player.price > 9))
      .filter((player) => ownership === "all" || (ownership === "under10" ? player.ownership < 10 : player.ownership < 20))
      .sort((a, b) => {
        const aValue = metric(a, sortBy) ?? -Infinity
        const bValue = metric(b, sortBy) ?? -Infinity
        return sortDirection === "desc" ? bValue - aValue : aValue - bValue
      })
  }, [includeLowSample, ownership, players, position, price, query, sortBy, sortDirection, team, window])

  const forwardMedian = useMemo(() => {
    const values = filtered.map((player) => player.pointsPer90).sort((a, b) => a - b)
    return values.length ? values[Math.floor(values.length / 2)] : 0
  }, [filtered])
  const selected = filtered.find((player) => player.id === selectedId) ?? null
  const leader = filtered[0] ?? null
  const scoreVersion = players.find((player) => player.window === window)?.scoreVersion ?? "role-v1"
  const chartData = useMemo(() => filtered.filter((player) => player.isEligible && player.attackScore !== null).slice(0, 100).map((player) => ({ ...player, x: player.attackScore ?? 0, y: player.position === "Forward" ? player.pointsPer90 : player.defensiveFloorScore ?? 0, selected: player.id === selectedId })), [filtered, selectedId])

  const toggleSort = (key: NumericKey) => {
    if (sortBy === key) setSortDirection((direction) => direction === "desc" ? "asc" : "desc")
    else { setSortBy(key); setSortDirection("desc") }
  }
  const selectPlayer = (id: string) => setSelectedId((current) => current === id ? null : id)
  const resetFilters = () => { setQuery(""); setTeam("all"); setPrice("all"); setOwnership("all"); setIncludeLowSample(false) }
  const hasFilters = Boolean(query || team !== "all" || price !== "all" || ownership !== "all" || includeLowSample)

  if (loading) return <PageSkeleton label="Loading player intelligence" />
  if (error) return <ErrorState title="Player intelligence unavailable" description={error} onAction={() => void fetchData()} />

  return <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"><div className="mx-auto max-w-7xl">
    <PageHeader eyebrow="Player intelligence" title="Find how each player can score." description="Compare role-specific attacking upside, defensive-contribution floor and current returns without treating every FPL position—or every midfielder—the same." />

    <div className="mb-6 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1 sm:grid-cols-4" aria-label="Choose player position">{positions.map((option) => <button key={option.value} type="button" aria-pressed={position === option.value} onClick={() => choosePosition(option.value)} className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", position === option.value && "bg-card text-foreground shadow-sm")}><span className="hidden sm:inline">{option.label}</span><span className="sm:hidden">{option.short}</span></button>)}</div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1" aria-label="Choose analysis window"><button type="button" aria-pressed={window === "last_5"} onClick={() => chooseWindow("last_5")} className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground", window === "last_5" && "bg-card text-foreground shadow-sm")}>Last 5 GWs</button><button type="button" aria-pressed={window === "season"} onClick={() => chooseWindow("season")} className={cn("rounded-md px-3 py-2 text-sm font-medium text-muted-foreground", window === "season" && "bg-card text-foreground shadow-sm")}>Season</button></div>
    </div>

    <section aria-label="Player filters" className="mb-5 rounded-xl border border-border bg-card p-3 sm:p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_160px_160px_160px_auto]">
      <label className="relative"><span className="sr-only">Search player or club</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player or club" className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20" />{query ? <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button> : null}</label>
      <FilterSelect label="Filter by club" value={team} onChange={setTeam} options={[["all", "All clubs"], ...teams]} />
      <FilterSelect label="Filter by price" value={price} onChange={setPrice} options={[["all", "All prices"], ["budget", "Under £6m"], ["mid", "£6–9m"], ["premium", "Over £9m"]]} />
      <FilterSelect label="Filter by ownership" value={ownership} onChange={setOwnership} options={[["all", "All ownership"], ["under10", "Under 10%"], ["under20", "Under 20%"]]} />
      {hasFilters ? <Button variant="ghost" className="h-11" onClick={resetFilters}>Clear</Button> : <div />}
    </div><label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={includeLowSample} onChange={(event) => setIncludeLowSample(event.target.checked)} className="h-4 w-4 accent-foreground" />Include low-minute samples</label></section>

    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label={`${position} analysis lens`}>{positionLenses.map((lens) => <Button key={lens.value} type="button" variant={activeLens.value === lens.value ? "default" : "outline"} onClick={() => chooseLens(lens)} className="shrink-0">{lens.value === "floor" ? <Shield className="h-4 w-4" /> : lens.value === "attack" || lens.value === "goal" ? <Target className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{lens.label}</Button>)}</div>

    <section className="mb-6 grid gap-3 sm:grid-cols-3" aria-label="Current lens summary"><SummaryMetric label="Lens leader" value={leader?.name ?? "—"} detail={leader ? `${formatMetric(metric(leader, activeLens.scoreKey), { key: activeLens.scoreKey, label: "", digits: 0 })} score` : "No eligible player"} /><SummaryMetric label="Qualified sample" value={String(filtered.filter((player) => player.isEligible).length)} detail={`${position.toLowerCase()}s after filters`} /><SummaryMetric label="Model window" value={window === "last_5" ? `Last ${leader?.windowGameweeks ?? 5}` : "Season"} detail={scoreVersion.replace("-fallback", " · compatibility")} /></section>

    {filtered.length === 0 ? <EmptyState title="No players match" description="Change the filters or include low-minute samples to widen the shortlist." actionLabel="Clear filters" onAction={resetFilters} /> : <>
      {position !== "Goalkeeper" ? <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card" aria-labelledby="archetype-map-title"><div className="border-b border-border px-4 py-4 sm:px-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Archetype map</p><h2 id="archetype-map-title" className="mt-1 font-sans text-xl font-semibold">{position === "Forward" ? "Underlying attack vs current returns" : "Attacking upside vs defensive floor"}</h2></div><p className="max-w-xl text-sm text-muted-foreground">{activeLens.description}</p></div></div><div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="h-[390px] min-w-0 p-2 sm:p-4" role="img" aria-label={`${position} archetype scatter plot. The sortable table below contains the same players and metrics.`}><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 18, right: 22, bottom: 18, left: 4 }}><CartesianGrid stroke="var(--border)" strokeDasharray="3 5" /><XAxis type="number" dataKey="x" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: "Attack score", position: "insideBottom", offset: -12, fill: "var(--muted-foreground)", fontSize: 11 }} /><YAxis type="number" dataKey="y" domain={position === "Forward" ? [0, "auto"] : [0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} label={{ value: position === "Forward" ? "Points / 90" : "DC floor", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11 }} /><ReferenceLine x={50} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><ReferenceLine y={position === "Forward" ? forwardMedian : 50} stroke="var(--muted-foreground)" strokeDasharray="4 4" /><ChartTooltip cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }} content={<ChartTooltipContent />} /><Scatter data={chartData} shape={<PlayerDot onSelect={selectPlayer} />} /></ScatterChart></ResponsiveContainer></div>
        <div className="border-t border-border bg-secondary/25 p-5 lg:border-l lg:border-t-0">{selected ? <SelectedInsight player={selected} forwardMedian={forwardMedian} onClear={() => setSelectedId(null)} /> : <div className="flex h-full min-h-44 flex-col justify-center"><Info className="mb-3 h-5 w-5 text-muted-foreground" /><h3 className="font-sans text-base font-semibold">Select a player</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose a point or a table row to see why the model places that player in this archetype.</p></div>}</div>
      </div></section> : null}

      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-sans text-2xl font-semibold">{activeLens.label} leaderboard</h2><p className="mt-1 text-sm text-muted-foreground">{activeLens.description}</p></div><p className="text-xs text-muted-foreground" aria-live="polite">{filtered.length} matching players</p></div>
      <div className="hidden max-h-[72vh] overflow-auto rounded-xl border border-border bg-card lg:block"><table className="w-full min-w-[980px] border-collapse text-left text-sm"><caption className="sr-only">{position} {activeLens.label} leaderboard</caption><thead className="sticky top-0 z-10 bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="w-16 px-5 py-4">Rank</th><th className="min-w-64 px-4 py-4">Player</th><SortableHeader column={{ key: activeLens.scoreKey, label: `${activeLens.label} score`, digits: 0 }} sortBy={sortBy} direction={sortDirection} onSort={toggleSort} />{activeLens.columns.map((column) => <SortableHeader key={column.key} column={column} sortBy={sortBy} direction={sortDirection} onSort={toggleSort} />)}<SortableHeader column={{ key: "price", label: "Price" }} sortBy={sortBy} direction={sortDirection} onSort={toggleSort} /><SortableHeader column={{ key: "ownership", label: "Owned" }} sortBy={sortBy} direction={sortDirection} onSort={toggleSort} /></tr></thead><tbody className="divide-y divide-border">{filtered.map((player, index) => <tr key={player.id} tabIndex={0} aria-selected={selectedId === player.id} onClick={() => selectPlayer(player.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectPlayer(player.id) } }} className={cn("cursor-pointer transition-colors hover:bg-secondary/30 focus-visible:bg-secondary/40 focus-visible:outline-none", selectedId === player.id && "bg-secondary/50")}><td className="px-5 py-4 font-mono text-sm text-muted-foreground">{index + 1}</td><th scope="row" className="px-4 py-4"><div className="flex items-center gap-3"><TeamBadge code={player.teamCode} /><div className="min-w-0"><p className="truncate font-semibold">{player.name}</p><p className="mt-0.5 text-xs font-normal text-muted-foreground">{player.team} · {archetype(player, forwardMedian).label}{!player.isEligible ? " · provisional" : ""}</p></div></div></th><MetricCell value={metric(player, activeLens.scoreKey)} column={{ key: activeLens.scoreKey, label: "", digits: 0 }} strong />{activeLens.columns.map((column) => <MetricCell key={column.key} value={metric(player, column.key)} column={column} />)}<td className="px-4 py-4 text-right font-mono tabular-nums">£{player.price.toFixed(1)}m</td><td className="px-5 py-4 text-right font-mono tabular-nums">{player.ownership.toFixed(1)}%</td></tr>)}</tbody></table></div>

      <div className="grid gap-3 lg:hidden">{filtered.map((player, index) => <button key={player.id} type="button" aria-pressed={selectedId === player.id} onClick={() => selectPlayer(player.id)} className={cn("rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-secondary/25", selectedId === player.id && "border-foreground/30 bg-secondary/40")}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><TeamBadge code={player.teamCode} /><div className="min-w-0"><p className="truncate font-semibold">{player.name}</p><p className="mt-1 truncate text-xs text-muted-foreground">{player.team} · {archetype(player, forwardMedian).label}</p></div></div><span className="font-mono text-sm text-muted-foreground">#{index + 1}</span></div><div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-4"><SmallMetric label={`${activeLens.label} score`} value={formatMetric(metric(player, activeLens.scoreKey), { key: activeLens.scoreKey, label: "", digits: 0 })} />{activeLens.columns.slice(0, 3).map((column) => <SmallMetric key={column.key} label={column.label} value={formatMetric(metric(player, column.key), column)} />)}</div></button>)}</div>
    </>}

    <details className="mt-8 rounded-xl border border-border bg-secondary/25 p-4 text-sm text-muted-foreground"><summary className="cursor-pointer font-semibold text-foreground">How these scores work</summary><div className="mt-3 max-w-4xl space-y-2 leading-6"><p>Scores compare eligible players only with others in the same position and window. A score of 50 is role average; actual FPL points do not feed the attacking score.</p><p>Goal threat combines xG, box shots, shots on target and penalty-area touches. Creation combines xA, chances created and assists. Defensive floor uses DC hit rate, defensive actions per 90 and 60-minute reliability. Defenders need 10 actions for two DC points; midfielders and forwards need 12.</p><p>Goalkeeper analysis is limited to team defense, clean-sheet rate and points per 90 because the current source does not provide save or penalty-save data.</p></div></details>
  </div></div>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></label>
}

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card><CardContent className="py-4"><p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-2 truncate font-sans text-lg font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function SelectedInsight({ player, forwardMedian, onClear }: { player: PlayerRoleInsight; forwardMedian: number; onClear: () => void }) {
  const profile = archetype(player, forwardMedian)
  return <div><div className="flex items-start justify-between gap-3"><TeamBadge code={player.teamCode} /><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Clear selected player" onClick={onClear}><X className="h-4 w-4" /></Button></div><p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{profile.label}</p><h3 className="mt-1 font-sans text-xl font-semibold">{player.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{profile.description}</p><div className="mt-5 grid grid-cols-2 gap-3"><SmallMetric label="Attack" value={formatMetric(player.attackScore, { key: "attackScore", label: "", digits: 0 })} /><SmallMetric label={player.position === "Forward" ? "Points / 90" : "DC floor"} value={formatMetric(player.position === "Forward" ? player.pointsPer90 : player.defensiveFloorScore, { key: "pointsPer90", label: "", digits: 1 })} /><SmallMetric label="xGI / 90" value={player.xGIPer90.toFixed(2)} /><SmallMetric label="DC hit rate" value={`${(player.dcReturnRate * 100).toFixed(0)}%`} /></div></div>
}

function SortableHeader({ column, sortBy, direction, onSort }: { column: Column; sortBy: NumericKey; direction: SortDirection; onSort: (key: NumericKey) => void }) {
  return <th className="px-4 py-4 text-right"><button type="button" onClick={() => onSort(column.key)} className="inline-flex items-center gap-1.5 hover:text-foreground">{column.label}<SortIcon active={sortBy === column.key} direction={direction} /></button></th>
}

function MetricCell({ value, column, strong = false }: { value: number | null; column: Column; strong?: boolean }) {
  return <td className={cn("px-4 py-4 text-right font-mono tabular-nums", strong && "font-semibold")}>{formatMetric(value, column)}</td>
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</p></div>
}
