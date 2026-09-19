"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange, Home, Sparkles, TrendingDown, TrendingUp } from "lucide-react"

import { ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import TeamPicksModal from "@/components/team-picks-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getQuickPicks, getTeamFixtureSummary } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type TeamSummary = {
  team: string
  team_short: string
  att: number
  def: number
  overall: number
  fixtures: number
  nearTermHomeFixtures: number
  mediumTermHomeFixtures: number
  nearTermRating: number
  mediumTermRating: number
  fixtureSwing: number
  swingCategory: "Improving" | "Declining" | "Stable"
}

type PickPlayer = {
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

type PickTeam = { team: string; players?: PickPlayer[] }

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

function score(value: number) {
  return Number(value || 0).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")
}

function SwingBadge({ value, category }: { value: number; category: TeamSummary["swingCategory"] }) {
  const improving = category === "Improving"
  const declining = category === "Declining"
  const Icon = improving ? ArrowUpRight : declining ? ArrowDownRight : ArrowRight
  return <Badge variant="outline" className={cn(improving && "border-success/30 bg-success/10 text-success", declining && "border-destructive/30 bg-destructive/10 text-destructive", !improving && !declining && "bg-secondary text-muted-foreground")}><Icon className="h-3 w-3" />{category} {value > 0 ? "+" : ""}{score(value)}</Badge>
}

function HorizonList({ title, description, rows, horizon, onViewPicks }: { title: string; description: string; rows: TeamSummary[]; horizon: "near" | "medium"; onViewPicks: (team: TeamSummary) => void }) {
  return (
    <section aria-labelledby={`${horizon}-title`} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{horizon === "near" ? "Immediate priority" : "Plan ahead"}</p><h2 id={`${horizon}-title`} className="mt-1 text-3xl font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p></div>
      <div className="divide-y divide-border">
        {rows.slice(0, 7).map((team, index) => {
          const rating = horizon === "near" ? team.nearTermRating : team.mediumTermRating
          const homes = horizon === "near" ? team.nearTermHomeFixtures : team.mediumTermHomeFixtures
          return (
            <article key={`${horizon}-${team.team}`} className="p-4 transition-colors hover:bg-secondary/25 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{index + 1}</span><TeamBadge code={team.team_short || team.team} /><div className="min-w-0"><h3 className="truncate font-sans text-sm font-semibold">{team.team}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Home className="h-3 w-3" />{homes} home fixtures</p></div></div>
                <div className="text-right"><p className="font-mono text-lg font-semibold tabular-nums">{score(rating)}</p><p className="text-[11px] text-muted-foreground">favorability</p></div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><div className="flex items-center gap-2"><SwingBadge value={team.fixtureSwing} category={team.swingCategory} /><span className="text-xs text-muted-foreground">ATT {score(team.att)} · DEF {score(team.def)}</span></div><Button variant="ghost" size="sm" onClick={() => onViewPicks(team)}><Sparkles className="h-4 w-4" />Player picks</Button></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function TransferTargetsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [attackingPicks, setAttackingPicks] = useState<PickTeam[]>([])
  const [defensivePicks, setDefensivePicks] = useState<PickTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [summary, attacking, defensive] = await Promise.all([getTeamFixtureSummary(), getQuickPicks("attacking"), getQuickPicks("defensive")])
      setTeams(summary as TeamSummary[])
      setAttackingPicks(attacking as PickTeam[])
      setDefensivePicks(defensive as PickTeam[])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load transfer planning data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const byNearTerm = useMemo(() => [...teams].sort((a, b) => b.nearTermRating - a.nearTermRating), [teams])
  const byMediumTerm = useMemo(() => [...teams].sort((a, b) => b.mediumTermRating - a.mediumTermRating), [teams])
  const bySwing = useMemo(() => [...teams].sort((a, b) => b.fixtureSwing - a.fixtureSwing), [teams])
  const bestImprovement = bySwing[0]
  const biggestDecline = bySwing.at(-1)

  const modalPlayers = (teamName: string): { attackingPlayers: ModalPlayer[]; defensivePlayers: ModalPlayer[] } => {
    const normalized = teamName.trim().toLowerCase()
    const attacking = attackingPicks.find((team) => team.team.trim().toLowerCase() === normalized)
    const defensive = defensivePicks.find((team) => team.team.trim().toLowerCase() === normalized)
    const mapBase = (player: PickPlayer) => ({ name: player.web_name, position: player.position_name, position_name: player.position_name, price: player.now_cost, points_pg: player.points_per_game, points_per_game: player.points_per_game, ownership: player.selected_by_percent, selected_by_percent: player.selected_by_percent, form: player.form ?? 0 })
    return {
      attackingPlayers: (attacking?.players ?? []).map((player) => ({ ...mapBase(player), goals_pg: player.goals_per_game ?? 0, assists_pg: player.assists_per_game ?? 0, attacker_score: player.attacker_score ?? 0, defender_score: 0, clean_sheet_rate: 0 })),
      defensivePlayers: (defensive?.players ?? []).map((player) => ({ ...mapBase(player), cs_rate: player.clean_sheet_rate ?? 0, clean_sheet_rate: player.clean_sheet_rate ?? 0, defender_score: player.defender_score ?? 0, attacker_score: 0 })),
    }
  }

  if (loading) return <PageSkeleton label="Loading transfer planner" />
  if (error) return <ErrorState title="Transfer planner unavailable" description={error} onAction={() => void fetchData()} />

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"><div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Transfer planner" title="Plan the fixture swing, not just the next match." description="Compare immediate and medium-term schedules to identify clubs whose opportunity is improving before the market catches up." />

      <section aria-label="Transfer planning highlights" className="mb-8 grid gap-3 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Best swing</p><p className="mt-1 truncate font-semibold">{bestImprovement?.team ?? "—"}</p><p className="text-xs text-success">{bestImprovement ? `+${score(bestImprovement.fixtureSwing)}` : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/10 text-destructive"><TrendingDown className="h-5 w-5" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Toughest swing</p><p className="mt-1 truncate font-semibold">{biggestDecline?.team ?? "—"}</p><p className="text-xs text-destructive">{biggestDecline ? score(biggestDecline.fixtureSwing) : "—"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-muted-foreground"><CalendarRange className="h-5 w-5" /></div><div><p className="font-mono text-2xl font-semibold">{teams.length}</p><p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Clubs modelled</p></div></CardContent></Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-2"><HorizonList title="Next five fixtures" description="Clubs with the strongest immediate schedule and useful home concentration." rows={byNearTerm} horizon="near" onViewPicks={setSelectedTeam} /><HorizonList title="Following five fixtures" description="Clubs whose medium-term schedule deserves an early watchlist place." rows={byMediumTerm} horizon="medium" onViewPicks={setSelectedTeam} /></div>

      <section className="mt-8" aria-labelledby="swing-title"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Market timing</p><h2 id="swing-title" className="mt-1 text-3xl font-medium">Fixture swing table</h2></div><div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[720px] text-sm"><thead className="bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="px-4 py-4 text-left">Club</th><th className="px-4 py-4 text-right">Next five</th><th className="px-4 py-4 text-right">Following five</th><th className="px-4 py-4 text-right">Swing</th><th className="px-4 py-4 text-right">Favourable fixtures</th></tr></thead><tbody className="divide-y divide-border">{bySwing.map((team) => <tr key={team.team} className="hover:bg-secondary/25"><th scope="row" className="px-4 py-3"><div className="flex items-center gap-3"><TeamBadge code={team.team_short || team.team} /><span>{team.team}</span></div></th><td className="px-4 py-3 text-right font-mono">{score(team.nearTermRating)}</td><td className="px-4 py-3 text-right font-mono">{score(team.mediumTermRating)}</td><td className="px-4 py-3 text-right"><SwingBadge value={team.fixtureSwing} category={team.swingCategory} /></td><td className="px-4 py-3 text-right font-mono">{team.fixtures}</td></tr>)}</tbody></table></div></section>

      {selectedTeam ? <TeamPicksModal isOpen={Boolean(selectedTeam)} onClose={() => setSelectedTeam(null)} teamName={selectedTeam.team} teamCode={selectedTeam.team_short || selectedTeam.team} {...modalPlayers(selectedTeam.team)} /> : null}
    </div></div>
  )
}
