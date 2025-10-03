"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, CalendarIcon, Target, Shield, TrendingUp, Users } from "lucide-react"

// Sample data based on your notebook analysis
const fixtureOpportunities = {
  attack: [
    { gw: 8, matchup: "Liverpool vs Man Utd", team: "Liverpool", venue: "H", score: 8.5, level: "VERY EASY" },
    { gw: 9, matchup: "Man Utd vs Brighton", team: "Man Utd", venue: "H", score: 7.8, level: "VERY EASY" },
    { gw: 7, matchup: "Arsenal vs Everton", team: "Arsenal", venue: "H", score: 6.2, level: "EASY" },
    { gw: 8, matchup: "Newcastle vs Leicester", team: "Newcastle", venue: "H", score: 5.9, level: "EASY" },
    { gw: 9, matchup: "Tottenham vs Southampton", team: "Tottenham", venue: "H", score: 5.4, level: "EASY" },
  ],
  defense: [
    { gw: 7, matchup: "Liverpool vs Fulham", team: "Liverpool", venue: "H", score: 7.2, level: "VERY EASY" },
    { gw: 8, matchup: "Arsenal vs Everton", team: "Arsenal", venue: "H", score: 6.8, level: "EASY" },
    { gw: 9, matchup: "Chelsea vs Brentford", team: "Chelsea", venue: "H", score: 6.1, level: "EASY" },
    { gw: 7, matchup: "Newcastle vs Leicester", team: "Newcastle", venue: "H", score: 5.7, level: "EASY" },
    { gw: 8, matchup: "Tottenham vs Southampton", team: "Tottenham", venue: "H", score: 5.3, level: "EASY" },
  ]
}

const teamDifficultySummary = [
  { team: "Arsenal", attackDiff: 3.0, defenseDiff: 5.4, overall: 4.2, fixtures: 4 },
  { team: "Liverpool", attackDiff: 6.2, defenseDiff: 1.8, overall: 4.0, fixtures: 4 },
  { team: "Newcastle", attackDiff: 2.8, defenseDiff: 4.9, overall: 3.85, fixtures: 4 },
  { team: "Chelsea", attackDiff: 1.9, defenseDiff: 4.2, overall: 3.05, fixtures: 4 },
  { team: "Tottenham", attackDiff: 4.1, defenseDiff: 1.8, overall: 2.95, fixtures: 4 },
  { team: "Man City", attackDiff: 5.2, defenseDiff: 0.4, overall: 2.8, fixtures: 4 },
  { team: "Brighton", attackDiff: 0.8, defenseDiff: 3.1, overall: 1.95, fixtures: 4 },
  { team: "Aston Villa", attackDiff: -0.5, defenseDiff: 2.8, overall: 1.15, fixtures: 4 },
  { team: "West Ham", attackDiff: -1.2, defenseDiff: -0.8, overall: -1.0, fixtures: 4 },
  { team: "Man United", attackDiff: -2.1, defenseDiff: -1.8, overall: -1.95, fixtures: 4 },
]

const fixtures = {
  15: [
    {
      home: "LIV",
      away: "FUL",
      homeAttDiff: 1,
      homeDefDiff: 5,
      awayAttDiff: 5,
      awayDefDiff: 2,
      recommendation: "Target",
    },
    {
      home: "MCI",
      away: "MUN",
      homeAttDiff: 1,
      homeDefDiff: 4,
      awayAttDiff: 4,
      awayDefDiff: 3,
      recommendation: "Target",
    },
    {
      home: "ARS",
      away: "EVE",
      homeAttDiff: 1,
      homeDefDiff: 5,
      awayAttDiff: 5,
      awayDefDiff: 1,
      recommendation: "Consider",
    },
    {
      home: "CHE",
      away: "BRE",
      homeAttDiff: 2,
      homeDefDiff: 3,
      awayAttDiff: 3,
      awayDefDiff: 2,
      recommendation: "Consider",
    },
    {
      home: "NEW",
      away: "LEI",
      homeAttDiff: 1,
      homeDefDiff: 5,
      awayAttDiff: 5,
      awayDefDiff: 1,
      recommendation: "Target",
    },
    {
      home: "TOT",
      away: "SOU",
      homeAttDiff: 1,
      homeDefDiff: 5,
      awayAttDiff: 5,
      awayDefDiff: 1,
      recommendation: "Target",
    },
    {
      home: "AVL",
      away: "BOU",
      homeAttDiff: 2,
      homeDefDiff: 4,
      awayAttDiff: 4,
      awayDefDiff: 2,
      recommendation: "Consider",
    },
    {
      home: "NFO",
      away: "IPS",
      homeAttDiff: 2,
      homeDefDiff: 5,
      awayAttDiff: 5,
      awayDefDiff: 1,
      recommendation: "Consider",
    },
    {
      home: "BHA",
      away: "CRY",
      homeAttDiff: 2,
      homeDefDiff: 4,
      awayAttDiff: 4,
      awayDefDiff: 2,
      recommendation: "Consider",
    },
    {
      home: "WHU",
      away: "WOL",
      homeAttDiff: 3,
      homeDefDiff: 4,
      awayAttDiff: 4,
      awayDefDiff: 3,
      recommendation: "Avoid",
    },
  ],
}

