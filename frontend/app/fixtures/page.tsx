"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, RefreshCw } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fdrClass, getFixtureGrid, getFixtures, teamBadgeClass, type FixtureGridResponse, type FixtureListItem } from "@/lib/api"

export default function FixturesPage() {
  const [grid, setGrid] = useState<FixtureGridResponse | null>(null)
  const [fixtures, setFixtures] = useState<FixtureListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"attack" | "defense">("attack")
  const [teamFilter, setTeamFilter] = useState("all")
  const [gwFilter, setGwFilter] = useState("")

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [gridResult, fixtureResult] = await Promise.all([getFixtureGrid(), getFixtures()])
        if (!active) return
        setGrid(gridResult)
        setFixtures(fixtureResult.fixtures || [])
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load fixtures")
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const teamList = useMemo(() => {
    const keys = Object.keys(grid?.teams || {})
    return keys.sort()
  }, [grid])

  const gameweeks = grid?.gameweeks || []

  const filteredFixtures = useMemo(() => {
    return fixtures.filter((fixture) => {
      const matchesTeam = teamFilter === "all" || fixture.home_team_short === teamFilter || fixture.away_team_short === teamFilter
      const matchesGw = !gwFilter || String(fixture.gameweek) === gwFilter
      return matchesTeam && matchesGw
    })
  }, [fixtures, teamFilter, gwFilter])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="rounded-full border-2 border-slate-300 border-t-emerald-500 h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (error || !grid) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <p className="text-lg font-semibold">Fixtures unavailable</p>
            <p className="text-sm text-muted-foreground">{error || "Unable to load fixture data."}</p>
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
          <h1 className="flex items-center gap-2 text-3xl font-bold sm:text-4xl">
            <CalendarDays className="h-8 w-8" />
            Fixtures
          </h1>
          <p className="text-muted-foreground">Switch between a classic difficulty grid and a filterable fixture list.</p>
        </section>

        <Tabs defaultValue="grid" className="space-y-4">
          <TabsList className="grid w-full max-w-sm grid-cols-2">
            <TabsTrigger value="grid">Grid view</TabsTrigger>
            <TabsTrigger value="list">List view</TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-4">
            <Card className="border-border/60 bg-background/80 backdrop-blur-sm">
              <CardContent className="space-y-4 p-4 lg:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setView("attack")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "attack" ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                  >
                    Attack FDR
                  </button>
                  <button
                    onClick={() => setView("defense")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === "defense" ? "bg-foreground text-background" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
                  >
                    Defense FDR
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-secondary/40 text-left">
                      <tr>
                        <th className="sticky left-0 z-10 bg-background px-4 py-3 font-semibold">Team</th>
                        {gameweeks.map((gameweek) => (
                          <th key={gameweek} className="px-2 py-3 text-center font-semibold">
                            GW {gameweek}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamList.map((shortName) => {
                        const row = grid.teams[shortName] || {}
                        return (
                          <tr key={shortName} className="border-b transition hover:bg-secondary/30">
                            <td className="sticky left-0 z-10 bg-background px-4 py-3 font-semibold">
                              <Badge className={teamBadgeClass(shortName)}>{shortName}</Badge>
                            </td>
                            {gameweeks.map((gameweek) => {
                              const cell = row[String(gameweek)]
                              const fdr = view === "attack" ? cell?.attack_fdr : cell?.defense_fdr
                              return (
                                <td key={gameweek} className="px-2 py-3 text-center">
                                  {cell && fdr ? (
                                    <div className={`rounded-lg px-2 py-2 ${fdrClass(fdr)}`}>
                                      <div className="text-[11px] font-semibold leading-tight">{cell.opponent}</div>
                                      <div className="text-[10px] opacity-90">{cell.home ? "H" : "A"}</div>
                                    </div>
                                  ) : (
                                    <div className="text-xs text-muted-foreground">-</div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <Card className="border-border/60 bg-background/80 backdrop-blur-sm">
              <CardContent className="flex flex-wrap gap-3 p-4 lg:p-5">
                <select
                  value={teamFilter}
                  onChange={(event) => setTeamFilter(event.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All teams</option>
                  {teamList.map((shortName) => (
                    <option key={shortName} value={shortName}>
                      {shortName}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max={Math.max(...gameweeks, 38)}
                  placeholder="Gameweek"
                  value={gwFilter}
                  onChange={(event) => setGwFilter(event.target.value)}
                  className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />

                <button
                  onClick={() => {
                    setTeamFilter("all")
                    setGwFilter("")
                  }}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold hover:bg-secondary/80"
                >
                  Clear filters
                </button>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {filteredFixtures.map((fixture) => (
                <Card key={`${fixture.gameweek}-${fixture.home_team_short}-${fixture.away_team_short}`} className="border-border/60 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4 lg:p-5">
                    <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                      <span>GW {fixture.gameweek}</span>
                      <span>{fixture.home_team} vs {fixture.away_team}</span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-border/70 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <Badge className={teamBadgeClass(fixture.home_team_short)}>{fixture.home_team_short}</Badge>
                          <span className="font-semibold">Home</span>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Attack FDR</span>
                            <Badge className={fdrClass(fixture.home_attack_fdr)}>{fixture.home_attack_fdr.toFixed(1)}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Defense FDR</span>
                            <Badge className={fdrClass(fixture.home_defense_fdr)}>{fixture.home_defense_fdr.toFixed(1)}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 p-4">
                        <div className="mb-3 flex items-center justify-end gap-2">
                          <span className="font-semibold">Away</span>
                          <Badge className={teamBadgeClass(fixture.away_team_short)}>{fixture.away_team_short}</Badge>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Attack FDR</span>
                            <Badge className={fdrClass(fixture.away_attack_fdr)}>{fixture.away_attack_fdr.toFixed(1)}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Defense FDR</span>
                            <Badge className={fdrClass(fixture.away_defense_fdr)}>{fixture.away_defense_fdr.toFixed(1)}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
