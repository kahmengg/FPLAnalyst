"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUpDown, BarChart3, Search, Shield, SlidersHorizontal, Sparkles, Swords, X } from "lucide-react"

import TeamPicksModal from "@/components/team-picks-modal"
import { ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getQuickPicks, getTeamRankings } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type RankingView = "attack" | "defense" | "combined"
type FilterMode = "all" | "top5" | "bottom5"
type SortMode = "rank" | "attack" | "defense" | "goals" | "cleansheets"

type RankingRow = {
  team: string
  team_short: string
  goals_per_game: number
  expected_goals_per_game: number
  clean_sheet_rate: number
  goals_conceded_per_game: number
  overall_strength: number
  attack_strength: number
  defense_strength: number
  attack_rank: number
  defense_rank: number
}

type QuickPickPlayer = {
  web_name: string
  position_name: string
  now_cost: number
  goals_per_game?: number
  assists_per_game?: number
  points_per_game?: number
  selected_by_percent?: number
  attacker_score?: number
  defender_score?: number
  form?: number
  clean_sheet_rate?: number
}

type QuickPickTeam = { team: string; players?: QuickPickPlayer[] }

type TeamRanking = {
  name: string
  code: string
  attackRank: number
  defenseRank: number
  goalsPerGame: number
  xGPerGame: number
  cleanSheetPct: number
  goalsConceded: number
  attackStrength: number
  defenseStrength: number
  attackStrengthPct: number
  defenseStrengthPct: number
  overallStrength: number
  overallRank: number
}

type ModalPlayer = {
  name: string
  position: string
  position_name: string
  price: number
  goals_pg?: number
  assists_pg?: number
  points_pg?: number
  points_per_game?: number
  ownership?: number
  selected_by_percent?: number
  attacker_score?: number
  defender_score?: number
  form?: number
  cs_rate?: number
  clean_sheet_rate?: number
}

const viewOptions: Array<{ value: RankingView; label: string; icon: typeof BarChart3 }> = [
  { value: "combined", label: "Overall", icon: BarChart3 },
  { value: "attack", label: "Attack", icon: Swords },
  { value: "defense", label: "Defense", icon: Shield },
]

function safePercentage(value: number, maximum: number) {
  return maximum > 0 ? (value / maximum) * 100 : 0
}

function StrengthBar({ value, emphasis = "regular" }: { value: number; emphasis?: "regular" | "strong" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
      <div
        className={cn("h-full rounded-full bg-foreground/45", emphasis === "strong" && "bg-foreground")}
        style={{ width: `${Math.max(0, Math.min(value, 100))}%` }}
      />
    </div>
  )
}

function RankMark({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background font-mono text-xs font-semibold tabular-nums",
        rank <= 3 && "border-warning/35 bg-warning/10 text-warning",
      )}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </span>
  )
}