const difficultyColors = {
  1: "bg-accent text-background",
  2: "bg-chart-3 text-background",
  3: "bg-chart-4 text-background",
  4: "bg-chart-2 text-background",
  5: "bg-destructive text-destructive-foreground",
}

const recommendationColors = {
  Target: "border-accent/50 bg-accent/5",
  Consider: "border-chart-3/50 bg-chart-3/5",
  Avoid: "border-destructive/50 bg-destructive/5",
}

const getLevelColor = (level) => {
  switch (level) {
    case "VERY EASY": return "bg-green-500/20 text-green-700 border-green-300"
    case "EASY": return "bg-blue-500/20 text-blue-700 border-blue-300"
    case "MEDIUM-EASY": return "bg-yellow-500/20 text-yellow-700 border-yellow-300"
    default: return "bg-gray-500/20 text-gray-700 border-gray-300"
  }
}

const getDifficultyEmoji = (score) => {
  if (score >= 1) return "🟢"
  if (score >= -1) return "🟡"
  return "🔴"
}

export default function FixtureAnalysisPage() {
  const [gameweek, setGameweek] = useState(15)
  const [activeTab, setActiveTab] = useState("fixtures")

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-purple-400" />
            Fixture Analysis
          </h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive gameweek analysis with strategic opportunities
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-lg border w-full grid grid-cols-2 sm:grid-cols-4 gap-1 text-background">
            <TabsTrigger
              value="fixtures"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Fixtures</span>
            </TabsTrigger>
            <TabsTrigger
              value="opportunities"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Opportunities</span>
            </TabsTrigger>
            <TabsTrigger
              value="summary"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
            <TabsTrigger
              value="transfers"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Transfers</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="space-y-6">
            {/* Gameweek Selector */}
            <div className="flex items-center justify-evenly">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setGameweek(Math.max(7, gameweek - 1))}
                  disabled={gameweek === 7}
                  className="rounded-lg bg-secondary p-2 text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current Gameweek</p>
                  <p className="text-3xl font-bold text-foreground">GW {gameweek}</p>
                </div>
                <button
                  onClick={() => setGameweek(Math.min(22, gameweek + 1))}
                  disabled={gameweek === 22}
                  className="rounded-lg bg-secondary p-2 text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2 flex-1 max-w-sm">
          <Card className="border-accent/50 bg-card/50 backdrop-blur h-16 flex items-center justify-center rounded-xl border">
            <CardContent className="p-2 text-center flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground">Easy</p>
              <p className="text-base font-bold text-accent">4</p>
            </CardContent>
          </Card>
          <Card className="border-chart-4/50 bg-card/50 backdrop-blur h-16 flex items-center justify-center rounded-xl border">
            <CardContent className="p-2 text-center flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground">Moderate</p>
              <p className="text-base font-bold text-chart-4">4</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/50 bg-card/50 backdrop-blur h-16 flex items-center justify-center rounded-xl border">
            <CardContent className="p-2 text-center flex flex-col justify-center">
              <p className="text-[10px] text-muted-foreground">Hard</p>
              <p className="text-base font-bold text-destructive">2</p>
            </CardContent>
          </Card>
        </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Difficulty:</span>
                <Badge className={difficultyColors[1]}>1 Easy</Badge>
                <Badge className={difficultyColors[2]}>2</Badge>
                <Badge className={difficultyColors[3]}>3</Badge>
                <Badge className={difficultyColors[4]}>4</Badge>
                <Badge className={difficultyColors[5]}>5 Hard</Badge>
              </div>
            </div>
            {/* Fixtures Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {fixtures[15].map((fixture, index) => (
                <Card
                  key={index}
                  className={`border transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${recommendationColors[fixture.recommendation]}`}
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <Badge
                        variant={
                          fixture.recommendation === "Target"
                            ? "default"
                            : fixture.recommendation === "Consider"
                              ? "secondary"
                              : "destructive"
                        }
                        className="font-medium"
                      >
                        {fixture.recommendation === "Target" && "🔥 "}
                        {fixture.recommendation === "Consider" && "⭐ "}
                        {fixture.recommendation === "Avoid" && "❌ "}
                        {fixture.recommendation}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Home Team */}
                      <div className="flex-1 text-center">
                        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-secondary mx-auto">
                          <span className="font-mono text-xl font-bold text-foreground">{fixture.home}</span>
                        </div>
                        <p className="mb-2 text-sm font-medium text-foreground">{fixture.home}</p>
                        <div className="flex justify-center gap-1">
                          <Badge className={`text-xs ${difficultyColors[fixture.homeAttDiff]}`}>
                            ATT {fixture.homeAttDiff}
                          </Badge>
                          <Badge className={`text-xs ${difficultyColors[fixture.homeDefDiff]}`}>
                            DEF {fixture.homeDefDiff}
                          </Badge>
                        </div>
                      </div>

                      {/* VS */}
                      <div className="px-4">
                        <span className="text-2xl font-bold text-muted-foreground">vs</span>
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 text-center">
                        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-lg bg-secondary mx-auto">
                          <span className="font-mono text-xl font-bold text-foreground">{fixture.away}</span>
                        </div>
                        <p className="mb-2 text-sm font-medium text-foreground">{fixture.away}</p>
                        <div className="flex justify-center gap-1">
                          <Badge className={`text-xs ${difficultyColors[fixture.awayAttDiff]}`}>
                            ATT {fixture.awayAttDiff}
                          </Badge>
                          <Badge className={`text-xs ${difficultyColors[fixture.awayDefDiff]}`}>
                            DEF {fixture.awayDefDiff}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Attacking Opportunities */}
              <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    ⚔️ Best Attacking Opportunities
                    <Badge variant="secondary" className="ml-auto">
                      GW7-9
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {fixtureOpportunities.attack.map((opp, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent/20 text-accent font-bold text-xs flex items-center justify-center">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">GW {opp.gw}</span>
                          </div>
                          <Badge className={`text-xs border ${getLevelColor(opp.level)}`}>
                            🔥 {opp.level}
                          </Badge>
                        </div>
                        
                        <div className="mb-2">
                          <p className="font-semibold text-foreground">{opp.matchup}</p>
                          <p className="text-sm text-muted-foreground">
                            Target: <span className="text-accent font-medium">{opp.team}</span> ({opp.venue})
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Difficulty Score</span>
                          <span className="font-mono font-bold text-accent">+{opp.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Defensive Opportunities */}
              <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    🛡️ Best Defensive Opportunities
                    <Badge variant="secondary" className="ml-auto">
                      GW7-9
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {fixtureOpportunities.defense.map((opp, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 font-bold text-xs flex items-center justify-center">
                              {index + 1}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">GW {opp.gw}</span>
                          </div>
                          <Badge className={`text-xs border ${getLevelColor(opp.level)}`}>
                            🛡️ {opp.level}
                          </Badge>
                        </div>
                        
                        <div className="mb-2">
                          <p className="font-semibold text-foreground">{opp.matchup}</p>
                          <p className="text-sm text-muted-foreground">
                            Target: <span className="text-blue-600 font-medium">{opp.team}</span> ({opp.venue})
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Difficulty Score</span>
                          <span className="font-mono font-bold text-blue-600">+{opp.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6">
            <Card className="border-border bg-card/50 backdrop-blur-md shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  🏆 Team Fixture Difficulty Summary
                  <Badge variant="secondary" className="ml-auto">
                    Next 4 GWs
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Higher scores = easier fixtures, negative = harder fixtures
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Rank</th>
                        <th className="pb-3 font-medium">Team</th>
                        <th className="pb-3 font-medium">Attack Difficulty</th>
                        <th className="pb-3 font-medium">Defense Difficulty</th>
                        <th className="pb-3 font-medium">Overall</th>
                        <th className="pb-3 font-medium">Fixtures</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamDifficultySummary.map((team, index) => (
                        <tr
                          key={team.team}
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
                            {team.team}
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getDifficultyEmoji(team.attackDiff)}</span>
                              <span className="font-mono text-sm group-hover:text-foreground transition-colors duration-200">
                                ATT: {team.attackDiff > 0 ? '+' : ''}{team.attackDiff.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{getDifficultyEmoji(team.defenseDiff)}</span>
                              <span className="font-mono text-sm group-hover:text-foreground transition-colors duration-200">
                                DEF: {team.defenseDiff > 0 ? '+' : ''}{team.defenseDiff.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 font-mono font-bold text-accent group-hover:text-accent/80 transition-colors duration-200">
                            {team.overall > 0 ? '+' : ''}{team.overall.toFixed(1)}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                            {team.fixtures}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transfers" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
                    🎯 Target Teams for Transfers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">🔥 Attacking Assets:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Liverpool (3 good fixtures)</li>
                        <li>• Arsenal (2 good fixtures)</li>
                        <li>• Newcastle (2 good fixtures)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">🛡️ Defensive Assets:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Arsenal (3 good fixtures)</li>
                        <li>• Liverpool (2 good fixtures)</li>
                        <li>• Chelsea (2 good fixtures)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
                    ❌ Avoid These Teams
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">⚔️ Poor Attacking Fixtures:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Man United (3 tough fixtures)</li>
                        <li>• West Ham (2 tough fixtures)</li>
                        <li>• Wolves (2 tough fixtures)</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">🏰 Poor Defensive Fixtures:</h4>
                      <ul className="space-y-1 text-sm">
                        <li>• Brighton (3 tough fixtures)</li>
                        <li>• Everton (2 tough fixtures)</li>
                        <li>• Southampton (2 tough fixtures)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
