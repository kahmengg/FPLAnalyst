"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Shield, Target, Star, Users, Award, DollarSign, Clock, Loader2, AlertCircle } from "lucide-react"

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

const difficultyColors = {
  easy: "bg-green-500/20 text-green-700 border-green-300",
  moderate: "bg-yellow-500/20 text-yellow-700 border-yellow-300",
  hard: "bg-red-500/20 text-red-700 border-red-300"
}

const positionColors = {
  GK: "bg-purple-100 text-purple-800 border-purple-200",
  DEF: "bg-blue-100 text-blue-800 border-blue-200",
  MID: "bg-green-100 text-green-800 border-green-200",
  FWD: "bg-red-100 text-red-800 border-red-200"
}

const getOwnershipCategory = (ownership: number) => {
  if (ownership < 10) return { label: "Differential", color: "text-purple-600" }
  if (ownership < 25) return { label: "Low Owned", color: "text-blue-600" }
  if (ownership < 40) return { label: "Popular", color: "text-orange-600" }
  return { label: "Template", color: "text-red-600" }
}

interface Player {
  name: string
  position: string
  price: number
  goals_pg?: number
  assists_pg?: number
  points_pg: number
  ownership: number
  form?: number
  total_points: number
  cs_rate?: number
  clean_sheets?: number
}

interface TeamData {
  team: string
  teamCode: string
  attackRank?: number
  defenseRank?: number
  attackStrength?: number
  defenseStrength?: number
  difficulty: string
  players: Player[]
}

interface QuickPicksData {
  attacking: TeamData[]
  defensive: TeamData[]
}

// Static data removed - now fetched from API

