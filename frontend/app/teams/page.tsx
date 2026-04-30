"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getTeamPlayers, getTeams, positionLabel, teamBadgeClass, type Player, type Team } from "@/lib/api"

const positionOptions = ["all", "1", "2", "3", "4"] as const

type SortKey =
  | "overall_rank"
  | "attack_rank"
  | "defense_rank"
  | "goals_per_game"
  | "xg_per_game"
  | "clean_sheet_rate"
  | "goals_conceded_per_game"
  | "home_goals_per_game"
  | "away_goals_per_game"

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("overall_rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [splitMode, setSplitMode] = useState<"home" | "away">("home")
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([])
  const [playerFilter, setPlayerFilter] = useState<(typeof positionOptions)[number]>("all")
  const [playersLoading, setPlayersLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getTeams("overall_rank", "asc")
        if (!active) return
        setTeams(result.teams || [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load teams")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const sortedTeams = useMemo(() => {
    const copy = [...teams]
    copy.sort((left, right) => {
      const leftValue = left[sortKey] ?? 0
      const rightValue = right[sortKey] ?? 0
      return sortOrder === "asc" ? Number(leftValue) - Number(rightValue) : Number(rightValue) - Number(leftValue)
    })
    return copy
  }, [teams, sortKey, sortOrder])

  async function openTeam(team: Team) {
    setSelectedTeam(team)
    setTeamPlayers([])
    setPlayerFilter("all")
    setPlayersLoading(true)
    try {
      const result = await getTeamPlayers(team.id, { sort: "form" })
      setTeamPlayers(result.players || [])
    } catch {
      setTeamPlayers([])
    } finally {
      setPlayersLoading(false)
    }
  }

  const visibleTeamPlayers = useMemo(() => {
    const filtered = teamPlayers.filter((player) => playerFilter === "all" || String(player.position) === playerFilter)
    return [...filtered].sort((left, right) => {
      const leftValue = left.form ?? 0
      const rightValue = right.form ?? 0
      return Number(rightValue) - Number(leftValue)
    })
  }, [teamPlayers, playerFilter])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortOrder(key === "overall_rank" ? "asc" : "desc")
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const splitLabel = splitMode === "home" ? "Home" : "Away"

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="rounded-full border-2 border-slate-300 border-t-emerald-500 h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-lg font-semibold">Teams unavailable</p>
            <p className="text-sm text-muted-foreground">{error}</p>
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

  const summaryColumns = [
    ["Overall rank", selectedTeam?.overall_rank],
    ["Attack rank", selectedTeam?.attack_rank],
    ["Defense rank", selectedTeam?.defense_rank],
    ["Strength", selectedTeam?.overall_strength],
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-secondary/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold sm:text-4xl">Teams</h1>
          <p className="text-muted-foreground">Compare team strength, home and away splits, and squad depth.</p>
        </section>

        <Card className="border-border/60 bg-background/80 backdrop-blur-sm">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 lg:p-5">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-1">
              {(["home", "away"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSplitMode(mode)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${splitMode === mode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {mode === "home" ? "Home splits" : "Away splits"}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Showing {splitLabel.toLowerCase()} metrics in the main stat columns.</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/40 text-left">
                  <tr>
                    {[
                      ["overall_rank", "Rank"],
                      ["name", "Team"],
                      ["attack_rank", "Attack"],
                      ["defense_rank", "Defense"],
                      ["goals_per_game", "Goals/Gm"],
                      ["xg_per_game", "xG/Gm"],
                      ["clean_sheet_rate", "CS %"],
                      ["goals_conceded_per_game", "Conceded/Gm"],
                      [splitMode === "home" ? "home_goals_per_game" : "away_goals_per_game", `${splitLabel} Goals/Gm`],
                    ].map(([key, label]) => (
                      <th
                        key={String(key)}
                        className="cursor-pointer px-4 py-3 font-semibold hover:bg-secondary/70"
                        onClick={() => toggleSort(key as SortKey)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {label}
                          {sortIcon(key as SortKey)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team) => (
                    <tr key={team.id} className="cursor-pointer border-b hover:bg-secondary/30" onClick={() => openTeam(team)}>
                      <td className="px-4 py-3 font-semibold">{team.overall_rank}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Badge className={teamBadgeClass(team.short_name)}>{team.short_name}</Badge>
                          <span className="font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{team.attack_rank}</td>
                      <td className="px-4 py-3">{team.defense_rank}</td>
                      <td className="px-4 py-3">{team.goals_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3">{team.xg_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3">{(team.clean_sheet_rate * 100).toFixed(1)}%</td>
                      <td className="px-4 py-3">{team.goals_conceded_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {splitMode === "home"
                          ? `${team.home_goals_per_game.toFixed(2)} / ${(team.home_clean_sheet_rate * 100).toFixed(1)}%`
                          : `${team.away_goals_per_game.toFixed(2)} / ${(team.away_clean_sheet_rate * 100).toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedTeam ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-5xl items-stretch justify-center">
            <Card className="max-h-[92vh] w-full overflow-hidden border-border/70 bg-background shadow-2xl">
              <div className="flex h-full flex-col">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/70">
                  <div>
                    <CardTitle className="text-2xl">{selectedTeam.name}</CardTitle>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className={teamBadgeClass(selectedTeam.short_name)}>{selectedTeam.short_name}</Badge>
                      <Badge variant="outline">Overall #{selectedTeam.overall_rank}</Badge>
                      <Badge variant="outline">Attack #{selectedTeam.attack_rank}</Badge>
                      <Badge variant="outline">Defense #{selectedTeam.defense_rank}</Badge>
                    </div>
                  </div>
                  <button onClick={() => setSelectedTeam(null)} className="rounded-full p-2 hover:bg-secondary">
                    <X className="h-5 w-5" />
                  </button>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {summaryColumns.map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                        <p className="mt-1 text-lg font-semibold">{value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {positionOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => setPlayerFilter(option)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${playerFilter === option ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                      >
                        {option === "all" ? "All" : positionLabel(option)}
                      </button>
                    ))}
                    {playersLoading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                  </div>

                  <div className="overflow-hidden rounded-xl border border-border/70">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary/40 text-left">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Player</th>
                            <th className="px-4 py-3 font-semibold">Pos</th>
                            <th className="px-4 py-3 font-semibold">Cost</th>
                            <th className="px-4 py-3 font-semibold">Form</th>
                            <th className="px-4 py-3 font-semibold">Season Pts</th>
                            <th className="px-4 py-3 font-semibold">xGI/90</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleTeamPlayers.map((player) => (
                            <tr key={player.id} className="border-t">
                              <td className="px-4 py-3 font-medium">{player.name}</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline">{positionLabel(player.position)}</Badge>
                              </td>
                              <td className="px-4 py-3">£{player.cost.toFixed(1)}</td>
                              <td className="px-4 py-3">{player.form.toFixed(1)}</td>
                              <td className="px-4 py-3">{player.total_points}</td>
                              <td className="px-4 py-3">{player.xgi_per90.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
