"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, X } from "lucide-react"
import { getAllPlayers, getPlayerGameweeks } from "@/lib/supabase"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface Player {
  id: string
  name: string
  web_name: string
  player_name: string
  team: string
  team_short: string
  position_name: string
  position: number
  cost: number
  ownership: number
  form: number
  last_gw_points?: number
  totalPoints?: number
}

interface GameweekData {
  gameweek: number
  total_points: number
  minutes: number
  goals: number
  assists: number
  clean_sheets: number
  xG: number
  xA: number
}

const POSITION_MAP: Record<number, string> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
}

const positionColors: Record<string, { bg: string; text: string; border: string }> = {
  GK: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200" },
  DEF: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-200" },
  MID: { bg: "bg-green-100", text: "text-green-800", border: "border-green-200" },
  FWD: { bg: "bg-red-100", text: "text-red-800", border: "border-red-200" },
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<string>("all")
  const [teamFilter, setTeamFilter] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20])
  const [valueMode, setValueMode] = useState(false)

  // Sort state
  const [sortBy, setSortBy] = useState<string>("form")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [playerHistory, setPlayerHistory] = useState<GameweekData[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Fetch all players
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const allPlayers = await getAllPlayers(1000)
        setPlayers(allPlayers || [])
      } catch (err) {
        setError("Failed to fetch players")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter and sort players
  useEffect(() => {
    let result = [...players]

    // Apply filters
    if (searchQuery) {
      result = result.filter((p) =>
        (p.web_name?.toLowerCase() || p.player_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
        (p.team_short?.toLowerCase() || p.team?.toLowerCase() || "").includes(searchQuery.toLowerCase())
      )
    }

    if (positionFilter !== "all") {
      result = result.filter((p) => POSITION_MAP[p.position as keyof typeof POSITION_MAP] === positionFilter)
    }

    if (teamFilter !== "all") {
      result = result.filter((p) => (p.team_short || p.team) === teamFilter)
    }

    result = result.filter((p) => p.cost >= priceRange[0] && p.cost <= priceRange[1])

    // Sort
    const sortKey = valueMode ? "pointsPerMillion" : sortBy
    result.sort((a, b) => {
      let aVal = 0
      let bVal = 0

      switch (sortKey) {
        case "form":
          aVal = a.form || 0
          bVal = b.form || 0
          break
        case "totalPoints":
          aVal = a.totalPoints || 0
          bVal = b.totalPoints || 0
          break
        case "cost":
          aVal = a.cost
          bVal = b.cost
          break
        case "ownership":
          aVal = a.ownership
          bVal = b.ownership
          break
        case "pointsPerMillion":
          aVal = (a.totalPoints || 0) / (a.cost || 1)
          bVal = (b.totalPoints || 0) / (b.cost || 1)
          break
        default:
          aVal = a.form || 0
          bVal = b.form || 0
      }

      return sortOrder === "desc" ? bVal - aVal : aVal - bVal
    })

    setFilteredPlayers(result)
  }, [players, searchQuery, positionFilter, teamFilter, priceRange, sortBy, sortOrder, valueMode])

  const handlePlayerClick = async (player: Player) => {
    setSelectedPlayer(player)
    setLoadingHistory(true)
    try {
      const history = await getPlayerGameweeks(player.web_name || player.player_name)
      setPlayerHistory((history || []).slice(-8))
    } catch (err) {
      setPlayerHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const teams = useMemo(() => [...new Set(players.map((p) => p.team_short || p.team))].sort(), [players])
  const positions = useMemo(() => ["GK", "DEF", "MID", "FWD"], [])

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "desc" ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading players...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold flex items-center gap-3">
            <span className="text-2xl">👥</span>
            Players
          </h1>
          <p className="text-lg text-muted-foreground">Browse and filter all players with advanced sorting options</p>
        </div>

        {/* Filters */}
        <Card className="mb-6 sticky top-0 z-20 shadow-lg border-2">
          <CardContent className="p-6 space-y-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by player or team name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All Positions</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>

              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="all">All Teams</option>
                {teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>

              <div>
                <label className="text-sm font-medium">Price: £{priceRange[0]}m - £{priceRange[1]}m</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => setValueMode(!valueMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  valueMode ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-foreground hover:bg-secondary"
                }`}
              >
                {valueMode ? "Value Mode ON" : "Value Mode"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Players Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Pos</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary" onClick={() => setSortBy("cost")}>
                      Cost {sortBy === "cost" && getSortIcon("cost")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary" onClick={() => setSortBy("ownership")}>
                      Own% {sortBy === "ownership" && getSortIcon("ownership")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary" onClick={() => setSortBy("form")}>
                      Form {sortBy === "form" && getSortIcon("form")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary" onClick={() => setSortBy("totalPoints")}>
                      Pts {sortBy === "totalPoints" && getSortIcon("totalPoints")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPlayers.map((player) => (
                    <tr
                      key={player.id}
                      onClick={() => handlePlayerClick(player)}
                      className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{player.web_name || player.player_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {player.team_short || player.team?.slice(0, 3).toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-xs font-bold border ${
                            positionColors[POSITION_MAP[player.position as keyof typeof POSITION_MAP]] ||
                            positionColors.FWD
                          }`}
                        >
                          {POSITION_MAP[player.position as keyof typeof POSITION_MAP] || "?"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">£{player.cost}m</td>
                      <td className="px-4 py-3 text-sm">{player.ownership?.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                            player.form >= 7
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                              : player.form >= 5
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                                : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                          }`}
                        >
                          {player.form?.toFixed(1) || "0"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{player.totalPoints || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Player Detail Modal */}
        {selectedPlayer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>{selectedPlayer.web_name || selectedPlayer.player_name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedPlayer.team_short} • {POSITION_MAP[selectedPlayer.position as keyof typeof POSITION_MAP]} • £{selectedPlayer.cost}m
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPlayer(null)
                    setPlayerHistory([])
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Form</p>
                    <p className="text-2xl font-bold">{selectedPlayer.form?.toFixed(1)}</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-2xl font-bold">{selectedPlayer.totalPoints || 0}</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Ownership</p>
                    <p className="text-2xl font-bold">{selectedPlayer.ownership?.toFixed(1)}%</p>
                  </div>
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">PPM</p>
                    <p className="text-2xl font-bold">{((selectedPlayer.totalPoints || 0) / selectedPlayer.cost).toFixed(2)}</p>
                  </div>
                </div>

                {/* Last 8 GW Chart */}
                {!loadingHistory && playerHistory.length > 0 && (
                  <Tabs defaultValue="points" className="space-y-4">
                    <TabsList>
                      <TabsTrigger value="points">Points</TabsTrigger>
                      <TabsTrigger value="performance">Performance</TabsTrigger>
                    </TabsList>

                    <TabsContent value="points">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={playerHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="gameweek" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="total_points" fill="#3b82f6" name="Points" />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="performance">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={playerHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="gameweek" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="goals" stroke="#22c55e" name="Goals" />
                          <Line type="monotone" dataKey="assists" stroke="#f59e0b" name="Assists" />
                          <Line type="monotone" dataKey="xG" stroke="#6366f1" name="xG" strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
