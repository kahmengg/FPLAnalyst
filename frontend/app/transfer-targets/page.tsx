"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Home, Sparkles } from "lucide-react"

import { ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { TeamBadge } from "@/components/team-badge"
import TeamPicksModal from "@/components/team-picks-modal"
import { Button } from "@/components/ui/button"
import { getQuickPicks, getTeamFixtureSummary } from "@/lib/supabase"

type UpcomingFixture = {
  gw: number
  opponent: string
  opponentShort: string
  isHome: boolean
  difficulty: number
  favorability: number
}

type TeamSummary = {
  team: string
  team_short: string
  att: number
  def: number
  overall: number
  fixtures: number
  nearTermHomeFixtures: number
  nearTermRating: number
  upcomingFixtures: UpcomingFixture[]
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

function FixtureSequence({ fixtures }: { fixtures: UpcomingFixture[] }) {
  if (fixtures.length === 0) return <p className="text-xs text-muted-foreground">No upcoming fixtures</p>

  return (
    <ol className="flex flex-wrap gap-1.5" aria-label="Next five fixtures">
      {fixtures.map((fixture, index) => {
        const venue = fixture.isHome ? "H" : "A"
        const opponent = fixture.opponentShort || fixture.opponent || "TBC"
        return (
          <li
            key={`${fixture.gw}-${opponent}-${venue}-${index}`}
            className="min-w-[4.25rem] rounded-md border border-border bg-background px-2 py-1.5 text-center"
            title={`Gameweek ${fixture.gw}: ${fixture.opponent || opponent} (${fixture.isHome ? "home" : "away"})`}
          >
            <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">GW {fixture.gw}</span>
            <span className="mt-0.5 block font-mono text-xs font-semibold tabular-nums">{opponent} <span className="font-normal text-muted-foreground">({venue})</span></span>
          </li>
        )
      })}
    </ol>
  )
}

function NextFiveList({ rows, onViewPicks }: { rows: TeamSummary[]; onViewPicks: (team: TeamSummary) => void }) {
  return (
    <section aria-labelledby="next-five-title" className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5 sm:p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Immediate priority</p><h2 id="next-five-title" className="mt-1 text-3xl font-medium">Best next-five schedules</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Clubs ranked by the model&apos;s average fixture favourability across their next five matches.</p></div>
      <div className="divide-y divide-border">
        {rows.slice(0, 7).map((team, index) => (
            <article key={team.team} className="p-4 transition-colors hover:bg-secondary/25 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3"><span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{index + 1}</span><TeamBadge code={team.team_short || team.team} /><div className="min-w-0"><h3 className="truncate font-sans text-sm font-semibold">{team.team}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Home className="h-3 w-3" />{team.nearTermHomeFixtures} home fixtures</p></div></div>
                <div className="text-right"><p className="font-mono text-lg font-semibold tabular-nums">{score(team.nearTermRating)}</p><p className="text-[11px] text-muted-foreground">model rating</p></div>
              </div>
              <div className="mt-4 grid gap-3 border-t border-border pt-3 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Fixtures</p><FixtureSequence fixtures={team.upcomingFixtures ?? []} /></div><Button variant="ghost" size="sm" onClick={() => onViewPicks(team)}><Sparkles className="h-4 w-4" />Player picks</Button></div>
            </article>
        ))}
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
      <PageHeader eyebrow="Transfer planner" title="Focus on the next five." description="Compare each club's immediate run, see every opponent, and move directly from schedule strength to player picks." />

      <NextFiveList rows={byNearTerm} onViewPicks={setSelectedTeam} />

      <section className="mt-8" aria-labelledby="schedule-title"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">All clubs</p><h2 id="schedule-title" className="mt-1 text-3xl font-medium">Next-five schedule table</h2><p className="mt-2 text-sm text-muted-foreground">H and A indicate whether each fixture is at home or away.</p></div><div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full min-w-[980px] text-sm"><thead className="bg-secondary text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"><tr><th className="px-4 py-4 text-left">Club</th><th className="px-4 py-4 text-left">Upcoming fixtures</th><th className="px-4 py-4 text-right">Model rating</th><th className="px-4 py-4 text-right">Home</th><th className="px-4 py-4 text-right">Favourable</th><th className="px-4 py-4 text-right"><span className="sr-only">Player picks</span></th></tr></thead><tbody className="divide-y divide-border">{byNearTerm.map((team) => <tr key={team.team} className="hover:bg-secondary/25"><th scope="row" className="px-4 py-3"><div className="flex items-center gap-3"><TeamBadge code={team.team_short || team.team} /><span>{team.team}</span></div></th><td className="px-4 py-3"><FixtureSequence fixtures={team.upcomingFixtures ?? []} /></td><td className="px-4 py-3 text-right font-mono tabular-nums">{score(team.nearTermRating)}</td><td className="px-4 py-3 text-right font-mono tabular-nums">{team.nearTermHomeFixtures}</td><td className="px-4 py-3 text-right font-mono tabular-nums">{team.fixtures}</td><td className="px-4 py-3 text-right"><Button variant="ghost" size="sm" onClick={() => setSelectedTeam(team)}><Sparkles className="h-4 w-4" />Picks</Button></td></tr>)}</tbody></table></div></section>

      {selectedTeam ? <TeamPicksModal isOpen={Boolean(selectedTeam)} onClose={() => setSelectedTeam(null)} teamName={selectedTeam.team} teamCode={selectedTeam.team_short || selectedTeam.team} {...modalPlayers(selectedTeam.team)} /> : null}
    </div></div>
  )
}
