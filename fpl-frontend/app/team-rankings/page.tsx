"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Shield, TrophyIcon  } from "lucide-react"

const teams = [
  {
    name: "Liverpool",
    code: "LIV",
    attackRank: 1,
    defenseRank: 2,
    goalsPerGame: 2.5,
    xGPerGame: 2.3,
    cleanSheetPct: 50,
    goalsConceded: 0.9,
    attackScore: 95,
    defenseScore: 92,
  },
  {
    name: "Manchester City",
    code: "MCI",
    attackRank: 2,
    defenseRank: 8,
    goalsPerGame: 2.3,
    xGPerGame: 2.4,
    cleanSheetPct: 36,
    goalsConceded: 1.2,
    attackScore: 93,
    defenseScore: 78,
  },
  {
    name: "Arsenal",
    code: "ARS",
    attackRank: 3,
    defenseRank: 3,
    goalsPerGame: 2.1,
    xGPerGame: 2.0,
    cleanSheetPct: 43,
    goalsConceded: 1.0,
    attackScore: 88,
    defenseScore: 88,
  },
  {
    name: "Chelsea",
    code: "CHE",
    attackRank: 4,
    defenseRank: 10,
    goalsPerGame: 2.0,
    xGPerGame: 1.9,
    cleanSheetPct: 29,
    goalsConceded: 1.4,
    attackScore: 85,
    defenseScore: 72,
  },
  {
    name: "Newcastle",
    code: "NEW",
    attackRank: 5,
    defenseRank: 5,
    goalsPerGame: 1.9,
    xGPerGame: 1.8,
    cleanSheetPct: 36,
    goalsConceded: 1.1,
    attackScore: 82,
    defenseScore: 82,
  },
  {
    name: "Tottenham",
    code: "TOT",
    attackRank: 6,
    defenseRank: 15,
    goalsPerGame: 1.9,
    xGPerGame: 1.9,
    cleanSheetPct: 21,
    goalsConceded: 1.6,
    attackScore: 81,
    defenseScore: 58,
  },
  {
    name: "Brentford",
    code: "BRE",
    attackRank: 7,
    defenseRank: 12,
    goalsPerGame: 1.8,
    xGPerGame: 1.7,
    cleanSheetPct: 29,
    goalsConceded: 1.4,
    attackScore: 78,
    defenseScore: 68,
  },
  {
    name: "Aston Villa",
    code: "AVL",
    attackRank: 8,
    defenseRank: 6,
    goalsPerGame: 1.6,
    xGPerGame: 1.6,
    cleanSheetPct: 36,
    goalsConceded: 1.1,
    attackScore: 75,
    defenseScore: 80,
  },
  {
    name: "Nottm Forest",
    code: "NFO",
    attackRank: 9,
    defenseRank: 1,
    goalsPerGame: 1.6,
    xGPerGame: 1.5,
    cleanSheetPct: 57,
    goalsConceded: 0.8,
    attackScore: 73,
    defenseScore: 95,
  },
  {
    name: "Brighton",
    code: "BHA",
    attackRank: 10,
    defenseRank: 9,
    goalsPerGame: 1.5,
    xGPerGame: 1.6,
    cleanSheetPct: 29,
    goalsConceded: 1.3,
    attackScore: 72,
    defenseScore: 75,
  },
  {
    name: "Fulham",
    code: "FUL",
    attackRank: 11,
    defenseRank: 11,
    goalsPerGame: 1.4,
    xGPerGame: 1.4,
    cleanSheetPct: 29,
    goalsConceded: 1.4,
    attackScore: 68,
    defenseScore: 70,
  },
  {
    name: "Bournemouth",
    code: "BOU",
    attackRank: 12,
    defenseRank: 14,
    goalsPerGame: 1.4,
    xGPerGame: 1.3,
    cleanSheetPct: 21,
    goalsConceded: 1.5,
    attackScore: 65,
    defenseScore: 62,
  },
  {
    name: "West Ham",
    code: "WHU",
    attackRank: 13,
    defenseRank: 16,
    goalsPerGame: 1.3,
    xGPerGame: 1.3,
    cleanSheetPct: 21,
    goalsConceded: 1.7,
    attackScore: 62,
    defenseScore: 55,
  },
  {
    name: "Manchester Utd",
    code: "MUN",
    attackRank: 14,
    defenseRank: 13,
    goalsPerGame: 1.2,
    xGPerGame: 1.4,
    cleanSheetPct: 21,
    goalsConceded: 1.5,
    attackScore: 60,
    defenseScore: 65,
  },
  {
    name: "Wolves",
    code: "WOL",
    attackRank: 15,
    defenseRank: 17,
    goalsPerGame: 1.2,
    xGPerGame: 1.2,
    cleanSheetPct: 14,
    goalsConceded: 1.8,
    attackScore: 58,
    defenseScore: 52,
  },
  {
    name: "Crystal Palace",
    code: "CRY",
    attackRank: 16,
    defenseRank: 7,
    goalsPerGame: 1.1,
    xGPerGame: 1.1,
    cleanSheetPct: 36,
    goalsConceded: 1.1,
    attackScore: 55,
    defenseScore: 78,
  },
  {
    name: "Everton",
    code: "EVE",
    attackRank: 17,
    defenseRank: 4,
    goalsPerGame: 1.0,
    xGPerGame: 1.0,
    cleanSheetPct: 43,
    goalsConceded: 1.0,
    attackScore: 52,
    defenseScore: 85,
  },
  {
    name: "Leicester",
    code: "LEI",
    attackRank: 18,
    defenseRank: 18,
    goalsPerGame: 1.0,
    xGPerGame: 1.1,
    cleanSheetPct: 14,
    goalsConceded: 1.9,
    attackScore: 50,
    defenseScore: 48,
  },
  {
    name: "Ipswich",
    code: "IPS",
    attackRank: 19,
    defenseRank: 19,
    goalsPerGame: 0.9,
    xGPerGame: 1.0,
    cleanSheetPct: 7,
    goalsConceded: 2.0,
    attackScore: 45,
    defenseScore: 42,
  },
  {
    name: "Southampton",
    code: "SOU",
    attackRank: 20,
    defenseRank: 20,
    goalsPerGame: 0.8,
    xGPerGame: 0.9,
    cleanSheetPct: 7,
    goalsConceded: 2.2,
    attackScore: 40,
    defenseScore: 35,
  },
]

