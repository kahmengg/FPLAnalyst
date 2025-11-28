"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, User, Target, Activity, BarChart3, Award } from "lucide-react"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://fplanalyst.onrender.com"

interface Player {
  id: number
  name: string
  team: string
  position: number
  cost: number
  ownership: number
}

interface GameweekData {
  gameweek: number
  opponent: string
  was_home: boolean | null
  total_points: number
  minutes: number
  goals: number
  assists: number
  clean_sheets: number
  xG: number
  xA: number
  xGI: number
  xP: number
  shots: number
  shots_on_target: number
  key_passes: number
  touches: number
  penalty_area_touches: number
  carries_final_third: number
  defensive_contribution: number
  xGC: number
  goals_conceded: number
}

interface PlayerTrendData {
  player_name: string
  team: string
  position: number
  web_name: string
  cost: number
  ownership: number
  form: {
    avg_points: number
    avg_minutes: number
    games_played: number
  }
  total_stats: {
    games_played: number
    total_points: number
    total_goals: number
    total_assists: number
    total_xG: number
    total_xA: number
    total_xGI: number
    total_xP: number
    total_minutes: number
    total_shots: number
    total_key_passes: number
  }
  per90_stats: {
    points_per_90: number
    goals_per_90: number
    assists_per_90: number
    xG_per_90: number
    xA_per_90: number
    xGI_per_90: number
    shots_per_90: number
    key_passes_per_90: number
  }
  gameweeks: GameweekData[]
}

interface ChartDataPoint {
  gameweek: number
  [key: string]: number | null
}

const POSITION_COLORS = {
  "1": { color: "#f59e0b", label: "GK", gradient: "from-amber-500/20" },
  "2": { color: "#3b82f6", label: "DEF", gradient: "from-blue-500/20" },
  "3": { color: "#22c55e", label: "MID", gradient: "from-green-500/20" },
  "4": { color: "#ef4444", label: "FWD", gradient: "from-red-500/20" }
}

