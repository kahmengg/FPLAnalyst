
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crosshair, TrendingUp, TrendingDown, Shield, TrophyIcon } from "lucide-react"

const API_BASE_URL = "http://localhost:5000"; // Adjust if deployed elsewhere

export default function TeamRankingsPage() {
  const [view, setView] = useState<"attack" | "defense" | "combined">("combined")
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [overallRes, attackRes, defenseRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/overall_rankings`),
          fetch(`${API_BASE_URL}/api/attack_rankings`),
          fetch(`${API_BASE_URL}/api/defense_rankings`)
        ])

        if (!overallRes.ok || !attackRes.ok || !defenseRes.ok) {
          throw new Error('Failed to fetch rankings')
        }

        const overall = await overallRes.json()
        const attack = await attackRes.json()
        const defense = await defenseRes.json()

        const attackMap = new Map(attack.map(t => [t.team, t]))
        const defenseMap = new Map(defense.map(t => [t.team, t]))

        const maxGoalsPerGame = Math.max(...overall.map(t => t.goals_per_game))
        const maxCleanSheetPct = Math.max(...overall.map(t => t.clean_sheet_rate)) * 100
        const maxOverallStrength = Math.max(...overall.map(t => t.overall_strength))

        const mergedTeams = overall.map(o => {
          const a = attackMap.get(o.team) || {}
          const d = defenseMap.get(o.team) || {}
          return {
            name: o.team,
            code: o.team_short,
            attackRank: a.attack_rank || 'N/A',
            defenseRank: d.defense_rank || 'N/A',
            goalsPerGame: o.goals_per_game,
            xGPerGame: o.expected_goals_per_game ,
            cleanSheetPct: o.clean_sheet_rate * 100,
            goalsConceded: o.goals_conceded_per_game,
            attackStrength: a.attack_strength || 0,
            defenseStrength: d.defense_strength || 0,
            attackScore: Math.round((o.goals_per_game / maxGoalsPerGame) * 100), // Normalized for progress bar
            defenseScore: Math.round((o.clean_sheet_rate * 100) / maxCleanSheetPct * 100), // Normalized for progress bar
            overallStrength: Math.round((o.overall_strength / maxOverallStrength) * 100)
          }
        })

        setTeams(mergedTeams)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sortedTeams = [...teams].sort((a, b) => {
    if (view === "attack") return a.attackRank - b.attackRank
    if (view === "defense") return a.defenseRank - b.defenseRank
    return a.attackRank + a.defenseRank - (b.attackRank + b.defenseRank)
  })

  const teamsWithOverallRank = sortedTeams.map((team, index) => ({
    ...team,
    overallRank: view === "combined" ? index + 1 : null
  }))

  const strongestAttack = sortedTeams[0]?.name || "Unknown"
  const bestDefense = teams.sort((a, b) => a.defenseRank - b.defenseRank)[0]?.name || "Unknown"
  const weakestAttack = sortedTeams[sortedTeams.length - 1]?.name || "Unknown"
  const weakestDefense = teams.sort((a, b) => b.defenseRank - a.defenseRank)[0]?.name || "Unknown"

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading rankings...</div>
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <TrophyIcon className="h-8 w-8 text-yellow-500" />
            Team Rankings
          </h1>
          <p className="text-lg text-muted-foreground">Attack and defense strength analysis for all 20 teams</p>
        </div>

        {/* Key Insights */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-accent/50 bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Strongest Attack</p>
                  <p className="text-xl font-bold text-foreground">{strongestAttack}</p>
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
                  <p className="text-xl font-bold text-foreground">{bestDefense}</p>
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
                  <p className="text-xl font-bold text-foreground">{weakestAttack}</p>
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
                  <p className="text-xl font-bold text-foreground">{weakestDefense}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle */}
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

        {/* Rankings Grid */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {teamsWithOverallRank.map((team, index) => (
            <Card
              key={team.code}
              className={`group border-border bg-card transition-all duration-300 hover:border-accent/50 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 cursor-pointer ${
                index < 3 ? "ring-2 ring-yellow-500/20 bg-gradient-to-br from-yellow-50/50 to-card" : ""
              }`}
            >
              <CardContent className="p-6 sm:p-8">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 ${
                        index < 3
                          ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg"
                          : "bg-secondary group-hover:bg-primary/10"
                      }`}
                    >
                      <span className="font-mono text-lg font-bold">{team.code}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                        {team.name}
                      </h3>
                      <div className="flex gap-2">
                        {view === "combined" ? (
                          <>
                            <Badge
                              variant="outline"
                              className="text-xs transition-all duration-300 bg-red-50 text-red-600 border-red-200 group-hover:bg-red-100"
                            >
                              ATT #{team.attackRank}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-xs transition-all duration-300 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100"
                            >
                              DEF #{team.defenseRank}
                            </Badge>
                          </>
                        ) : view === "attack" ? (
                          <Badge
                            variant="outline"
                            className="text-xs transition-all duration-300 bg-red-50 text-red-600 border-red-200 group-hover:bg-red-100"
                          >
                            ATT #{team.attackRank}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs transition-all duration-300 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100"
                          >
                            DEF #{team.defenseRank}
                          </Badge>
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

                <div className="grid grid-cols-3 gap-4">
                  {/* Attack Strength */}
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
                        {team.goalsPerGame.toFixed(2)} goals/game
                      </span>
                      <span className="font-mono font-bold">{team.attackStrength.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Defense Strength */}
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
                        {team.cleanSheetPct.toFixed(0)}% clean sheets
                      </span>
                      <span className="font-mono font-bold">{team.defenseStrength.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Overall Strength */}
                  <div className="group/overall">
                    <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/overall:text-green-600 transition-colors">
                      Overall Strength
                    </p>
                    <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                      <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500 ease-out group-hover:from-green-500 group-hover:to-green-600"
                        style={{ width: `${team.overallStrength}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="group-hover/overall:text-green-600 transition-colors">
                        {team.overallStrength}
                      </span>
                      <span className="font-mono font-bold">{team.overallStrength}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Stats on Hover */}
                <div className="mt-4 grid grid-cols-2 gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-600 font-medium">xG/Game</div>
                    <div className="text-sm font-bold text-red-700">{team.xGPerGame.toFixed(2)}</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-600 font-medium">Goals Conceded</div>
                    <div className="text-sm font-bold text-blue-700">{team.goalsConceded.toFixed(1)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}