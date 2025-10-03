"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Shield, Target, Star, Users, Award, DollarSign, Clock } from "lucide-react"

// Data from your notebook analysis - Attacking Picks by Team Strength
const attackingPicks = [
  {
    team: "Liverpool",
    teamCode: "LIV",
    attackRank: 1,
    attackStrength: 4.032,
    difficulty: "easy",
    players: [
      { name: "Gravenberch", position: "MID", price: 5.6, goals_pg: 0.33, assists_pg: 0.17, points_pg: 5.83, ownership: 15.2 },
      { name: "Ekitiké", position: "FWD", price: 8.7, goals_pg: 0.50, assists_pg: 0.17, points_pg: 5.33, ownership: 8.4 },
      { name: "M.Salah", position: "MID", price: 14.5, goals_pg: 0.33, assists_pg: 0.33, points_pg: 5.33, ownership: 45.2 }
    ]
  },
  {
    team: "Man Utd",
    teamCode: "MUN",
    attackRank: 2,
    attackStrength: 3.875,
    difficulty: "moderate",
    players: [
      { name: "B.Fernandes", position: "MID", price: 9.0, goals_pg: 0.33, assists_pg: 0.0, points_pg: 4.17, ownership: 32.1 },
      { name: "Mbeumo", position: "MID", price: 8.1, goals_pg: 0.17, assists_pg: 0.0, points_pg: 3.50, ownership: 12.3 },
      { name: "Šeško", position: "FWD", price: 7.3, goals_pg: 0.17, assists_pg: 0.0, points_pg: 2.33, ownership: 6.8 }
    ]
  },
  {
    team: "Arsenal",
    teamCode: "ARS",
    attackRank: 3,
    attackStrength: 3.654,
    difficulty: "easy",
    players: [
      { name: "Martinelli", position: "MID", price: 7.2, goals_pg: 0.50, assists_pg: 0.17, points_pg: 4.83, ownership: 18.9 },
      { name: "Havertz", position: "FWD", price: 8.1, goals_pg: 0.33, assists_pg: 0.17, points_pg: 4.17, ownership: 22.7 },
      { name: "Saka", position: "MID", price: 10.3, goals_pg: 0.17, assists_pg: 0.33, points_pg: 3.83, ownership: 38.4 }
    ]
  },
  {
    team: "Newcastle",
    teamCode: "NEW",
    attackRank: 4,
    attackStrength: 3.521,
    difficulty: "easy",
    players: [
      { name: "Isak", position: "FWD", price: 8.9, goals_pg: 0.67, assists_pg: 0.0, points_pg: 5.17, ownership: 28.3 },
      { name: "Gordon", position: "MID", price: 7.8, goals_pg: 0.17, assists_pg: 0.33, points_pg: 4.33, ownership: 19.6 },
      { name: "Barnes", position: "MID", price: 6.4, goals_pg: 0.17, assists_pg: 0.17, points_pg: 3.67, ownership: 11.2 }
    ]
  },
  {
    team: "Man City",
    teamCode: "MCI",
    attackRank: 5,
    attackStrength: 3.412,
    difficulty: "moderate",
    players: [
      { name: "Haaland", position: "FWD", price: 15.1, goals_pg: 1.0, assists_pg: 0.0, points_pg: 7.17, ownership: 52.8 },
      { name: "Foden", position: "MID", price: 9.3, goals_pg: 0.17, assists_pg: 0.33, points_pg: 4.0, ownership: 24.1 },
      { name: "Silva", position: "MID", price: 6.8, goals_pg: 0.0, assists_pg: 0.33, points_pg: 3.17, ownership: 8.7 }
    ]
  }
]

// Defensive Picks by Team Strength
const defensivePicks = [
  {
    team: "Arsenal",
    teamCode: "ARS",
    defenseRank: 1,
    defenseStrength: 2.841,
    difficulty: "easy",
    players: [
      { name: "Raya", position: "GK", price: 5.6, cs_rate: 0.67, points_pg: 4.33, ownership: 28.9 },
      { name: "Gabriel", position: "DEF", price: 6.2, cs_rate: 0.67, points_pg: 5.17, ownership: 35.2 },
      { name: "Saliba", position: "DEF", price: 6.0, cs_rate: 0.67, points_pg: 4.83, ownership: 31.7 }
    ]
  },
  {
    team: "Liverpool",
    teamCode: "LIV",
    defenseRank: 2,
    defenseStrength: 2.654,
    difficulty: "easy",
    players: [
      { name: "Alisson", position: "GK", price: 5.5, cs_rate: 0.50, points_pg: 4.0, ownership: 18.4 },
      { name: "van Dijk", position: "DEF", price: 6.5, cs_rate: 0.50, points_pg: 4.67, ownership: 24.6 },
      { name: "Robertson", position: "DEF", price: 6.1, cs_rate: 0.50, points_pg: 4.33, ownership: 19.8 }
    ]
  },
  {
    team: "Newcastle",
    teamCode: "NEW",
    defenseRank: 3,
    defenseStrength: 2.432,
    difficulty: "moderate",
    players: [
      { name: "Pope", position: "GK", price: 5.0, cs_rate: 0.67, points_pg: 5.67, ownership: 22.1 },
      { name: "Trippier", position: "DEF", price: 6.2, cs_rate: 0.67, points_pg: 5.0, ownership: 16.9 },
      { name: "Botman", position: "DEF", price: 4.9, cs_rate: 0.67, points_pg: 4.17, ownership: 12.3 }
    ]
  },
  {
    team: "Chelsea",
    teamCode: "CHE",
    defenseRank: 4,
    defenseStrength: 2.298,
    difficulty: "moderate",
    players: [
      { name: "Sánchez", position: "GK", price: 4.5, cs_rate: 0.33, points_pg: 3.5, ownership: 14.7 },
      { name: "James", position: "DEF", price: 5.8, cs_rate: 0.33, points_pg: 4.17, ownership: 18.2 },
      { name: "Colwill", position: "DEF", price: 4.4, cs_rate: 0.33, points_pg: 3.83, ownership: 9.4 }
    ]
  }
]

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

export default function QuickPicksPage() {
  const [activeTab, setActiveTab] = useState("attacking")

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
                {attackingPicks.map((teamData, index) => (
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
                {defensivePicks.map((teamData, index) => (
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