export default function TeamRankingsPage() {
  const [view, setView] = useState<RankingView>("combined")
  const [teams, setTeams] = useState<TeamRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<FilterMode>("all")
  const [sortBy, setSortBy] = useState<SortMode>("rank")
  const [attackingPicks, setAttackingPicks] = useState<QuickPickTeam[]>([])
  const [defensivePicks, setDefensivePicks] = useState<QuickPickTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamRanking | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Rankings and picks are independent, so load them in parallel.
      const [overallData, attackData, defenseData, attackingData, defensiveData] = await Promise.all([
        getTeamRankings("overall"),
        getTeamRankings("attack"),
        getTeamRankings("defense"),
        getQuickPicks("attacking"),
        getQuickPicks("defensive"),
      ])

      const overall = overallData as RankingRow[]
      const attack = attackData as RankingRow[]
      const defense = defenseData as RankingRow[]
      const attackMap = new Map(attack.map((team) => [team.team, team]))
      const defenseMap = new Map(defense.map((team) => [team.team, team]))
      const maxAttackStrength = Math.max(0, ...attack.map((team) => team.attack_strength || 0))
      const maxDefenseStrength = Math.max(0, ...defense.map((team) => team.defense_strength || 0))
      const maxOverallStrength = Math.max(0, ...overall.map((team) => team.overall_strength || 0))

      const mergedTeams = overall
        .map((team) => {
          const attacking = attackMap.get(team.team)
          const defending = defenseMap.get(team.team)
          return {
            name: team.team,
            code: team.team_short,
            attackRank: attacking?.attack_rank || 999,
            defenseRank: defending?.defense_rank || 999,
            goalsPerGame: team.goals_per_game || 0,
            xGPerGame: team.expected_goals_per_game || 0,
            cleanSheetPct: (team.clean_sheet_rate || 0) * 100,
            goalsConceded: team.goals_conceded_per_game || 0,
            attackStrength: attacking?.attack_strength || 0,
            defenseStrength: defending?.defense_strength || 0,
            attackStrengthPct: safePercentage(attacking?.attack_strength || 0, maxAttackStrength),
            defenseStrengthPct: safePercentage(defending?.defense_strength || 0, maxDefenseStrength),
            overallStrength: safePercentage(team.overall_strength || 0, maxOverallStrength),
            overallRank: 0,
          }
        })
        .sort((a, b) => a.attackRank + a.defenseRank - (b.attackRank + b.defenseRank))
        .map((team, index) => ({ ...team, overallRank: index + 1 }))

      setTeams(mergedTeams)
      setAttackingPicks(attackingData as QuickPickTeam[])
      setDefensivePicks(defensiveData as QuickPickTeam[])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load team rankings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const rankedTeams = useMemo(() => {
    const result = [...teams]
    if (view === "attack") result.sort((a, b) => a.attackRank - b.attackRank)
    if (view === "defense") result.sort((a, b) => a.defenseRank - b.defenseRank)
    if (view === "combined") result.sort((a, b) => a.overallRank - b.overallRank)
    return result
  }, [teams, view])

  const filteredTeams = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()
    let result = normalizedSearch
      ? rankedTeams.filter(
          (team) => team.name.toLowerCase().includes(normalizedSearch) || team.code.toLowerCase().includes(normalizedSearch),
        )
      : [...rankedTeams]

    if (filterMode === "top5") result = result.slice(0, 5)
    if (filterMode === "bottom5") result = result.slice(-5).reverse()
    if (sortBy === "attack") result.sort((a, b) => a.attackRank - b.attackRank)
    if (sortBy === "defense") result.sort((a, b) => a.defenseRank - b.defenseRank)
    if (sortBy === "goals") result.sort((a, b) => b.goalsPerGame - a.goalsPerGame)
    if (sortBy === "cleansheets") result.sort((a, b) => b.cleanSheetPct - a.cleanSheetPct)
    return result
  }, [filterMode, rankedTeams, searchQuery, sortBy])

  const insights = useMemo(() => {
    const byAttack = [...teams].sort((a, b) => a.attackRank - b.attackRank)
    const byDefense = [...teams].sort((a, b) => a.defenseRank - b.defenseRank)
    return {
      strongestAttack: byAttack[0]?.name ?? "—",
      bestDefense: byDefense[0]?.name ?? "—",
      weakestAttack: byAttack.at(-1)?.name ?? "—",
      weakestDefense: byDefense.at(-1)?.name ?? "—",
    }
  }, [teams])

  const hasActiveFilters = Boolean(searchQuery || filterMode !== "all" || sortBy !== "rank")
  const rankForView = (team: TeamRanking) => view === "attack" ? team.attackRank : view === "defense" ? team.defenseRank : team.overallRank

  const getTeamPicksData = (teamName: string): { attackingPlayers: ModalPlayer[]; defensivePlayers: ModalPlayer[] } => {
    const normalizedName = teamName.trim().toLowerCase()
    const attackingTeam = attackingPicks.find((team) => team.team.trim().toLowerCase() === normalizedName)
    const defensiveTeam = defensivePicks.find((team) => team.team.trim().toLowerCase() === normalizedName)
    return {
      attackingPlayers: (attackingTeam?.players ?? []).map((player) => ({
        name: player.web_name, position: player.position_name, position_name: player.position_name, price: player.now_cost,
        goals_pg: player.goals_per_game || 0, assists_pg: player.assists_per_game || 0,
        points_pg: player.points_per_game, points_per_game: player.points_per_game,
        ownership: player.selected_by_percent, selected_by_percent: player.selected_by_percent,
        attacker_score: player.attacker_score || 0, defender_score: 0, form: player.form ?? 0, clean_sheet_rate: 0,
      })),
      defensivePlayers: (defensiveTeam?.players ?? []).map((player) => ({
        name: player.web_name, position: player.position_name, position_name: player.position_name, price: player.now_cost,
        cs_rate: player.clean_sheet_rate, clean_sheet_rate: player.clean_sheet_rate,
        points_pg: player.points_per_game, points_per_game: player.points_per_game,
        ownership: player.selected_by_percent, selected_by_percent: player.selected_by_percent,
        defender_score: player.defender_score || 0, attacker_score: 0, form: player.form ?? 0,
      })),
    }
  }

  const openQuickPicks = (team: TeamRanking) => {
    setSelectedTeam(team)
    setIsModalOpen(true)
  }

  if (loading) {
    return <PageSkeleton label="Loading team rankings" />
  }

  if (error) {
    return <ErrorState title="Team rankings unavailable" description={error} onAction={() => void fetchData()} />
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader eyebrow="League intelligence" title="Team rankings" description="Compare attacking threat, defensive resilience, and overall strength across the league." />

        <section aria-label="Ranking highlights" className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            {[["Strongest attack", insights.strongestAttack, "1"], ["Best defense", insights.bestDefense, "2"], ["Lowest attack", insights.weakestAttack, "3"], ["Lowest defense", insights.weakestDefense, "4"]].map(([label, value, order], index) => (
              <div key={label} className={cn("flex min-h-28 items-center gap-4 p-5 sm:p-6", index > 0 && "border-t border-border sm:border-l sm:border-t-0", index === 2 && "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0")}>
                <span className="font-display text-3xl text-border" aria-hidden="true">{order.padStart(2, "0")}</span>
                <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-semibold text-foreground">{value}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Ranking controls" className="mb-6 min-w-0 rounded-xl border border-border bg-card p-3 sm:p-4">
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="grid min-w-0 grid-cols-3 overflow-hidden rounded-lg bg-secondary p-1 xl:w-auto" aria-label="Ranking view">
              {viewOptions.map((option) => {
                const Icon = option.icon
                const active = view === option.value
                return <button key={option.value} type="button" aria-pressed={active} onClick={() => setView(option.value)} className={cn("inline-flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:gap-2 sm:px-3", active && "bg-card text-foreground shadow-sm")}><Icon className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="truncate">{option.label}</span></button>
              })}
            </div>

            <div className="relative min-w-0 flex-1">
              <label htmlFor="team-search" className="sr-only">Search teams</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input id="team-search" type="search" placeholder="Search by team or code" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20" />
              {searchQuery ? <button type="button" aria-label="Clear team search" onClick={() => setSearchQuery("")} className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="h-4 w-4" /></button> : null}
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:flex">
              <label className="relative min-w-0"><span className="sr-only">Filter teams</span><SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><select value={filterMode} onChange={(event) => setFilterMode(event.target.value as FilterMode)} className="h-11 w-full min-w-0 max-w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-9 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 xl:w-36"><option value="all">All teams</option><option value="top5">Top five</option><option value="bottom5">Bottom five</option></select></label>
              <label className="relative min-w-0"><span className="sr-only">Sort teams</span><ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortMode)} className="h-11 w-full min-w-0 max-w-full appearance-none rounded-lg border border-input bg-background pl-10 pr-9 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 xl:w-44"><option value="rank">Sort by rank</option><option value="attack">Attack rank</option><option value="defense">Defense rank</option><option value="goals">Goals per game</option><option value="cleansheets">Clean-sheet rate</option></select></label>
            </div>

            {hasActiveFilters ? <Button variant="ghost" className="h-11 shrink-0 text-muted-foreground" onClick={() => { setSearchQuery(""); setFilterMode("all"); setSortBy("rank") }}>Clear</Button> : null}
          </div>
          <p className="mt-3 px-1 text-xs text-muted-foreground" aria-live="polite">Showing <span className="font-semibold text-foreground">{filteredTeams.length}</span> of {teams.length} teams</p>
        </section>

        {filteredTeams.length === 0 ? (
          <Card><CardContent className="flex min-h-52 flex-col items-center justify-center text-center"><Search className="mb-4 h-6 w-6 text-muted-foreground" aria-hidden="true" /><h2 className="text-xl">No teams found</h2><p className="mt-2 text-sm text-muted-foreground">Try a different team name or clear the filters.</p><Button variant="outline" className="mt-5" onClick={() => setSearchQuery("")}>Clear search</Button></CardContent></Card>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-xl border border-border bg-card xl:block">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Team rankings and performance metrics</caption>
                <thead className="border-b border-border bg-secondary/55 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><tr><th scope="col" className="w-16 px-5 py-4">Rank</th><th scope="col" className="min-w-52 px-4 py-4">Team</th><th scope="col" className="min-w-44 px-4 py-4">Attack</th><th scope="col" className="min-w-44 px-4 py-4">Defense</th><th scope="col" className="px-4 py-4 text-right">xG / match</th><th scope="col" className="px-4 py-4 text-right">CS rate</th><th scope="col" className="w-36 px-5 py-4"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody className="divide-y divide-border">
                  {filteredTeams.map((team) => (
                    <tr key={team.code} className="group transition-colors hover:bg-secondary/35">
                      <td className="px-5 py-4"><RankMark rank={rankForView(team)} /></td>
                      <th scope="row" className="px-4 py-4 font-medium"><div className="flex min-w-0 items-center gap-3"><TeamBadge code={team.code} /><div className="min-w-0"><p className="truncate font-semibold text-foreground">{team.name}</p><p className="mt-0.5 text-xs font-normal text-muted-foreground">Overall #{team.overallRank}</p></div></div></th>
                      <td className="px-4 py-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Rank #{team.attackRank}</span><span className="font-mono text-xs font-semibold tabular-nums">{team.goalsPerGame.toFixed(2)} G/90</span></div><StrengthBar value={team.attackStrengthPct} emphasis={view === "attack" ? "strong" : "regular"} /></td>
                      <td className="px-4 py-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">Rank #{team.defenseRank}</span><span className="font-mono text-xs font-semibold tabular-nums">{team.goalsConceded.toFixed(2)} GA/90</span></div><StrengthBar value={team.defenseStrengthPct} emphasis={view === "defense" ? "strong" : "regular"} /></td>
                      <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums">{team.xGPerGame.toFixed(2)}</td>
                      <td className="px-4 py-4 text-right font-mono font-semibold tabular-nums">{team.cleanSheetPct.toFixed(0)}%</td>
                      <td className="px-5 py-4 text-right"><Button variant="outline" size="sm" onClick={() => openQuickPicks(team)}><Sparkles className="h-4 w-4" aria-hidden="true" />Picks</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 xl:hidden">
              {filteredTeams.map((team) => (
                <article key={team.code} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><TeamBadge code={team.code} /><div className="min-w-0"><h2 className="truncate font-sans text-base font-semibold">{team.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">Overall rank #{team.overallRank}</p></div></div><RankMark rank={rankForView(team)} /></div>
                  <div className="mt-5 grid gap-4">
                    <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Attack · #{team.attackRank}</span><span className="font-mono tabular-nums text-muted-foreground">{team.goalsPerGame.toFixed(2)} goals/match</span></div><StrengthBar value={team.attackStrengthPct} emphasis={view === "attack" ? "strong" : "regular"} /></div>
                    <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Defense · #{team.defenseRank}</span><span className="font-mono tabular-nums text-muted-foreground">{team.cleanSheetPct.toFixed(0)}% clean sheets</span></div><StrengthBar value={team.defenseStrengthPct} emphasis={view === "defense" ? "strong" : "regular"} /></div>
                  </div>
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4"><div className="flex gap-4 text-xs text-muted-foreground"><span><strong className="font-mono text-foreground">{team.xGPerGame.toFixed(2)}</strong> xG</span><span><strong className="font-mono text-foreground">{team.goalsConceded.toFixed(2)}</strong> GA</span></div><Button variant="outline" size="sm" onClick={() => openQuickPicks(team)}>View picks</Button></div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedTeam ? <TeamPicksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} teamName={selectedTeam.name} teamCode={selectedTeam.code} attackRank={selectedTeam.attackRank} defenseRank={selectedTeam.defenseRank} {...getTeamPicksData(selectedTeam.name)} /> : null}
    </div>
  )
}
