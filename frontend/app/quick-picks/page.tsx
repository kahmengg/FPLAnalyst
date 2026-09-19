"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, Shield, Sparkles, Target, Users } from "lucide-react"

import { EmptyState, ErrorState, PageSkeleton } from "@/components/data-state"
import { PageHeader } from "@/components/page-header"
import { PlayerSummaryCard } from "@/components/player-summary-card"
import { TeamBadge } from "@/components/team-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getQuickPicks } from "@/lib/supabase"

type PickMode = "attacking" | "defensive"

type PickPlayer = {
  web_name: string
  position_name: string
  now_cost: number
  points_per_game: number
  goals_per_game?: number
  assists_per_game?: number
  clean_sheet_rate?: number
  selected_by_percent: number
  attacker_score?: number
  defender_score?: number
  defensive_contributions?: number
  form: number
  status?: string
}

type TeamPicks = {
  team: string
  short_name: string
  players: PickPlayer[]
  attack_rank?: number
  defense_rank?: number
}

function recommendation(player: PickPlayer, mode: PickMode) {
  const score = mode === "attacking" ? player.attacker_score ?? 0 : player.defender_score ?? 0
  const threshold = mode === "attacking" ? { elite: 2.2, strong: 1.5 } : { elite: 3, strong: 2 }
  if (score >= threshold.elite || (player.points_per_game >= 6 && player.form >= 5)) return { label: "Top pick", tone: "border-success/30 bg-success/10 text-success" }
  if (score >= threshold.strong && player.selected_by_percent < 15) return { label: "Differential", tone: "border-foreground/20 bg-secondary text-foreground" }
  if (score >= threshold.strong) return { label: "Solid choice", tone: "border-foreground/20 bg-secondary text-foreground" }
  if (score >= threshold.strong * 0.7) return { label: "Monitor", tone: "border-warning/30 bg-warning/10 text-warning" }
  return { label: "Risky", tone: "border-destructive/30 bg-destructive/10 text-destructive" }
}

function PickCard({ player, team, mode, rank }: { player: PickPlayer; team: TeamPicks; mode: PickMode; rank: number }) {
  const rec = recommendation(player, mode)
  const score = mode === "attacking" ? player.attacker_score : player.defender_score
  return (
      <PlayerSummaryCard
        rank={rank}
        player={{
          name: player.web_name,
          teamCode: team.short_name || team.team,
          teamName: team.team,
          position: player.position_name,
          price: player.now_cost,
          totalPoints: player.points_per_game,
          pointsLabel: "Points / match",
          form: player.form,
          ownership: player.selected_by_percent,
          defensiveContribution: mode === "defensive" ? player.defensive_contributions : undefined,
          status: player.status,
        }}
        footer={<><Badge variant="outline" className={rec.tone}>{rec.label}</Badge><span className="font-mono text-xs font-semibold text-muted-foreground" aria-label={`Model score ${score ?? 0}`}>Score {Number(score ?? 0).toFixed(2)}</span></>}
      />
  )
}

function PickCollection({ teams, mode, selectedTeam }: { teams: TeamPicks[]; mode: PickMode; selectedTeam: string }) {
  const visibleTeams = selectedTeam === "all" ? teams : teams.filter((team) => team.short_name === selectedTeam)
  if (!visibleTeams.length) return <EmptyState title="No recommendations found" description="Try another team or return to all clubs." />

  return (
    <div className="space-y-6">
      {visibleTeams.map((team) => {
        const sortedPlayers = [...(team.players ?? [])].sort((a, b) => {
          const aScore = mode === "attacking" ? a.attacker_score ?? 0 : a.defender_score ?? 0
          const bScore = mode === "attacking" ? b.attacker_score ?? 0 : b.defender_score ?? 0
          return bScore - aScore
        })
        const teamRank = mode === "attacking" ? team.attack_rank : team.defense_rank

        return (
          <section key={`${mode}-${team.short_name || team.team}`} aria-labelledby={`${mode}-${team.short_name}`}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <TeamBadge code={team.short_name || team.team} />
                <div className="min-w-0"><h2 id={`${mode}-${team.short_name}`} className="truncate font-sans text-lg font-semibold">{team.team}</h2><p className="text-xs text-muted-foreground">{sortedPlayers.length} recommended {sortedPlayers.length === 1 ? "player" : "players"}</p></div>
              </div>
              {teamRank ? <Badge variant="outline" className="bg-card">League rank #{teamRank}</Badge> : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {sortedPlayers.map((player, index) => <PickCard key={`${team.short_name}-${player.web_name}`} player={player} team={team} mode={mode} rank={index + 1} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export default function QuickPicksPage() {
  const [attackingTeams, setAttackingTeams] = useState<TeamPicks[]>([])
  const [defensiveTeams, setDefensiveTeams] = useState<TeamPicks[]>([])
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [attacking, defensive] = await Promise.all([getQuickPicks("attacking"), getQuickPicks("defensive")])
      setAttackingTeams(attacking as TeamPicks[])
      setDefensiveTeams(defensive as TeamPicks[])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to load recommendations")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  const allTeams = useMemo(() => {
    const byCode = new Map<string, TeamPicks>()
    for (const team of [...attackingTeams, ...defensiveTeams]) byCode.set(team.short_name || team.team, team)
    return [...byCode.values()].sort((a, b) => a.team.localeCompare(b.team))
  }, [attackingTeams, defensiveTeams])

  const playerCount = new Set([...attackingTeams, ...defensiveTeams].flatMap((team) => team.players.map((player) => player.web_name))).size

  if (loading) return <PageSkeleton label="Loading recommendations" />
  if (error) return <ErrorState title="Recommendations unavailable" description={error} onAction={() => void fetchData()} />

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          eyebrow="Recommendations"
          title="A sharper FPL shortlist."
          description="Prioritised attacking and defensive options using current output, form, ownership and role-specific model scores."
          actions={
            <label className="relative block min-w-52"><span className="sr-only">Filter recommendations by club</span><select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)} className="h-11 w-full appearance-none rounded-lg border border-input bg-card pl-3 pr-9 text-sm font-medium outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"><option value="all">All clubs</option>{allTeams.map((team) => <option key={team.short_name || team.team} value={team.short_name || team.team}>{team.team}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></label>
          }
        />

        <section aria-label="Recommendation overview" className="mb-6 grid gap-3 sm:grid-cols-3">
          {[{ label: "Clubs represented", value: allTeams.length, icon: Users }, { label: "Players shortlisted", value: playerCount, icon: Sparkles }, { label: "Recommendation models", value: 2, icon: Target }].map((item) => <Card key={item.label}><CardContent className="flex items-center gap-4"><div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-muted-foreground"><item.icon className="h-5 w-5" /></div><div><p className="font-mono text-2xl font-semibold tabular-nums">{item.value}</p><p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{item.label}</p></div></CardContent></Card>)}
        </section>

        <Tabs defaultValue="attacking">
          <TabsList className="mb-6 grid w-full max-w-lg grid-cols-2 bg-secondary p-1">
            <TabsTrigger value="attacking" className="gap-2"><Target className="h-4 w-4" />Attacking</TabsTrigger>
            <TabsTrigger value="defensive" className="gap-2"><Shield className="h-4 w-4" />Defensive</TabsTrigger>
          </TabsList>
          <TabsContent value="attacking" className="mt-0"><PickCollection teams={attackingTeams} mode="attacking" selectedTeam={selectedTeam} /></TabsContent>
          <TabsContent value="defensive" className="mt-0"><PickCollection teams={defensiveTeams} mode="defensive" selectedTeam={selectedTeam} /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
