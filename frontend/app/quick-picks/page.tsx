"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Shield, Target, Star, Users, Award, DollarSign, Clock } from "lucide-react"

// Data from your notebook analysis - Attacking Picks by Team Strength
// Attacking Picks by Team Strength (with numerical form field)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

const PositionBadge = ({ position }) => {
  // Map full position names to abbreviations
  const positionMap = {
    Goalkeeper: "GK",
    Defender: "DEF",
    Midfielder: "MID",
    Forward: "FWD",
  };

  // Get the abbreviated position, or use the original if not found
  const normalizedPosition = positionMap[position] || position;

  const colors = {
    GK: "bg-purple-100 text-purple-800 border-purple-200",
    DEF: "bg-blue-100 text-blue-800 border-blue-200",
    MID: "bg-green-100 text-green-800 border-green-200",
    FWD: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono font-bold rounded-full border ${colors[normalizedPosition] || "bg-teal-50 text-teal-700 border-teal-500 hover:border-teal-400 transition-colors duration-150"}`}
    >
      {normalizedPosition}
    </Badge>
  );
};


// Define recommendation logic
const getRecommendation = (points_per_game, form) => {
  const categories = [
    {
      condition: points_per_game >= 5 && form >= 6,
      label: "⭐ Top Pick",
      className: "bg-green-100 text-green-800 border-green-300 font-medium dark:bg-green-900 dark:text-green-200",
    },
    {
      condition: points_per_game >= 3.5 && points_per_game < 5 && form >= 4.5 && form < 6,
      label: "📊 Solid Choice",
      className: "bg-blue-100 text-blue-800 border-blue-300 font-medium dark:bg-blue-900 dark:text-blue-200",
    },
    {
      condition: points_per_game >= 2.5 && points_per_game < 3.5 && form >= 3.5 && form < 4.5,
      label: "🎯 Differential",
      className: "bg-purple-100 text-purple-800 border-purple-300 font-medium dark:bg-purple-900 dark:text-purple-200",
    },
    {
      condition: points_per_game < 2.5 && form < 3.5,
      label: "⚠️ Risky",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300 font-medium dark:bg-yellow-900 dark:text-yellow-200",
    },
    {
      condition: true, // Default
      label: "📉 Monitor",
      className: "bg-gray-100 text-gray-800 border-gray-300 font-medium dark:bg-gray-800 dark:text-gray-200",
    },
  ];

  return categories.find(cat => cat.condition) || categories[categories.length - 1];
};

// Ownership category logic
const getOwnershipCategory = (ownership) => {
  const categories = [
    {
      condition: ownership < 10,
      label: "🎯 Differential",
      className: "bg-purple-100 text-purple-800 border-purple-300 font-medium dark:bg-purple-900 dark:text-purple-200",
    },
    {
      condition: ownership < 20,
      label: "🔽 Low Owned",
      className: "bg-blue-100 text-blue-800 border-blue-300 font-medium dark:bg-blue-900 dark:text-blue-200",
    },
    {
      condition: ownership < 30,
      label: "📈 Popular",
      className: "bg-orange-100 text-orange-800 border-orange-300 font-medium dark:bg-orange-900 dark:text-orange-200",
    },
    {
      condition: true,
      label: "🔥 Template",
      className: "bg-red-100 text-red-800 border-red-300 font-medium dark:bg-red-900 dark:text-red-200",
    },
  ];

  return categories.find(cat => cat.condition) || categories[categories.length - 1];
};

export default function QuickPicksPage() {
  const [activeTab, setActiveTab] = useState("attacking")
  const [attackingPicks, setAttackingPicks] = useState([])
  const [defensivePicks, setDefensivePicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        // Fetch attacking picks
        const resAttacking = await fetch(`${API_BASE_URL}/api/top-attacking_qp`)
        if (!resAttacking.ok) throw new Error('Failed to fetch attacking picks')
        const dataAttacking = await resAttacking.json()
        const transformedAttacking = dataAttacking.map(team => ({
          team: team.team,
          teamCode: team.short_name || team.team.substring(0, 3).toUpperCase(), // Fallback to abbreviation if short_name not present
          attackRank: team.attack_rank,
          attackStrength: team.attack_strength,
          players: team.players.map(player => ({
            name: player.web_name,
            position: player.position_name,
            price: player.now_cost,
            goals_pg: player.goals_per_game || 0, // Use defaults if fields missing
            assists_pg: player.assists_per_game || 0,
            points_pg: player.points_per_game,
            ownership: player.selected_by_percent,
            form: player.form ?? 5.0 // Default form if missing
          }))
        }))
        setAttackingPicks(transformedAttacking)

        // Fetch defensive picks
        const resDefensive = await fetch(`${API_BASE_URL}/api/top-defensive_qp`)
        if (!resDefensive.ok) throw new Error('Failed to fetch defensive picks')
        const dataDefensive = await resDefensive.json()
        const transformedDefensive = dataDefensive.map(team => ({
          team: team.team,
          teamCode: team.short_name || team.team.substring(0, 3).toUpperCase(),
          defenseRank: team.defense_rank,
          defenseStrength: team.defense_strength,
          players: team.players.map(player => ({
            name: player.web_name,
            position: player.position_name,
            price: player.now_cost,
            cs_rate: player.clean_sheet_rate,
            points_pg: player.points_per_game,
            ownership: player.selected_by_percent,
            form: player.form ?? 5.0
          }))
        }))
        setDefensivePicks(transformedDefensive)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            Quick Picks & Player Strategy
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
                    Top Attack Rankings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Player recommendations from teams with the strongest attacking metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {attackingPicks.map((teamData, index) => (
                  <div key={teamData.team_name_short} className="border-l-4 border-l-red-500 pl-6">
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
                                  <PositionBadge position={player.position} />
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Goals/Game:</span>
                                  <span className="font-mono font-medium text-red-600">{player.goals_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Assists/Game:</span>
                                  <span className="font-mono font-medium text-red-600">{player.assists_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Points/Game:</span>
                                  <span className="font-mono font-bold text-red-600">{player.points_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Form:</span>
                                  <span className="font-mono font-bold text-red-600">{player.form.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ownership:</span>
                                  <span className={`font-mono font-bold ${ownershipCat.color}`}>
                                    {player.ownership}% ({ownershipCat.label})
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action Indicator */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Recommendation:</span>
                                  <Badge
                                    aria-label={`Recommendation for ${player.web_name}: ${getRecommendation(player.points_per_game, player.form).label}`}
                                    className={getRecommendation(player.points_per_game, player.form).className}
                                  >
                                    {getRecommendation(player.points_per_game, player.form).label}
                                  </Badge>
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
                    Top Defense Rankings
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Goalkeeper and defender recommendations from teams with the strongest defensive metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {defensivePicks.map((teamData, index) => (
                  <div key={teamData.team_name_short} className="border-l-4 border-l-blue-500 pl-6">
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
                                  <PositionBadge position={player.position} />
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Clean Sheet Rate:</span>
                                  <span className="font-mono font-medium text-blue-600">{(player.cs_rate * 100).toFixed(2)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Points/Game:</span>
                                  <span className="font-mono font-bold text-blue-600">{player.points_pg.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Form:</span>
                                  <span className="font-mono font-bold text-blue-600">{player.form.toFixed(2)}</span>
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