export default function TeamRankingsPage() {
  const [view, setView] = useState<"attack" | "defense" | "combined">("combined")

  const sortedTeams = [...teams].sort((a, b) => {
    if (view === "attack") return a.attackRank - b.attackRank
    if (view === "defense") return a.defenseRank - b.defenseRank
    return a.attackRank + a.defenseRank - (b.attackRank + b.defenseRank)
  })

  // Calculate overall rank for each team in combined view
  const teamsWithOverallRank = sortedTeams.map((team, index) => ({
    ...team,
    overallRank: view === "combined" ? index + 1 : null
  }))

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        
        <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
        <TrophyIcon className="h-8 w-8 text-yellow-500" />
        Team Rankings
        </h1>
        <p className="text-lg text-muted-foreground">Attack and defense strength analysis for all 20 teams</p>
      </div>

      {/* Key Insights */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-accent/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Strongest Attack</p>
                <p className="text-xl font-bold text-foreground">Liverpool</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-chart-3/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-chart-3" />
              <div>
                <p className="text-sm text-muted-foreground">Best Defense</p>
                <p className="text-xl font-bold text-foreground">Nottm Forest</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-chart-2/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Weakest Attack</p>
                <p className="text-xl font-bold text-foreground">Southampton</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-chart-4/50 bg-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-chart-4" />
              <div>
                <p className="text-sm text-muted-foreground">Weakest Defense</p>
                <p className="text-xl font-bold text-foreground">Southampton</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Interactive View Toggle */}
      <div className="mb-6 flex flex-wrap gap-2 p-1 bg-secondary/50 rounded-xl">
        <button
          onClick={() => setView("combined")}
          className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            view === "combined"
              ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 border border-primary/20"
              : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/10 active:bg-white/20"
          }`}
        >
          <span className="relative z-10">📊 Overall Rankings</span>
          {view === "combined" && (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg blur-sm" />
          )}
        </button>
        <button
          onClick={() => setView("attack")}
          className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            view === "attack" 
              ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 border border-red-500/20" 
              : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-red-50 hover:text-red-600 active:bg-red-100"
          }`}
        >
          <span className="relative z-10">⚽ Attack Rankings</span>
          {view === "attack" && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-red-400/10 rounded-lg blur-sm" />
          )}
        </button>
        <button
          onClick={() => setView("defense")}
          className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            view === "defense"
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20"
              : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
          }`}
        >
          <span className="relative z-10">🛡️ Defense Rankings</span>
          {view === "defense" && (
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-400/10 rounded-lg blur-sm" />
          )}
        </button>
      </div>

      {/* Enhanced Interactive Rankings Grid */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {teamsWithOverallRank.map((team, index) => (
          <Card 
            key={team.code} 
            className={`group border-border bg-card transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 cursor-pointer ${
              index < 3 ? 'ring-2 ring-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-card' : ''
            }`}
          >
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 ${
                    index < 3 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg' 
                      : 'bg-secondary group-hover:bg-primary/10'
                  }`}>
                    <span className="font-mono text-lg font-bold">{team.code}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300">
                      {team.name}
                    </h3>
                    <div className="flex gap-2">
                      {view === "combined" ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs transition-all duration-300 group-hover:scale-105 ${
                            (team.overallRank || 0) <= 3 
                              ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/30 font-semibold' 
                              : 'bg-primary/10 text-primary border-primary/20'
                          }`}
                        >
                          #{team.overallRank} Overall
                        </Badge>
                      ) : (
                        <>
                          <Badge 
                            variant="outline" 
                            className={`text-xs transition-all duration-300 ${
                              view === "attack" 
                                ? 'bg-red-50 text-red-600 border-red-200 group-hover:bg-red-100' 
                                : ''
                            }`}
                          >
                            ATT #{team.attackRank}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs transition-all duration-300 ${
                              view === "defense" 
                                ? 'bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100' 
                                : ''
                            }`}
                          >
                            DEF #{team.defenseRank}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                {view === "combined" && (
                  <>
                    <div className="text-2xl font-bold text-primary">#{team.overallRank}</div>
                    <div className="text-xs text-muted-foreground">Overall Rank</div>
                  </>
                )}
                {view === "attack" && (
                  <>
                    <div className="text-2xl font-bold text-accent">#{team.attackRank}</div>
                    <div className="text-xs text-muted-foreground">Attack Rank</div>
                  </>
                )}
                {view === "defense" && (
                  <>
                    <div className="text-2xl font-bold text-chart-3">#{team.defenseRank}</div>
                    <div className="text-xs text-muted-foreground">Defense Rank</div>
                  </>
                )}
              </div>

              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="group/attack">
                  <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/attack:text-red-600 transition-colors">
                    Attack Strength
                  </p>
                  <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500 ease-out group-hover:from-red-500 group-hover:to-red-600" 
                      style={{ width: `${team.attackScore}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="group-hover/attack:text-red-600 transition-colors">
                      {team.goalsPerGame} goals/game
                    </span>
                    <span className="font-mono font-bold">{team.attackScore}</span>
                  </div>
                </div>
                <div className="group/defense">
                  <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/defense:text-blue-600 transition-colors">
                    Defense Strength
                  </p>
                  <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out group-hover:from-blue-500 group-hover:to-blue-600" 
                      style={{ width: `${team.defenseScore}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="group-hover/defense:text-blue-600 transition-colors">
                      {team.cleanSheetPct}% clean sheets
                    </span>
                    <span className="font-mono font-bold">{team.defenseScore}</span>
                  </div>
                </div>
              </div>

              {/* Additional Stats on Hover */}
              <div className="mt-4 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-xs text-red-600 font-medium">xG/Game</div>
                  <div className="text-sm font-bold text-red-700">{team.xGPerGame}</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-600 font-medium">Goals Conceded</div>
                  <div className="text-sm font-bold text-blue-700">{team.goalsConceded}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
