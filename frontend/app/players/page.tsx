"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, RefreshCw, Search, X } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPlayerGameweeks, getPlayers, type GameweekEntry, type Player, positionLabel, teamBadgeClass } from "@/lib/api"

const positionOptions = [
  { label: "ALL", value: "all" },
  { label: "GK", value: "1" },
  { label: "DEF", value: "2" },
  { label: "MID", value: "3" },
  { label: "FWD", value: "4" },
]

const priceBands = [
  { label: "All", min: 0, max: 99 },
  { label: "Budget ≤5.5", min: 0, max: 5.5 },
  { label: "Mid 5.5–9", min: 5.5, max: 9 },
  { label: "Premium 9+", min: 9, max: 99 },
]

type SortKey = "total_points" | "name" | "cost" | "ownership" | "form" | "last_gw_points" | "xgi_per90"

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [position, setPosition] = useState("all")
  const [team, setTeam] = useState("all")
  const [minMinutes, setMinMinutes] = useState(0)
  const [priceBand, setPriceBand] = useState(0)
  const [sortKey, setSortKey] = useState<SortKey>("total_points")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [valueMode, setValueMode] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [gameweeks, setGameweeks] = useState<GameweekEntry[]>([])
  const [gameweeksLoading, setGameweeksLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await getPlayers({ sort: "total_points", order: "desc", limit: 1000 })
        if (!active) return
        setPlayers(result.players || [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load players")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const teams = useMemo(() => {
    return Array.from(new Set(players.map((player) => player.team_short))).sort()
  }, [players])

  const maxMinutes = useMemo(() => {
    const highest = players.reduce((acc, player) => Math.max(acc, player.total_minutes || 0), 0)
    return Math.max(90, Math.ceil(highest / 90) * 90)
  }, [players])

  const filteredPlayers = useMemo(() => {
    const band = priceBands[priceBand]
    const query = search.trim().toLowerCase()

    const result = players.filter((player) => {
      const matchesSearch =
        !query ||
        player.name.toLowerCase().includes(query) ||
        player.team.toLowerCase().includes(query) ||
        player.team_short.toLowerCase().includes(query)

      const matchesPosition = position === "all" || String(player.position) === position
      const matchesTeam = team === "all" || player.team_short === team
      const matchesMinutes = player.total_minutes >= minMinutes
      const matchesPrice = player.cost >= band.min && player.cost <= band.max

      return matchesSearch && matchesPosition && matchesTeam && matchesMinutes && matchesPrice
    })

    const activeSort: SortKey = valueMode ? "xgi_per90" : sortKey

    result.sort((left, right) => {
      const leftValue =
        activeSort === "name"
          ? left.name.toLowerCase()
          : activeSort === "xgi_per90"
            ? left.points_per_million
            : left[activeSort] ?? 0
      const rightValue =
        activeSort === "name"
          ? right.name.toLowerCase()
          : activeSort === "xgi_per90"
            ? right.points_per_million
            : right[activeSort] ?? 0

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return sortOrder === "asc" ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue)
      }

      const leftNumber = Number(leftValue)
      const rightNumber = Number(rightValue)
      return sortOrder === "asc" ? leftNumber - rightNumber : rightNumber - leftNumber
    })

    return result
  }, [players, search, position, team, minMinutes, priceBand, sortKey, sortOrder, valueMode])

  async function openPlayer(player: Player) {
    setSelectedPlayer(player)
    setGameweeks([])
    setGameweeksLoading(true)
    try {
      const response = await getPlayerGameweeks(player.id, 8)
      setGameweeks(response.gameweeks || [])
    } catch {
      setGameweeks([])
    } finally {
      setGameweeksLoading(false)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortOrder(key === "name" ? "asc" : "desc")
    setValueMode(false)
  }

  function sortIcon(key: SortKey) {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const minutesPerGame = selectedPlayer ? selectedPlayer.total_minutes / Math.max(selectedPlayer.gameweeks_played, 1) : 0

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
            <p className="text-lg font-semibold">Players unavailable</p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-secondary/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold sm:text-4xl">Players</h1>
          <p className="text-muted-foreground">Browse all players, sort by key metrics, and inspect recent form.</p>
        </section>

        <Card className="border-border/60 bg-background/80 backdrop-blur-sm">
          <CardContent className="space-y-4 p-4 lg:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search players or teams"
                className="w-full rounded-lg border border-border bg-background pl-9 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-foreground/20"
              />
              {search ? (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-5">
              <div className="flex flex-wrap gap-2 lg:col-span-2">
                {positionOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPosition(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      position === option.value ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <select
                value={team}
                onChange={(event) => setTeam(event.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All teams</option>
                {teams.map((shortName) => (
                  <option key={shortName} value={shortName}>
                    {shortName}
                  </option>
                ))}
              </select>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Min minutes</span>
                  <span>{minMinutes}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={maxMinutes}
                  step={90}
                  value={minMinutes}
                  onChange={(event) => setMinMinutes(Number(event.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {priceBands.map((band, index) => (
                  <button
                    key={band.label}
                    onClick={() => setPriceBand(index)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      priceBand === index ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {band.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setValueMode((current) => !current)
                  setSortKey("total_points")
                  setSortOrder("desc")
                }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  valueMode ? "bg-emerald-600 text-white" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                Value mode
              </button>
              <p className="text-xs text-muted-foreground">Click column headers to sort</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-secondary/40 text-left">
                  <tr>
                    {[
                      ["name", "Name"],
                      ["team", "Team"],
                      ["position", "Pos"],
                      ["cost", "Cost"],
                      ["ownership", "Own %"],
                      ["form", "Form"],
                      ["last_gw_points", "Last GW"],
                      ["total_points", "Season Pts"],
                      ["xgi_per90", "xGI/90"],
                    ].map(([key, label]) => (
                      <th
                        key={key}
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
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className="cursor-pointer border-b hover:bg-secondary/30" onClick={() => openPlayer(player)}>
                      <td className="px-4 py-3 font-medium">{player.name}</td>
                      <td className="px-4 py-3">
                        <Badge className={teamBadgeClass(player.team_short)}>{player.team_short}</Badge>
                      </td>
                      <td className="px-4 py-3">{positionLabel(player.position)}</td>
                      <td className="px-4 py-3">£{player.cost.toFixed(1)}</td>
                      <td className="px-4 py-3">{player.ownership.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${player.form >= 7 ? "bg-emerald-500/15 text-emerald-700" : player.form >= 5 ? "bg-amber-500/15 text-amber-700" : "bg-rose-500/15 text-rose-700"}`}>
                          {player.form.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{player.last_gw_points}</td>
                      <td className="px-4 py-3 font-semibold">{player.total_points}</td>
                      <td className="px-4 py-3">{player.xgi_per90.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedPlayer ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6">
          <div className="mx-auto flex h-full max-w-5xl items-stretch justify-center">
            <Card className="max-h-[92vh] w-full overflow-hidden border-border/70 bg-background shadow-2xl">
              <div className="grid h-full lg:grid-cols-[1.05fr_0.95fr]">
                <div className="flex h-full flex-col border-b lg:border-b-0 lg:border-r border-border/70">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/70">
                    <div>
                      <CardTitle className="text-2xl">{selectedPlayer.name}</CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge className={teamBadgeClass(selectedPlayer.team_short)}>{selectedPlayer.team_short}</Badge>
                        <Badge variant="outline">{positionLabel(selectedPlayer.position)}</Badge>
                      </div>
                    </div>
                    <button onClick={() => setSelectedPlayer(null)} className="rounded-full p-2 hover:bg-secondary">
                      <X className="h-5 w-5" />
                    </button>
                  </CardHeader>

                  <CardContent className="space-y-4 overflow-y-auto p-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["Cost", `£${selectedPlayer.cost.toFixed(1)}`],
                        ["Ownership", `${selectedPlayer.ownership.toFixed(1)}%`],
                        ["Total points", `${selectedPlayer.total_points}`],
                        ["Goals / Assists", `${selectedPlayer.goals} / ${selectedPlayer.assists}`],
                        ["Clean sheets", `${selectedPlayer.clean_sheets}`],
                        ["Form", selectedPlayer.form.toFixed(1)],
                        ["xGI/90", selectedPlayer.xgi_per90.toFixed(2)],
                        ["PVsXP", selectedPlayer.pvsxp_total.toFixed(1)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-1 text-lg font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["xG", selectedPlayer.xg.toFixed(2)],
                        ["xA", selectedPlayer.xa.toFixed(2)],
                        ["xGI", selectedPlayer.xgi.toFixed(2)],
                        ["Shots", selectedPlayer.shots.toFixed(0)],
                        ["Minutes / game", minutesPerGame.toFixed(1)],
                        ["Points / 90", selectedPlayer.points_per90.toFixed(2)],
                        ["PPM", selectedPlayer.points_per_million.toFixed(2)],
                        ["Def contrib.", selectedPlayer.defensive_contribution.toFixed(0)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-border/70 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-1 font-semibold">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 p-4">
                        <p className="text-sm font-semibold">Home split</p>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Points</p>
                            <p className="font-semibold">{selectedPlayer.home_points}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Goals</p>
                            <p className="font-semibold">{selectedPlayer.home_xg.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">xG</p>
                            <p className="font-semibold">{selectedPlayer.home_xg.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/70 p-4">
                        <p className="text-sm font-semibold">Away split</p>
                        <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Points</p>
                            <p className="font-semibold">{selectedPlayer.away_points}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Goals</p>
                            <p className="font-semibold">{selectedPlayer.away_xg.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">xG</p>
                            <p className="font-semibold">{selectedPlayer.away_xg.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="flex h-full flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border/70 p-5">
                    <div>
                      <p className="text-lg font-semibold">Last 8 gameweeks</p>
                      <p className="text-sm text-muted-foreground">Opponent labels on the x-axis, home fixtures highlighted.</p>
                    </div>
                    {gameweeksLoading ? <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                  </div>
                  <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    <div className="h-72 rounded-xl border border-border/70 p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gameweeks}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="opponent" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total_points" name="Points" radius={[6, 6, 0, 0]}>
                            {gameweeks.map((entry) => (
                              <Cell key={`${entry.gameweek}-${entry.opponent}`} fill={entry.was_home ? "#059669" : "#2563eb"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-border/70 p-4">
                        <p className="text-sm font-semibold mb-3">Recent form</p>
                        <div className="space-y-2 text-sm">
                          {gameweeks.map((entry) => (
                            <div key={`${entry.gameweek}-${entry.opponent}`} className="flex items-center justify-between">
                              <span className="text-muted-foreground">GW {entry.gameweek}</span>
                              <span className="font-semibold">{entry.total_points} pts vs {entry.opponent}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/70 p-4">
                        <p className="text-sm font-semibold mb-3">Over / underperformance</p>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">PVsXP total</span>
                            <span className={`font-semibold ${selectedPlayer.pvsxp_total >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{selectedPlayer.pvsxp_total.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Minutes / game</span>
                            <span className="font-semibold">{minutesPerGame.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Home points</span>
                            <span className="font-semibold">{selectedPlayer.home_points}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Away points</span>
                            <span className="font-semibold">{selectedPlayer.away_points}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
