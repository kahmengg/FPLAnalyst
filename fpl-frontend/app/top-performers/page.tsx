"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Minus, Star, Shield, Target, Gem, DollarSign, Trophy } from "lucide-react"

// Data from cell 15 output - actual FPL data
const seasonPerformers = [
  { player: "Haaland", team: "MCI", position: "FWD", points: 62, ppg: 10.3, price: 14.4, ownership: 53.6 },
  { player: "Semenyo", team: "BOU", position: "MID", points: 48, ppg: 8.0, price: 7.8, ownership: 53.4 },
  { player: "Senesi", team: "BOU", position: "DEF", points: 44, ppg: 7.3, price: 4.9, ownership: 20.6 },
  { player: "Guéhi", team: "CRY", position: "DEF", points: 43, ppg: 7.2, price: 4.8, ownership: 27.9 },
  { player: "Anthony", team: "BUR", position: "MID", points: 40, ppg: 6.7, price: 5.6, ownership: 4.6 },
  { player: "Alderete", team: "SUN", position: "DEF", points: 39, ppg: 6.5, price: 4.0, ownership: 4.2 },
  { player: "Enzo", team: "CHE", position: "MID", points: 39, ppg: 6.5, price: 6.7, ownership: 13.5 },
  { player: "Roefs", team: "SUN", position: "GK", points: 39, ppg: 6.5, price: 4.5, ownership: 3.4 },
  { player: "Gabriel", team: "ARS", position: "DEF", points: 38, ppg: 6.3, price: 6.2, ownership: 25.4 },
  { player: "J.Timber", team: "ARS", position: "DEF", points: 37, ppg: 6.2, price: 5.8, ownership: 14.5 },
]

const valuePlayersList = [
  { player: "Livramento", team: "NEW", position: "DEF", pointsPerMillion: 7.25, totalPoints: 37, price: 5.1 },
  { player: "Rodon", team: "LEE", position: "DEF", pointsPerMillion: 7.25, totalPoints: 29, price: 4.0 },
  { player: "Keane", team: "EVE", position: "DEF", pointsPerMillion: 6.89, totalPoints: 31, price: 4.5 },
  { player: "Mitchell", team: "CRY", position: "DEF", pointsPerMillion: 6.8, totalPoints: 34, price: 5.0 },
  { player: "Pope", team: "NEW", position: "GK", pointsPerMillion: 6.8, totalPoints: 34, price: 5.0 },
  { player: "Chalobah", team: "CHE", position: "DEF", pointsPerMillion: 6.73, totalPoints: 35, price: 5.2 },
  { player: "Lacroix", team: "CRY", position: "DEF", pointsPerMillion: 6.67, totalPoints: 34, price: 5.1 },
  { player: "Richards", team: "CRY", position: "DEF", pointsPerMillion: 6.67, totalPoints: 30, price: 4.5 },
]

const hiddenGemsList = [
  {
    player: "Stach",
    team: "LEE",
    position: "MID",
    points: 31,
    ownership: 3.0,
    price: 5.0,
    xG: 0.7,
    xA: 0.9,
    xCS: 1.9,
    potentialScore: 1.6,
  },
  {
    player: "Minteh",
    team: "BHA",
    position: "MID",
    points: 29,
    ownership: 2.1,
    price: 5.9,
    xG: 1.5,
    xA: 1.9,
    xCS: 0.8,
    potentialScore: 2.2,
  },
  {
    player: "L.Paquetá",
    team: "WHU",
    position: "MID",
    points: 28,
    ownership: 3.1,
    price: 5.9,
    xG: 1.4,
    xA: 0.4,
    xCS: 1.5,
    potentialScore: 1.6,
  },
  {
    player: "Szoboszlai",
    team: "LIV",
    position: "MID",
    points: 26,
    ownership: 3.9,
    price: 6.5,
    xG: 0.5,
    xA: 1.3,
    xCS: 2.1,
    potentialScore: 1.4,
  },
  {
    player: "Sarr",
    team: "CRY",
    position: "MID",
    points: 29,
    ownership: 3.7,
    price: 6.4,
    xG: 2.7,
    xA: 0.2,
    xCS: 2.0,
    potentialScore: 2.9,
  },
  {
    player: "Thiago",
    team: "BRE",
    position: "FWD",
    points: 30,
    ownership: 2.3,
    price: 6.0,
    xG: 1.9,
    xA: 1.1,
    xCS: 1.2,
    potentialScore: 2.2,
  },
]

