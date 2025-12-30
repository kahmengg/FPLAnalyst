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
  const [teamFilter, setTeamFilter] = useState<string>("all")
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
      filtered = filtered.filter((p: Player) => p.position === parseInt(positionFilter))
    }

    if (teamFilter !== "all") {
      filtered = filtered.filter((p: Player) => p.team === teamFilter)
    }

    if (searchQuery) {
      filtered = filtered.filter((player: Player) => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.team.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered.slice(0, 100)
  }, [searchQuery, allPlayers, positionFilter, teamFilter])

  const togglePlayer = (playerName: string) => {
    if (selectedPlayers.includes(playerName)) {
      setSelectedPlayers(selectedPlayers.filter((p: string) => p !== playerName))
    } else {
      setSelectedPlayers([...selectedPlayers, playerName])
    }
  }

  const getColorForPlayer = (index: number) => {
    const colors = [
      { line: "#3b82f6", bg: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
      { line: "#22c55e", bg: "bg-green-500", text: "text-green-600 dark:text-green-400" },
      { line: "#a855f7", bg: "bg-purple-500", text: "text-purple-600 dark:text-purple-400" },
      { line: "#f59e0b", bg: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
      { line: "#ef4444", bg: "bg-red-500", text: "text-red-600 dark:text-red-400" },
      { line: "#06b6d4", bg: "bg-cyan-500", text: "text-cyan-600 dark:text-cyan-400" },
      { line: "#8b5cf6", bg: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
      { line: "#ec4899", bg: "bg-pink-500", text: "text-pink-600 dark:text-pink-400" },
      { line: "#10b981", bg: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
      { line: "#f97316", bg: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" }
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
      <div className="min-h-screen p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
        <div className="max-w-[1600px] mx-auto">
          <div className="mb-6 sm:mb-8">
            <div className="h-10 w-80 bg-secondary/50 rounded-lg animate-pulse mb-2"></div>
            <div className="h-6 w-96 bg-secondary/30 rounded-lg animate-pulse"></div>
          </div>
          <div className="mb-6">
            <div className="h-64 bg-secondary/30 rounded-xl animate-pulse"></div>
          </div>
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <div className="h-96 bg-secondary/30 rounded-xl animate-pulse"></div>
            <div className="h-96 bg-secondary/30 rounded-xl animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load player data</h3>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 active:scale-95"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="mb-2 text-2xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
            <Activity className="w-6 h-6 sm:w-10 sm:h-10 text-purple-500 animate-pulse" style={{ animationDuration: '2s' }} />
            Player Performance Database
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground animate-in fade-in slide-in-from-top duration-700" style={{ animationDelay: '200ms' }}>
            Advanced gameweek-by-gameweek analysis • Compare multiple players with xG/xA insights
          </p>
        </div>

        <Card className="mb-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-card shadow-lg animate-in fade-in slide-in-from-top duration-500" style={{ animationDelay: '300ms' }}>
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-purple-500" />
              Player Search & Selection ({selectedPlayers.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="🔍 Search by player name or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              >
                <option value="all">All Positions</option>
                <option value="1">🧤 Goalkeepers</option>
                <option value="2">🛡️ Defenders</option>
                <option value="3">⚙️ Midfielders</option>
                <option value="4">⚔️ Forwards</option>
              </select>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200"
              >
                <option value="all">All Teams</option>
                {[...new Set(allPlayers.map(p => p.team))].sort().map(team => (
                  <option key={team} value={team}>⚽ {team}</option>
                ))}
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
                        className={`px-3 py-2.5 text-xs sm:text-sm rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                          isSelected
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500 shadow-md ring-2 ring-purple-500/20'
                            : 'bg-card hover:bg-secondary/50 border-border hover:border-purple-400/50'
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
          <Card className="border-dashed border-2 animate-in fade-in duration-500">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Target className="w-16 h-16 mx-auto mb-4 opacity-30 animate-pulse" style={{ animationDuration: '3s' }} />
              <p className="text-lg font-medium mb-2">No Players Selected</p>
              <p className="text-sm">Search and select players above to view detailed performance analysis</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {selectedPlayers.length > 0 && comparisonChartData.length > 0 && (
              <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-card shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                    Player Comparison Charts
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <Tabs defaultValue="points" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-secondary/50">
                      <TabsTrigger value="points" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">Points</TabsTrigger>
                      <TabsTrigger value="xgi" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">xGI</TabsTrigger>
                      <TabsTrigger value="minutes" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">Minutes</TabsTrigger>
                      <TabsTrigger value="attacking" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-blue-600 data-[state=active]:text-white">xG vs xA</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="points" className="mt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="gameweek" 
                            label={{ value: 'Gameweek', position: 'insideBottom', offset: -10, textAnchor: 'middle' }}
                            tick={{ fontSize: 12 }}
                            height={60}
                          />
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
                        <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="gameweek" 
                            label={{ value: 'Gameweek', position: 'insideBottom', offset: -10, textAnchor: 'middle' }}
                            tick={{ fontSize: 12 }}
                            height={60}
                          />
                          <YAxis label={{ value: 'xGI', angle: -90, position: 'insideLeft' }} />
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
                        <BarChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="gameweek" 
                            label={{ value: 'Gameweek', position: 'insideBottom', offset: -10, textAnchor: 'middle' }}
                            tick={{ fontSize: 12 }}
                            height={60}
                          />
                          <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
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
                            <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis 
                                dataKey="gameweek" 
                                tick={{ fontSize: 11 }}
                                height={50}
                              />
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
                            <LineChart data={comparisonChartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                              <XAxis 
                                dataKey="gameweek" 
                                tick={{ fontSize: 11 }}
                                height={50}
                              />
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

            {/* Individual Player Stats Cards */}
            {Object.entries(playerData).map(([playerName, data], index) => {
              const typedData = data as PlayerTrendData
              const colorInfo = getColorForPlayer(index)
              const posInfo = POSITION_COLORS[typedData.position.toString() as keyof typeof POSITION_COLORS] || {}
              
              return (
                <Card key={playerName} className="border-l-4 hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-bottom-4" style={{ borderLeftColor: colorInfo.line, animationDelay: `${index * 100}ms` }}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                             style={{ backgroundColor: colorInfo.line }}>
                          {playerName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <CardTitle className="text-xl flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs px-2 py-1"
                                   style={{ backgroundColor: posInfo.color + '20', color: posInfo.color }}>
                              {posInfo.label}
                            </Badge>
                            {typedData.player_name}
                          </CardTitle>
                          <p className="text-muted-foreground">
                            {typedData.team} • £{typedData.cost}m • {typedData.ownership}% owned
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {typedData.form.avg_points}
                        </div>
                        <div className="text-xs text-muted-foreground">avg points</div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{typedData.total_stats.total_points}</div>
                        <div className="text-xs text-muted-foreground">Total Points</div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{typedData.total_stats.total_goals}</div>
                        <div className="text-xs text-muted-foreground">Goals</div>
                      </div>
                      <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{typedData.total_stats.total_assists}</div>
                        <div className="text-xs text-muted-foreground">Assists</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{typedData.per90_stats.points_per_90}</div>
                        <div className="text-xs text-muted-foreground">Pts/90</div>
                      </div>
                    </div>

                    {/* Expected Stats */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Expected Performance (Per 90)
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="text-center p-2 bg-card border rounded">
                          <div className="font-medium text-sm">{typedData.per90_stats.xG_per_90}</div>
                          <div className="text-xs text-muted-foreground">xG/90</div>
                        </div>
                        <div className="text-center p-2 bg-card border rounded">
                          <div className="font-medium text-sm">{typedData.per90_stats.xA_per_90}</div>
                          <div className="text-xs text-muted-foreground">xA/90</div>
                        </div>
                        <div className="text-center p-2 bg-card border rounded">
                          <div className="font-medium text-sm">{typedData.per90_stats.xGI_per_90}</div>
                          <div className="text-xs text-muted-foreground">xGI/90</div>
                        </div>
                        <div className="text-center p-2 bg-card border rounded">
                          <div className="font-medium text-sm">{typedData.per90_stats.shots_per_90}</div>
                          <div className="text-xs text-muted-foreground">Shots/90</div>
                        </div>
                      </div>
                    </div>

                    {/* Form & Playing Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Recent Form (Last 5 GWs)</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Average Points:</span>
                            <span className="font-medium">{typedData.form.avg_points}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Average Minutes:</span>
                            <span className="font-medium">{typedData.form.avg_minutes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Games Played:</span>
                            <span className="font-medium">{typedData.form.games_played}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Season Totals</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Games:</span>
                            <span className="font-medium">{typedData.total_stats.games_played}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Minutes:</span>
                            <span className="font-medium">{typedData.total_stats.total_minutes}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total xGI:</span>
                            <span className="font-medium">{typedData.total_stats.total_xGI}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Gameweeks Table */}
                    <div>
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Recent Gameweeks (Last 10)
                      </h4>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-8 gap-2 text-xs font-medium text-muted-foreground mb-2 px-2">
                          <div>GW</div>
                          <div>Opp</div>
                          <div>Pts</div>
                          <div>Min</div>
                          <div>G</div>
                          <div>A</div>
                          <div>xG</div>
                          <div>xA</div>
                        </div>
                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {typedData.gameweeks.slice(-10).reverse().map((gw: GameweekData) => (
                            <div key={gw.gameweek} className="grid grid-cols-8 gap-2 text-xs px-2 py-2 bg-secondary/20 rounded">
                              <div className="font-medium">{gw.gameweek}</div>
                              <div className="text-muted-foreground">{gw.was_home ? 'vs' : '@'} {gw.opponent}</div>
                              <div className={`font-medium ${gw.total_points >= 6 ? 'text-green-600' : gw.total_points >= 2 ? 'text-blue-600' : 'text-gray-600'}`}>
                                {gw.total_points}
                              </div>
                              <div className="text-muted-foreground">{gw.minutes}</div>
                              <div className={gw.goals > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>{gw.goals}</div>
                              <div className={gw.assists > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>{gw.assists}</div>
                              <div className="text-muted-foreground">{gw.xG}</div>
                              <div className="text-muted-foreground">{gw.xA}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
