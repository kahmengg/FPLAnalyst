"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "lucide-react"
import { getFixtures } from "@/lib/supabase"

interface Fixture {
  gw: number
  gameweek: number
  fixture: string
  home_team: {
    name: string
    short_name: string
    attacking_fixture_rating: number
    defensive_fixture_rating: number
  }
  away_team: {
    name: string
    short_name: string
    attacking_fixture_rating: number
    defensive_fixture_rating: number
  }
  favorability: string
}

const getDifficultyColor = (rating: number) => {
  if (rating <= 2) return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
  if (rating <= 3) return "bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200"
  if (rating <= 4) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200"
  if (rating <= 5) return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200"
  return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
}

const getDifficultyLabel = (rating: number) => {
  if (rating <= 2) return "Easy"
  if (rating <= 3) return "Moderate"
  if (rating <= 4) return "Hard"
  if (rating <= 5) return "Very Hard"
  return "Extremely Hard"
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter/View states
  const [fdrType, setFdrType] = useState<"attack" | "defense">("attack")
  const [listTeamFilter, setListTeamFilter] = useState<string>("all")
  const [listGWFilter, setListGWFilter] = useState<string>("all")

  // Fetch fixtures
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const data = await getFixtures()
        setFixtures(data || [])
      } catch (err) {
        setError("Failed to fetch fixtures")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const gameweeks = useMemo(() => {
    const gws = [...new Set(fixtures.map((f) => f.gw))].sort((a, b) => a - b)
    return gws
  }, [fixtures])

  const teams = useMemo(() => {
    const allTeams = new Set<string>()
    fixtures.forEach((f) => {
      allTeams.add(f.home_team.short_name)
      allTeams.add(f.away_team.short_name)
    })
    return Array.from(allTeams).sort()
  }, [fixtures])

  // Grid view data
  const gridData = useMemo(() => {
    const grid: Record<string, Record<number, any>> = {}

    fixtures.forEach((fixture) => {
      const homeTeam = fixture.home_team.short_name
      const awayTeam = fixture.away_team.short_name
      const gw = fixture.gw

      if (!grid[homeTeam]) grid[homeTeam] = {}
      if (!grid[awayTeam]) grid[awayTeam] = {}

      const homeRating = fdrType === "attack" ? fixture.home_team.attacking_fixture_rating : fixture.home_team.defensive_fixture_rating
      const awayRating = fdrType === "attack" ? fixture.away_team.attacking_fixture_rating : fixture.away_team.defensive_fixture_rating

      grid[homeTeam][gw] = {
        opponent: awayTeam,
        isHome: true,
        rating: homeRating,
      }
      grid[awayTeam][gw] = {
        opponent: homeTeam,
        isHome: false,
        rating: awayRating,
      }
    })

    return grid
  }, [fixtures, fdrType])

  // List view data
  const listData = useMemo(() => {
    let filtered = [...fixtures]

    if (listTeamFilter !== "all") {
      filtered = filtered.filter(
        (f) =>
          f.home_team.short_name === listTeamFilter ||
          f.away_team.short_name === listTeamFilter
      )
    }

    if (listGWFilter !== "all") {
      const gw = parseInt(listGWFilter)
      filtered = filtered.filter((f) => f.gw === gw)
    }

    return filtered
  }, [fixtures, listTeamFilter, listGWFilter])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading fixtures...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold flex items-center gap-3">
            <Calendar className="h-8 w-8" />
            Fixtures
          </h1>
          <p className="text-lg text-muted-foreground">Analyze upcoming fixtures and difficulty ratings</p>
        </div>

        <Tabs defaultValue="grid" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="grid">Grid View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
          </TabsList>

          {/* Grid View */}
          <TabsContent value="grid" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Fixture Difficulty Grid</CardTitle>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFdrType("attack")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        fdrType === "attack" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground hover:bg-secondary"
                      }`}
                    >
                      Attack FDR
                    </button>
                    <button
                      onClick={() => setFdrType("defense")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        fdrType === "defense" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground hover:bg-secondary"
                      }`}
                    >
                      Defense FDR
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">Team</th>
                        {gameweeks.map((gw) => (
                          <th key={gw} className="px-2 py-2 text-center font-semibold">
                            GW {gw}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(gridData).map(([team, fixtures]) => (
                        <tr key={team} className="border-b hover:bg-secondary/30">
                          <td className="px-4 py-3 font-semibold">{team}</td>
                          {gameweeks.map((gw) => {
                            const fixture = fixtures[gw]
                            if (!fixture) {
                              return (
                                <td key={gw} className="px-2 py-3 text-center">
                                  <span className="text-xs text-muted-foreground">-</span>
                                </td>
                              )
                            }

                            return (
                              <td
                                key={gw}
                                className={`px-2 py-3 text-center font-semibold rounded-md ${getDifficultyColor(
                                  fixture.rating
                                )}`}
                              >
                                <div className="text-xs">{fixture.opponent}</div>
                                <div className="text-xs text-opacity-75">{fixture.isHome ? "H" : "A"}</div>
                                <div className="text-xs font-bold">{fixture.rating.toFixed(1)}</div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* List View */}
          <TabsContent value="list" className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <select
                    value={listTeamFilter}
                    onChange={(e) => setListTeamFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Teams</option>
                    {teams.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>

                  <select
                    value={listGWFilter}
                    onChange={(e) => setListGWFilter(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">All Gameweeks</option>
                    {gameweeks.map((gw) => (
                      <option key={gw} value={gw}>
                        Gameweek {gw}
                      </option>
                    ))}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {listData.map((fixture, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="text-sm text-muted-foreground mb-3">Gameweek {fixture.gw}</div>

                      <div className="flex items-center justify-between gap-4">
                        {/* Home Team */}
                        <div className="flex-1">
                          <div className="font-semibold mb-2">{fixture.home_team.name}</div>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-muted-foreground">Attack FDR: </span>
                              <Badge className={getDifficultyColor(fixture.home_team.attacking_fixture_rating)}>
                                {fixture.home_team.attacking_fixture_rating.toFixed(1)}
                              </Badge>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Defense FDR: </span>
                              <Badge className={getDifficultyColor(fixture.home_team.defensive_fixture_rating)}>
                                {fixture.home_team.defensive_fixture_rating.toFixed(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* VS */}
                        <div className="text-center font-bold text-muted-foreground">VS</div>

                        {/* Away Team */}
                        <div className="flex-1 text-right">
                          <div className="font-semibold mb-2">{fixture.away_team.name}</div>
                          <div className="space-y-1">
                            <div className="text-sm">
                              <Badge className={getDifficultyColor(fixture.away_team.attacking_fixture_rating)}>
                                {fixture.away_team.attacking_fixture_rating.toFixed(1)}
                              </Badge>
                              <span className="text-muted-foreground ml-2">Attack FDR</span>
                            </div>
                            <div className="text-sm">
                              <Badge className={getDifficultyColor(fixture.away_team.defensive_fixture_rating)}>
                                {fixture.away_team.defensive_fixture_rating.toFixed(1)}
                              </Badge>
                              <span className="text-muted-foreground ml-2">Defense FDR</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