const goalScorers = [
  { player: "Haaland", team: "MCI", goals: 8, goalsPerGame: 1.33, points: 62, price: 14.4, ownership: 53.6 },
  { player: "Anthony", team: "BUR", goals: 4, goalsPerGame: 0.67, points: 40, price: 5.6, ownership: 4.6 },
  { player: "Semenyo", team: "BOU", goals: 4, goalsPerGame: 0.67, points: 48, price: 7.8, ownership: 53.4 },
  { player: "Thiago", team: "BRE", goals: 4, goalsPerGame: 0.67, points: 30, price: 6.0, ownership: 2.3 },
  { player: "Bowen", team: "WHU", goals: 3, goalsPerGame: 0.5, points: 25, price: 7.2, ownership: 18.4 },
]

const assistProviders = [
  { player: "Grealish", team: "EVE", assists: 4, assistsPerGame: 0.67, points: 28, price: 6.1, ownership: 12.8 },
  { player: "Diouf", team: "WHU", assists: 3, assistsPerGame: 0.5, points: 22, price: 5.5, ownership: 8.2 },
  { player: "Doku", team: "MCI", assists: 3, assistsPerGame: 0.5, points: 31, price: 7.8, ownership: 24.1 },
  { player: "João Pedro", team: "CHE", assists: 3, assistsPerGame: 0.5, points: 28, price: 6.9, ownership: 15.3 },
  { player: "Kudus", team: "TOT", assists: 3, assistsPerGame: 0.5, points: 26, price: 6.4, ownership: 11.7 },
]

const defensiveLeaders = [
  {
    player: "Pope",
    team: "NEW",
    position: "GK",
    points: 34,
    ppg: 5.7,
    cleanSheets: 4,
    csRate: 66.7,
    tackles: 1,
    price: 5.0,
  },
  {
    player: "Mitchell",
    team: "CRY",
    position: "DEF",
    points: 34,
    ppg: 5.7,
    cleanSheets: 3,
    csRate: 50.0,
    tackles: 24,
    price: 5.0,
  },
  {
    player: "J.Timber",
    team: "ARS",
    position: "DEF",
    points: 37,
    ppg: 6.2,
    cleanSheets: 3,
    csRate: 50.0,
    tackles: 19,
    price: 5.8,
  },
  {
    player: "Senesi",
    team: "BOU",
    position: "DEF",
    points: 44,
    ppg: 7.3,
    cleanSheets: 3,
    csRate: 50.0,
    tackles: 12,
    price: 4.9,
  },
  {
    player: "Livramento",
    team: "NEW",
    position: "DEF",
    points: 37,
    ppg: 6.2,
    cleanSheets: 4,
    csRate: 66.7,
    tackles: 6,
    price: 5.1,
  },
]

const overperformers = [
  { player: "Thiago", team: "BRE", goals: 4, xG: 1.9, overperformance: 2.1, sustainable: false },
  { player: "Bowen", team: "WHU", goals: 3, xG: 1.0, overperformance: 2.0, sustainable: false },
  { player: "Isidor", team: "SUN", goals: 3, xG: 1.1, overperformance: 1.9, sustainable: false },
  { player: "Anthony", team: "BUR", goals: 4, xG: 2.2, overperformance: 1.8, sustainable: false },
  { player: "Gravenberch", team: "LIV", goals: 2, xG: 0.3, overperformance: 1.7, sustainable: false },
]

const sustainableScorers = [
  { player: "Semenyo", team: "BOU", goals: 4, xG: 3.1, overperformance: 0.9, sustainable: true },
  { player: "Enzo", team: "CHE", goals: 3, xG: 3.3, overperformance: -0.3, sustainable: true },
  { player: "Gyökeres", team: "ARS", goals: 3, xG: 2.4, overperformance: 0.6, sustainable: true },
  { player: "Sarr", team: "CRY", goals: 3, xG: 2.7, overperformance: 0.3, sustainable: true },
]