export default function PlayerTrendsPage() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [playerData, setPlayerData] = useState<Record<string, PlayerTrendData>>({})
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [positionFilter, setPositionFilter] = useState<string>("all")
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAllPlayers()
  }, [])

  useEffect(() => {
    if (selectedPlayers.length > 0) {
      fetchPlayerTrends(selectedPlayers)
    } else {
      setPlayerData({})
    }
  }, [selectedPlayers])

  const fetchAllPlayers = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/player-search`)
      if (!res.ok) throw new Error("Failed to fetch players")
      const data = await res.json()
      setAllPlayers(data.players || [])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const fetchPlayerTrends = async (players: string[]) => {
    try {
      const playersParam = players.join(',')
      const res = await fetch(`${API_BASE_URL}/api/player-trends?players=${encodeURIComponent(playersParam)}`)
      if (!res.ok) throw new Error("Failed to fetch player trends")
      const data = await res.json()
      setPlayerData(data)
    } catch (err) {
      console.error("Error fetching player trends:", err)
      setError(err instanceof Error ? err.message : 'Failed to fetch player trends')
    }
  }

  const filteredPlayers = useMemo(() => {
    let filtered = allPlayers

    if (positionFilter !== "all") {
      const positionMap: Record<string, number> = { "GK": 1, "DEF": 2, "MID": 3, "FWD": 4 }
      filtered = filtered.filter((p: Player) => p.position === positionMap[positionFilter])
    }

    if (searchQuery) {
      filtered = filtered.filter((player: Player) => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.slice(0, 100)
  }, [searchQuery, allPlayers, positionFilter])

  const togglePlayer = (playerName: string) => {
    if (selectedPlayers.includes(playerName)) {
      setSelectedPlayers(selectedPlayers.filter((p: string) => p !== playerName))
    } else {
      if (selectedPlayers.length >= 3) {
        alert("Maximum 3 players can be compared at once")
        return
      }
      setSelectedPlayers([...selectedPlayers, playerName])
    }
  }

  const getColorForPlayer = (index: number) => {
    const colors = [
      { line: "#3b82f6", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
      { line: "#22c55e", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" },
      { line: "#a855f7", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" }
    ]
    return colors[index % colors.length]
  }

  const comparisonChartData = useMemo((): ChartDataPoint[] => {
    if (Object.keys(playerData).length === 0) return []
    
    const allGameweeks = new Set<number>()
    Object.values(playerData).forEach((player) => {
      const typedPlayer = player as PlayerTrendData
      typedPlayer.gameweeks.forEach((gw: GameweekData) => allGameweeks.add(gw.gameweek))
    })
    
    return Array.from(allGameweeks).sort((a: number, b: number) => a - b).map((gw: number) => {
      const point: ChartDataPoint = { gameweek: gw }
      Object.entries(playerData).forEach(([name, player]) => {
        const typedPlayer = player as PlayerTrendData
        const gwData = typedPlayer.gameweeks.find((g: GameweekData) => g.gameweek === gw)
        point[`${name}_points`] = gwData ? gwData.total_points : null
        point[`${name}_xG`] = gwData ? gwData.xG : null
        point[`${name}_xA`] = gwData ? gwData.xA : null
        point[`${name}_xGI`] = gwData ? gwData.xGI : null
        point[`${name}_minutes`] = gwData ? gwData.minutes : null
      })
      return point
    })
  }, [playerData])

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-2xl sm:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Activity className="w-6 h-6 sm:w-10 sm:h-10 text-primary" />
            Player Performance Database
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Advanced gameweek-by-gameweek analysis • Compare up to 3 players with xG/xA insights
          </p>
        </div>

        <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary/5 to-card shadow-lg">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Player Search & Selection ({selectedPlayers.length}/3)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="🔍 Search by player name or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Positions</option>
                <option value="1">🧤 Goalkeepers</option>
                <option value="2">🛡️ Defenders</option>
                <option value="3">⚙️ Midfielders</option>
                <option value="4">⚔️ Forwards</option>
              </select>
            </div>

            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-secondary/30 rounded-lg border border-border/50">
                <span className="text-xs text-muted-foreground self-center mr-2">Selected:</span>
                {selectedPlayers.map((player, index) => {
                  const playerInfo = allPlayers.find(p => p.name === player)
                  const posInfo = POSITION_COLORS[playerInfo?.position] || {}
                  return (
                    <Badge
                      key={player}
                      className={`${getColorForPlayer(index).bg} text-white cursor-pointer hover:opacity-80 px-3 py-1.5`}
                      onClick={() => togglePlayer(player)}
                    >
                      {posInfo.label} {player} ✕
                    </Badge>
                  )
                })}
              </div>
            )}

            <div className="max-h-80 overflow-y-auto border border-border rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
                {filteredPlayers.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No players found. Try adjusting your filters.
                  </div>
                ) : (
                  filteredPlayers.map((player) => {
                    const isSelected = selectedPlayers.includes(player.name)
                    const posInfo = POSITION_COLORS[player.position] || {}
                    
                    return (
                      <button
                        key={player.id}
                        onClick={() => togglePlayer(player.name)}
                        className={`px-3 py-2.5 text-xs sm:text-sm rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-card hover:bg-secondary/50 border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Badge 
                                variant="secondary" 
                                className="text-[10px] px-1.5 py-0" 
                                style={{ backgroundColor: posInfo.color + '20', color: posInfo.color }}
                              >
                                {posInfo.label}
                              </Badge>
                              <span className="font-medium truncate">{player.name}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span>{player.team}</span>
                              <span>•</span>
                              <span>£{player.cost}m</span>
                              {player.ownership > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{player.ownership}%</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Showing {filteredPlayers.length} of {allPlayers.length} players
            </p>
          </CardContent>
        </Card>

        {selectedPlayers.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-2">No Players Selected</p>
              <p className="text-sm">Search and select players above to view detailed performance analysis</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {selectedPlayers.length > 1 && comparisonChartData.length > 0 && (
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-card">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Player Comparison Charts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs defaultValue="points" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="points">Points</TabsTrigger>
                      <TabsTrigger value="xgi">xGI</TabsTrigger>
                      <TabsTrigger value="minutes">Minutes</TabsTrigger>
                      <TabsTrigger value="attacking">xG vs xA</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="points" className="mt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="gameweek" label={{ value: 'Gameweek', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'FPL Points', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Legend />
                          {selectedPlayers.map((player, index) => (
                            <Line 
                              key={player}
                              type="monotone" 
                              dataKey={`${player}_points`} 
                              name={player}
                              stroke={getColorForPlayer(index).line}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="xgi" className="mt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="gameweek" label={{ value: 'Gameweek', position: 'insideBottom', offset: -5 }} />
                          <YAxis label={{ value: 'Expected Goal Involvements', angle: -90, position: 'insideLeft' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                            labelStyle={{ color: '#fff' }}
                          />
                          <Legend />
                          {selectedPlayers.map((player, index) => (
                            <Line 
                              key={player}
                              type="monotone" 
                              dataKey={`${player}_xGI`} 
                              name={player}
                              stroke={getColorForPlayer(index).line}
                              strokeWidth={2}
                              dot={{ r: 4 }}
                              connectNulls
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="minutes" className="mt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={comparisonChartData}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis dataKey="gameweek" />
                          <YAxis />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                          />
                          <Legend />
                          <ReferenceLine y={90} stroke="#666" strokeDasharray="3 3" label="Full Game" />
                          {selectedPlayers.map((player, index) => (
                            <Bar 
                              key={player}
                              dataKey={`${player}_minutes`} 
                              name={player}
                              fill={getColorForPlayer(index).line}
                              opacity={0.8}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>

                    <TabsContent value="attacking" className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-center">Expected Goals (xG)</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={comparisonChartData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis dataKey="gameweek" />
                              <YAxis />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }} />
                              <Legend />
                              {selectedPlayers.map((player, index) => (
                                <Line 
                                  key={player}
                                  type="monotone" 
                                  dataKey={`${player}_xG`} 
                                  name={player}
                                  stroke={getColorForPlayer(index).line}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-center">Expected Assists (xA)</h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={comparisonChartData}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis dataKey="gameweek" />
                              <YAxis />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }} />
                              <Legend />
                              {selectedPlayers.map((player, index) => (
                                <Line 
                                  key={player}
                                  type="monotone" 
                                  dataKey={`${player}_xA`} 
                                  name={player}
                                  stroke={getColorForPlayer(index).line}
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  connectNulls
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Individual player cards will be rendered here - continuing in next message due to length */}
          </div>
        )}
      </div>
    </div>
  )
}
