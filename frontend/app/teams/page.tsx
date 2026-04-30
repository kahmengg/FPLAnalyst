"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { getTeamRankings, getAllPlayers } from "@/lib/supabase"

interface Team {
  name: string
  team_short: string
  overall_rank: number
  attack_rank: number
  defense_rank: number
  goals_per_game: number
  xg_per_game: number
  goals_conceded_per_game: number
  clean_sheet_rate: number
  home_goals_per_game?: number
  home_clean_sheet_rate?: number
  away_goals_per_game?: number
  away_clean_sheet_rate?: number
}

interface Player {
  name: string
  web_name: string
  position_name: string
  form: number
  cost: number
  ownership: number
  totalPoints?: number
}

const teamColors: Record<string, { border: string; bg: string }> = {
  ARS: { border: "border-red-600", bg: "bg-red-50 dark:bg-red-950" },
  AVL: { border: "border-purple-700", bg: "bg-purple-50 dark:bg-purple-950" },
  BOU: { border: "border-red-500", bg: "bg-red-50 dark:bg-red-950" },
  BRE: { border: "border-red-600", bg: "bg-red-50 dark:bg-red-950" },
  BHA: { border: "border-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  BUR: { border: "border-purple-800", bg: "bg-purple-50 dark:bg-purple-950" },
  CHE: { border: "border-blue-700", bg: "bg-blue-50 dark:bg-blue-950" },
  CRY: { border: "border-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  EVE: { border: "border-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  FUL: { border: "border-slate-900", bg: "bg-slate-50 dark:bg-slate-950" },
  LEE: { border: "border-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
  LIV: { border: "border-red-700", bg: "bg-red-50 dark:bg-red-950" },
  MCI: { border: "border-sky-500", bg: "bg-sky-50 dark:bg-sky-950" },
  MUN: { border: "border-red-700", bg: "bg-red-50 dark:bg-red-950" },
  NEW: { border: "border-slate-800", bg: "bg-slate-50 dark:bg-slate-950" },
  NFO: { border: "border-red-600", bg: "bg-red-50 dark:bg-red-950" },
  SUN: { border: "border-red-600", bg: "bg-red-50 dark:bg-red-950" },
  TOT: { border: "border-slate-800", bg: "bg-slate-50 dark:bg-slate-950" },
  WHU: { border: "border-purple-800", bg: "bg-purple-50 dark:bg-purple-950" },
  WOL: { border: "border-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950" },
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Sort state
  const [sortBy, setSortBy] = useState<string>("overall_rank")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Modal state
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [teamSquad, setTeamSquad] = useState<Player[]>([])
  const [positionFilter, setPositionFilter] = useState<string>("all")
  const [loadingSquad, setLoadingSquad] = useState(false)

  // Fetch teams
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const [overallRanks, attackRanks, defenseRanks] = await Promise.all([
          getTeamRankings("overall"),
          getTeamRankings("attack"),
          getTeamRankings("defense"),
        ])

        const attackMap = new Map(attackRanks.map((t: any) => [t.team, t]))
        const defenseMap = new Map(defenseRanks.map((t: any) => [t.team, t]))

        const merged = (overallRanks || []).map((team: any) => {
          const attack = attackMap.get(team.team) || {}
          const defense = defenseMap.get(team.team) || {}

          return {
            name: team.team,
            team_short: team.team_short,
            overall_rank: team.overall_rank,
            attack_rank: attack.attack_rank || "N/A",
            defense_rank: defense.defense_rank || "N/A",
            goals_per_game: team.goals_per_game,
            xg_per_game: team.xg_per_game,
            goals_conceded_per_game: team.goals_conceded_per_game,
            clean_sheet_rate: parseFloat((team.clean_sheet_rate * 100).toFixed(1)),
            home_goals_per_game: team.home_goals_per_game || team.goals_per_game * 1.1,
            home_clean_sheet_rate: (team.home_clean_sheet_rate || team.clean_sheet_rate) * 100,
            away_goals_per_game: team.away_goals_per_game || team.goals_per_game * 0.9,
            away_clean_sheet_rate: (team.away_clean_sheet_rate || team.clean_sheet_rate) * 100,
          }
        })

        setTeams(merged)
      } catch (err) {
        setError("Failed to fetch teams")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const sortedTeams = [...teams].sort((a, b) => {
    let aVal = 0
    let bVal = 0

    switch (sortBy) {
      case "overall_rank":
        aVal = a.overall_rank
        bVal = b.overall_rank
        break
      case "attack_rank":
        aVal = typeof a.attack_rank === "number" ? a.attack_rank : 999
        bVal = typeof b.attack_rank === "number" ? b.attack_rank : 999
        break
      case "defense_rank":
        aVal = typeof a.defense_rank === "number" ? a.defense_rank : 999
        bVal = typeof b.defense_rank === "number" ? b.defense_rank : 999
        break
      case "goals_per_game":
        aVal = a.goals_per_game
        bVal = b.goals_per_game
        break
      case "xg_per_game":
        aVal = a.xg_per_game
        bVal = b.xg_per_game
        break
      case "clean_sheet_rate":
        aVal = parseFloat(a.clean_sheet_rate as unknown as string)
        bVal = parseFloat(b.clean_sheet_rate as unknown as string)
        break
      default:
        aVal = a.overall_rank
        bVal = b.overall_rank
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal
  })

  const handleTeamClick = async (teamName: string) => {
    setSelectedTeam(teamName)
    setLoadingSquad(true)
    try {
      const allPlayers = await getAllPlayers(1000)
      const squad = (allPlayers || [])
        .filter((p: any) => (p.team === teamName || p.team_short === teamName) && p.form && p.form > 0)
        .sort((a: any, b: any) => (b.form || 0) - (a.form || 0))
        .map((p: any) => ({
          name: p.web_name || p.player_name,
          web_name: p.web_name || p.player_name,
          position_name: p.position_name || p.position,
          form: p.form || 0,
          cost: p.cost,
          ownership: p.ownership || 0,
          totalPoints: p.totalPoints || 0,
        }))
      setTeamSquad(squad)
    } catch (err) {
      setTeamSquad([])
    } finally {
      setLoadingSquad(false)
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4" />
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold flex items-center gap-3">
            <span className="text-2xl">🏆</span>
            Teams
          </h1>
          <p className="text-lg text-muted-foreground">Team strength rankings and squad analysis</p>
        </div>

        {/* Teams Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        setSortBy("overall_rank")
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }}
                    >
                      Overall {sortBy === "overall_rank" && getSortIcon("overall_rank")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        setSortBy("attack_rank")
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }}
                    >
                      Attack {sortBy === "attack_rank" && getSortIcon("attack_rank")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        setSortBy("defense_rank")
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }}
                    >
                      Defense {sortBy === "defense_rank" && getSortIcon("defense_rank")}
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold cursor-pointer hover:bg-secondary"
                      onClick={() => {
                        setSortBy("goals_per_game")
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                      }}
                    >
                      Goals/Gm {sortBy === "goals_per_game" && getSortIcon("goals_per_game")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">xG/Gm</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Conceded</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">CS%</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Home/Away</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedTeams.map((team) => (
                    <tr
                      key={team.team_short}
                      onClick={() => handleTeamClick(team.name)}
                      className="hover:bg-secondary/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Badge variant="outline">{team.team_short}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold">{team.overall_rank}</td>
                      <td className="px-4 py-3 text-sm">{team.attack_rank}</td>
                      <td className="px-4 py-3 text-sm">{team.defense_rank}</td>
                      <td className="px-4 py-3 text-sm">{team.goals_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{team.xg_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{team.goals_conceded_per_game.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{team.clean_sheet_rate.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-xs">
                        <div>H: {team.home_goals_per_game?.toFixed(2)}</div>
                        <div>A: {team.away_goals_per_game?.toFixed(2)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Squad Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{selectedTeam} Squad</CardTitle>
                <button
                  onClick={() => {
                    setSelectedTeam(null)
                    setTeamSquad([])
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </CardHeader>

              <CardContent>
                {loadingSquad ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading squad...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teamSquad.map((player, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1">
                          <p className="font-medium">{player.web_name}</p>
                          <p className="text-xs text-muted-foreground">{player.position_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{player.form.toFixed(1)} form</p>
                          <p className="text-xs text-muted-foreground">£{player.cost}m</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