// Helper components
const OverperformanceIndicator = ({ overperformance, sustainable }) => {
  if (sustainable) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Minus className="h-3 w-3" />
        <span className="text-xs font-mono">Sustainable</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 text-red-500">
      <TrendingUp className="h-3 w-3" />
      <span className="text-xs font-mono">+{overperformance.toFixed(1)}</span>
    </div>
  )
}

const PositionBadge = ({ position }) => {
  const colors = {
    GK: "bg-purple-100 text-purple-800 border-purple-200",
    DEF: "bg-blue-100 text-blue-800 border-blue-200",
    MID: "bg-green-100 text-green-800 border-green-200",
    FWD: "bg-red-100 text-red-800 border-red-200",
  }

  return (
    <Badge variant="outline" className={`text-xs font-mono ${colors[position] || "bg-gray-100 text-gray-800"}`}>
      {position}
    </Badge>
  )
}

export default function TopPerformersPage() {
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
        <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-600" />
          FPL Key Insights & Recommendations
        </h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive analysis based on actual season data through gameweek 6
        </p>
      </div>

        <Tabs defaultValue="season" className="space-y-6 sm:space-y-8">
          <div className="sticky top-4 z-10 backdrop-blur-sm bg-background/80 p-2 rounded-xl border shadow-lg py-0 px-2 text-transparent">
            <TabsList className="bg-secondary/50 p-1 rounded-lg border w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 pb-11 text-card">
              <TabsTrigger
                value="season"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Season</span>
                <span className="sm:hidden">⭐</span>
              </TabsTrigger>
              <TabsTrigger
                value="goals"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Goals</span>
                <span className="sm:hidden">⚽</span>
              </TabsTrigger>
              <TabsTrigger
                value="assists"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Assists</span>
                <span className="sm:hidden">🎯</span>
              </TabsTrigger>
              <TabsTrigger
                value="defense"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
              >
                <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Defense</span>
                <span className="sm:hidden">🛡️</span>
              </TabsTrigger>
              <TabsTrigger
                value="value"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
              >
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Value</span>
                <span className="sm:hidden">💰</span>
              </TabsTrigger>
              <TabsTrigger
                value="gems"
                className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white"
              >
                <Gem className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Gems</span>
                <span className="sm:hidden">💎</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="season" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <span className="flex items-center gap-2">⭐ Top 10 Season Performers</span>
                  <Badge variant="secondary" className="w-fit">
                    Most Reliable
                  </Badge>
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Highest point scorers with consistent performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-3">
                  {seasonPerformers.map((player, index) => (
                    <div
                      key={player.player}
                      className="p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-sm hover:bg-accent hover:text-white transition-all duration-300">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{player.player}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {player.team}
                              </Badge>
                              <PositionBadge position={player.position} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent">{player.points}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="text-center p-2 bg-secondary/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">PPG</div>
                          <div className="font-semibold">{player.ppg.toFixed(1)}</div>
                        </div>
                        <div className="text-center p-2 bg-secondary/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">Price</div>
                          <div className="font-semibold">£{player.price}m</div>
                        </div>
                        <div className="text-center p-2 bg-secondary/20 rounded-lg">
                          <div className="text-xs text-muted-foreground">Own%</div>
                          <div className="font-semibold">{player.ownership}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtle Desktop Table Layout */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Rank</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Player</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Team</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Pos</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Points</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">PPG</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Price</th>
                        <th className="pb-3 font-medium hover:text-foreground transition-colors cursor-default">Ownership</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seasonPerformers.map((player, index) => (
                        <tr
                          key={player.player}
                          className="group border-b border-border/50 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm cursor-pointer"
                        >
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center text-xs font-bold transition-colors duration-200">
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          
                          <td className="py-4 font-medium text-foreground group-hover:text-accent transition-colors duration-200">
                            <div className="flex items-center gap-2">
                              <span>{player.player}</span>
                              {index < 3 && (
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              )}
                            </div>
                          </td>
                          
                          <td className="py-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs group-hover:border-accent/50 transition-colors duration-200"
                            >
                              {player.team}
                            </Badge>
                          </td>
                          
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          
                          <td className="py-4 font-mono font-bold text-accent text-lg group-hover:text-accent/80 transition-colors duration-200">
                            {player.points}
                          </td>
                          
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            {player.ppg.toFixed(1)}
                          </td>
                          
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200">
                            £{player.price}m
                          </td>
                          
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            {player.ownership}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-2">🥅 Top Goal Scorers</span>
                    <Badge variant="secondary" className="w-fit">
                      Season Leaders
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">Most goals scored this season</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-3">
                    {goalScorers.map((player, index) => (
                      <div
                        key={player.player}
                        className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent font-bold text-sm">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground text-sm sm:text-base">{player.player}</div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                                <Badge variant="outline" className="text-xs w-fit">
                                  {player.team}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{player.ownership}% owned</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl sm:text-3xl font-bold text-accent">{player.goals}</div>
                            <div className="text-xs text-muted-foreground">goals</div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 text-sm mb-3">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="font-medium">£{player.price}m</span>
                            <span className="text-muted-foreground">{player.goalsPerGame.toFixed(2)}/game</span>
                            <span className="text-accent font-medium">{player.points} pts</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>Performance</span>
                            <span>
                              {((player.goals / Math.max(...goalScorers.map((p) => p.goals))) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <Progress
                            value={(player.goals / Math.max(...goalScorers.map((p) => p.goals))) * 100}
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2 text-base sm:text-lg">
                    📈 Sustainability Analysis
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Goal overperformance vs expected goals
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-4">
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-950/10 border border-red-200 dark:border-red-800/50 hover:shadow-lg transition-all duration-300">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                        ⚠️ Potential Regression Risk
                      </h4>
                      <div className="space-y-2">
                        {overperformers.slice(0, 3).map((player) => (
                          <div
                            key={player.player}
                            className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 p-2 rounded-lg bg-white/50 dark:bg-red-900/20"
                          >
                            <span className="font-medium text-sm sm:text-base">{player.player}</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                              +{player.overperformance.toFixed(1)} above xG
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-950/10 border border-green-200 dark:border-green-800/50 hover:shadow-lg transition-all duration-300">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                        ✅ Sustainable Performers
                      </h4>
                      <div className="space-y-2">
                        {sustainableScorers.map((player) => (
                          <div
                            key={player.player}
                            className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 p-2 rounded-lg bg-white/50 dark:bg-green-900/20"
                          >
                            <span className="font-medium text-sm sm:text-base">{player.player}</span>
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                              {player.goals} ≈ {player.xG.toFixed(1)} xG
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="assists" className="space-y-4">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  🎯 Top Assist Providers
                  <Badge variant="secondary" className="ml-auto">
                    Creativity Leaders
                  </Badge>
                </CardTitle>
                <CardDescription>Most assists provided this season</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Rank</th>
                        <th className="pb-3 font-medium">Player</th>
                        <th className="pb-3 font-medium">Team</th>
                        <th className="pb-3 font-medium">Assists</th>
                        <th className="pb-3 font-medium">Per Game</th>
                        <th className="pb-3 font-medium">Points</th>
                        <th className="pb-3 font-medium">Price</th>
                        <th className="pb-3 font-medium">Ownership</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assistProviders.map((player, index) => (
                        <tr
                          key={player.player}
                          className="group border-b border-border/50 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm cursor-pointer"
                        >
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center text-xs font-bold transition-colors duration-200">
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-medium text-foreground group-hover:text-accent transition-colors duration-200">{player.player}</td>
                          <td className="py-4">
                            <Badge variant="outline" className="font-mono text-xs group-hover:border-accent/50 transition-colors duration-200">
                              {player.team}
                            </Badge>
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">{player.assists}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            {player.assistsPerGame.toFixed(2)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">{player.points}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200">£{player.price}m</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">{player.ownership}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defense" className="space-y-4">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  🛡️ Best Defensive Performers
                  <Badge variant="secondary" className="ml-auto">
                    Comprehensive Scoring
                  </Badge>
                </CardTitle>
                <CardDescription>Clean sheets, tackles, and defensive contributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Rank</th>
                        <th className="pb-3 font-medium">Player</th>
                        <th className="pb-3 font-medium">Team</th>
                        <th className="pb-3 font-medium">Pos</th>
                        <th className="pb-3 font-medium">Points</th>
                        <th className="pb-3 font-medium">PPG</th>
                        <th className="pb-3 font-medium">Clean Sheets</th>
                        <th className="pb-3 font-medium">CS Rate</th>
                        <th className="pb-3 font-medium">Tackles</th>
                        <th className="pb-3 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {defensiveLeaders.map((player, index) => (
                        <tr
                          key={player.player}
                          className="group border-b border-border/50 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm cursor-pointer"
                        >
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center text-xs font-bold transition-colors duration-200">
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-medium text-foreground group-hover:text-accent transition-colors duration-200">{player.player}</td>
                          <td className="py-4">
                            <Badge variant="outline" className="font-mono text-xs group-hover:border-accent/50 transition-colors duration-200">
                              {player.team}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">{player.points}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">{player.ppg.toFixed(1)}</td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">{player.cleanSheets}</td>
                          <td className="py-4 font-mono text-sm text-green-600 group-hover:text-green-500 transition-colors duration-200">{player.csRate.toFixed(1)}%</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">{player.tackles}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200">£{player.price}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="value" className="space-y-4">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  💰 Best Value Players
                  <Badge variant="secondary" className="ml-auto">
                    Points per £m
                  </Badge>
                </CardTitle>
                <CardDescription>Highest points per million efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Rank</th>
                        <th className="pb-3 font-medium">Player</th>
                        <th className="pb-3 font-medium">Team</th>
                        <th className="pb-3 font-medium">Pos</th>
                        <th className="pb-3 font-medium">Pts/£m</th>
                        <th className="pb-3 font-medium">Total Pts</th>
                        <th className="pb-3 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {valuePlayersList.map((player, index) => (
                        <tr
                          key={player.player}
                          className="group border-b border-border/50 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm cursor-pointer"
                        >
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center text-xs font-bold transition-colors duration-200">
                                {index + 1}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-medium text-foreground group-hover:text-accent transition-colors duration-200">{player.player}</td>
                          <td className="py-4">
                            <Badge variant="outline" className="font-mono text-xs group-hover:border-accent/50 transition-colors duration-200">
                              {player.team}
                            </Badge>
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono font-bold text-green-600 text-lg group-hover:text-green-500 transition-colors duration-200">
                            {player.pointsPerMillion.toFixed(2)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">{player.totalPoints}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200">£{player.price}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gems" className="space-y-4">
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  💎 Hidden Gems
                  <Badge variant="secondary" className="ml-auto">
                    Low Ownership + High Potential
                  </Badge>
                </CardTitle>
                <CardDescription>Undervalued players with strong underlying stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hiddenGemsList.map((player, index) => (
                    <div
                      key={player.player}
                      className="p-4 rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/10 border transition-all hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="text-xs">
                          {player.team}
                        </Badge>
                        <div className="text-xs text-muted-foreground">#{index + 1}</div>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-medium text-foreground">{player.player}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <PositionBadge position={player.position} />
                          <span className="text-sm text-muted-foreground">£{player.price}m</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Points:</span>
                          <span className="font-mono text-foreground">{player.points}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ownership:</span>
                          <span className="font-mono text-accent font-bold">{player.ownership}%</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>xG: {player.xG.toFixed(1)}</span>
                          <span>xA: {player.xA.toFixed(1)}</span>
                          <span>xCS: {player.xCS.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Progress value={player.ownership * 20} className="h-1" />
                        <div className="text-xs text-muted-foreground mt-1">Ownership Level</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Key Insights Footer */}
        <Card className="mt-8 border-border bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">💡 Key Interpretations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">⚠️ Overperformers</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  May see point drops as they regress to expected stats
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">✅ Sustainable Picks</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Reliable long-term performers for your team
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💰 Strategy</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Consider selling overperformers at peak value
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