export default function QuickPicksPage() {
  const [activeTab, setActiveTab] = useState("attacking")
  const [data, setData] = useState<QuickPicksData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQuickPicks = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/api/quick-picks`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      setData(result)
      
    } catch (err) {
      console.error('Error fetching quick picks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuickPicks()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading quick picks data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Card className="border-destructive/50 bg-card/50 backdrop-blur-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Data</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <button 
                  onClick={fetchQuickPicks}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Try Again
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            Quick Picks & Player Strategy ok
          </h1>
          <p className="text-lg text-muted-foreground">
            Team-by-team player recommendations based on attacking and defensive strength rankings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2 gap-2 bg-transparent p-0">
            <TabsTrigger
              value="attacking"
              className="flex items-center justify-center gap-2 text-sm px-4 py-3 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <Target className="h-4 w-4" />
              Attacking Picks
            </TabsTrigger>
            <TabsTrigger
              value="defensive"
              className="flex items-center justify-center gap-2 text-sm px-4 py-3 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <Shield className="h-4 w-4" />
              Defensive Picks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attacking" className="space-y-6">
            {/* Overview Card */}
            <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  ⚔️ Attacking Picks by Team Strength
                  <Badge variant="secondary" className="ml-auto">
                    Top 5 Attack Rankings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Player recommendations from teams with the strongest attacking metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data?.attacking?.map((teamData, index) => (
                  <div key={teamData.teamCode} className="border-l-4 border-l-red-500 pl-6">
                    {/* Team Header */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-600 font-bold text-sm">
                          #{teamData.attackRank}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{teamData.team}</h3>
                          <p className="text-sm text-muted-foreground">
                            Attack Strength: <span className="font-mono font-medium">{teamData.attackStrength.toFixed(3)}</span>
                          </p>
                        </div>
                      </div>
                      <Badge className={`border ${difficultyColors[teamData.difficulty]}`}>
                        {teamData.difficulty === 'easy' && '🟢 Good Fixtures'}
                        {teamData.difficulty === 'moderate' && '🟡 Average Fixtures'}
                        {teamData.difficulty === 'hard' && '🔴 Tough Fixtures'}
                      </Badge>
                    </div>

                    {/* Players Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {teamData.players.map((player, playerIndex) => {
                        const ownershipCat = getOwnershipCategory(player.ownership)
                        return (
                          <Card 
                            key={player.name} 
                            className="border border-border/50 hover:border-red-300 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-card to-secondary/20"
                          >
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-foreground">{player.name}</h4>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-green-600" />
                                    <span className="font-mono text-sm font-medium text-green-600">
                                      {player.price}m
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${positionColors[player.position]}`}>
                                    {player.position}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {teamData.teamCode}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Goals/Game:</span>
                                  <span className="font-mono font-medium">{player.goals_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Assists/Game:</span>
                                  <span className="font-mono font-medium">{player.assists_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Points/Game:</span>
                                  <span className="font-mono font-bold text-accent">{player.points_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ownership:</span>
                                  <span className={`font-mono font-medium ${ownershipCat.color}`}>
                                    {player.ownership}% ({ownershipCat.label})
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action Indicator */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Recommendation:</span>
                                  {player.ownership < 15 ? (
                                    <span className="text-purple-600 font-medium">🎯 Differential Pick</span>
                                  ) : player.points_pg > 4.5 ? (
                                    <span className="text-green-600 font-medium">⭐ Strong Pick</span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">📊 Consider</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defensive" className="space-y-6">
            {/* Overview Card */}
            <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  🛡️ Defensive Picks by Team Strength
                  <Badge variant="secondary" className="ml-auto">
                    Top 4 Defense Rankings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Goalkeeper and defender recommendations from teams with the strongest defensive metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {data?.defensive?.map((teamData, index) => (
                  <div key={teamData.teamCode} className="border-l-4 border-l-blue-500 pl-6">
                    {/* Team Header */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 font-bold text-sm">
                          #{teamData.defenseRank}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{teamData.team}</h3>
                          <p className="text-sm text-muted-foreground">
                            Defense Strength: <span className="font-mono font-medium">{teamData.defenseStrength.toFixed(3)}</span>
                          </p>
                        </div>
                      </div>
                      <Badge className={`border ${difficultyColors[teamData.difficulty]}`}>
                        {teamData.difficulty === 'easy' && '🟢 Good Fixtures'}
                        {teamData.difficulty === 'moderate' && '🟡 Average Fixtures'}
                        {teamData.difficulty === 'hard' && '🔴 Tough Fixtures'}
                      </Badge>
                    </div>

                    {/* Players Grid */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {teamData.players.map((player, playerIndex) => {
                        const ownershipCat = getOwnershipCategory(player.ownership)
                        return (
                          <Card 
                            key={player.name} 
                            className="border border-border/50 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-card to-secondary/20"
                          >
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-foreground">{player.name}</h4>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3 text-green-600" />
                                    <span className="font-mono text-sm font-medium text-green-600">
                                      {player.price}m
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${positionColors[player.position]}`}>
                                    {player.position}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {teamData.teamCode}
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Clean Sheet Rate:</span>
                                  <span className="font-mono font-medium">{(player.cs_rate * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Points/Game:</span>
                                  <span className="font-mono font-bold text-blue-600">{player.points_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ownership:</span>
                                  <span className={`font-mono font-medium ${ownershipCat.color}`}>
                                    {player.ownership}% ({ownershipCat.label})
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action Indicator */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Recommendation:</span>
                                  {player.cs_rate >= 0.6 ? (
                                    <span className="text-green-600 font-medium">🔒 Premium Pick</span>
                                  ) : player.ownership < 15 ? (
                                    <span className="text-purple-600 font-medium">🎯 Differential</span>
                                  ) : (
                                    <span className="text-blue-600 font-medium">📊 Solid Option</span>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Strategic Insights Footer */}
        <Card className="mt-8 border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">💡 Strategic Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Team Strength Rankings
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Rankings based on comprehensive attacking/defensive metrics including xG, xA, clean sheets, and underlying stats
                </p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ownership Categories
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Differential (&lt;10%), Low Owned (10-25%), Popular (25-40%), Template (40%+)
                </p>
              </div>
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Quick vs Transfer Strategy
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Use for captaincy, bench decisions, and short-term picks. Combine with fixture analysis for transfer planning
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
