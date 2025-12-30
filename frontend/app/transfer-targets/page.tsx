"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Star, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import TeamPicksModal from "@/components/team-picks-modal"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

// Team color mapping
const teamColors = {
  "Arsenal": "text-red-600 dark:text-red-400",
  "Liverpool": "text-red-700 dark:text-red-500",
  "Man City": "text-sky-500 dark:text-sky-400",
  "Chelsea": "text-blue-600 dark:text-blue-400",
  "Man Utd": "text-red-600 dark:text-red-400",
  "Spurs": "text-slate-700 dark:text-slate-300",
  "Newcastle": "text-slate-800 dark:text-slate-200",
  "Brighton": "text-blue-500 dark:text-blue-300",
  "Aston Villa": "text-purple-700 dark:text-purple-400",
  "West Ham": "text-amber-700 dark:text-amber-500",
  "Everton": "text-blue-700 dark:text-blue-500",
  "Wolves": "text-orange-600 dark:text-orange-400",
  "Crystal Palace": "text-blue-600 dark:text-blue-400",
  "Brentford": "text-red-600 dark:text-red-400",
  "Fulham": "text-slate-800 dark:text-slate-300",
  "Bournemouth": "text-red-700 dark:text-red-500",
  "Nott'm Forest": "text-red-800 dark:text-red-600",
  "Burnley": "text-purple-900 dark:text-purple-400",
  "Leeds": "text-blue-600 dark:text-blue-400",
  "Sunderland": "text-red-700 dark:text-red-500",
}

const getTeamColor = (teamName: string) => {
  return teamColors[teamName as keyof typeof teamColors] || "text-foreground"
}

const getTeamBackgroundColor = (teamName: string) => {
  const bgColors = {
    "Arsenal": "bg-red-100 dark:bg-red-950",
    "Liverpool": "bg-red-200 dark:bg-red-950",
    "Man City": "bg-sky-100 dark:bg-sky-950",
    "Chelsea": "bg-blue-100 dark:bg-blue-950",
    "Man Utd": "bg-red-100 dark:bg-red-950",
    "Spurs": "bg-slate-100 dark:bg-slate-900",
    "Newcastle": "bg-slate-200 dark:bg-slate-900",
    "Brighton": "bg-blue-50 dark:bg-blue-950",
    "Aston Villa": "bg-purple-100 dark:bg-purple-950",
    "West Ham": "bg-amber-100 dark:bg-amber-950",
    "Everton": "bg-blue-200 dark:bg-blue-950",
    "Wolves": "bg-orange-100 dark:bg-orange-950",
    "Crystal Palace": "bg-blue-100 dark:bg-blue-950",
    "Brentford": "bg-red-100 dark:bg-red-950",
    "Fulham": "bg-slate-100 dark:bg-slate-900",
    "Bournemouth": "bg-red-200 dark:bg-red-950",
    "Nott'm Forest": "bg-red-300 dark:bg-red-950",
    "Burnley": "bg-purple-200 dark:bg-purple-950",
    "Leeds": "bg-blue-100 dark:bg-blue-950",
    "Sunderland": "bg-red-200 dark:bg-red-950",
  }
  return bgColors[teamName as keyof typeof bgColors] || "bg-secondary/20"
}

export default function TransferTargetsPage() {
  const [teamFixtureSummary, setTeamFixtureSummary] = useState<any[]>([])
  const [attackingPicks, setAttackingPicks] = useState<any[]>([])
  const [defensivePicks, setDefensivePicks] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, attackingPicksRes, defensivePicksRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/team_fixtures`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/top-attacking_qp`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/top-defensive_qp`, { cache: 'no-store' })
        ])

        if (!summaryRes.ok) throw new Error('Failed to fetch team fixtures')

        const dataSummary = await summaryRes.json()
        const transformedSummary = dataSummary.map((t: any) => ({
          team: t.team,
          nearTermHomeFixtures: t.near_term_home_fixtures,
          mediumTermHomeFixtures: t.medium_term_home_fixtures,
          nearTermRating: t.near_term_rating,
          mediumTermRating: t.medium_term_rating,
          fixtureSwing: t.fixture_swing,
          swingCategory: t.swing_category,
          swingEmoji: t.swing_emoji,
          formContext: t.form_context,
          avgAttackDiff: t.avg_attack_difficulty,
          avgDefenseDiff: t.avg_defense_difficulty,
        }))
        setTeamFixtureSummary(transformedSummary)

        // Quick Picks data
        if (attackingPicksRes.ok) {
          const attackingData = await attackingPicksRes.json()
          setAttackingPicks(attackingData)
        }
        if (defensivePicksRes.ok) {
          const defensiveData = await defensivePicksRes.json()
          setDefensivePicks(defensiveData)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Handler to open Quick Picks modal for a team
  const handleViewPicks = (teamName: string) => {
    setSelectedTeam({ name: teamName })
    setIsModalOpen(true)
  }

  // Get Quick Picks data for selected team
  const getTeamPicksData = (teamName: string) => {
    const normalizedName = teamName.trim().toLowerCase()
    const attackingTeam = attackingPicks.find((t: any) => t.team.trim().toLowerCase() === normalizedName)
    const defensiveTeam = defensivePicks.find((t: any) => t.team.trim().toLowerCase() === normalizedName)
    
    return {
      attackingPlayers: attackingTeam?.players?.map((p: any) => ({
        name: p.web_name,
        position: p.position_name,
        position_name: p.position_name,
        price: p.now_cost,
        goals_pg: p.goals_per_game || 0,
        assists_pg: p.assists_per_game || 0,
        points_pg: p.points_per_game,
        points_per_game: p.points_per_game,
        ownership: p.selected_by_percent,
        selected_by_percent: p.selected_by_percent,
        attacker_score: p.attacker_score || 0,
        defender_score: 0,
        form: p.form ?? 5.0,
        clean_sheet_rate: 0
      })) || [],
      defensivePlayers: defensiveTeam?.players?.map((p: any) => ({
        name: p.web_name,
        position: p.position_name,
        position_name: p.position_name,
        price: p.now_cost,
        cs_rate: p.clean_sheet_rate,
        clean_sheet_rate: p.clean_sheet_rate,
        points_pg: p.points_per_game,
        points_per_game: p.points_per_game,
        ownership: p.selected_by_percent,
        selected_by_percent: p.selected_by_percent,
        defender_score: p.defender_score || 0,
        attacker_score: 0,
        form: p.form ?? 5.0
      })) || []
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-72 bg-secondary/50 rounded-lg animate-pulse mb-2"></div>
            <div className="h-6 w-96 bg-secondary/30 rounded-lg animate-pulse"></div>
          </div>
          <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="h-24 bg-secondary/30 rounded-lg animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-border/50 mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-8 bg-secondary/30 rounded-lg animate-pulse w-64"></div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      {[1, 2, 3, 4, 5].map((j) => (
                        <div key={j} className="h-20 bg-secondary/20 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error: {error}
        <button
          onClick={() => window.location.reload()}
          className="ml-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <RefreshCw className="h-8 w-8 text-green-500 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-green-600 bg-clip-text text-transparent">
              Transfer Targets
            </span>
          </h1>
          <p className="text-lg text-muted-foreground animate-in fade-in slide-in-from-left duration-700" style={{ animationDelay: '200ms' }}>
            Strategic fixture analysis across two periods to identify optimal transfer targets
          </p>
        </div>

        {/* Key Insights */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-green-500/50 bg-gradient-to-br from-green-500/10 to-card hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-left">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-8 w-8 text-green-500 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Best Improvement</p>
                  <p className="text-xl font-bold text-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors duration-200">
                    {[...teamFixtureSummary].sort((a, b) => b.fixtureSwing - a.fixtureSwing)[0]?.team || 'N/A'}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                    +{[...teamFixtureSummary].sort((a, b) => b.fixtureSwing - a.fixtureSwing)[0]?.fixtureSwing || 0}% easier
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50 bg-gradient-to-br from-red-500/10 to-card hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/20 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <TrendingDown className="h-8 w-8 text-red-500 animate-pulse" style={{ animationDelay: '500ms' }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Biggest Decline</p>
                  <p className="text-xl font-bold text-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200">
                    {[...teamFixtureSummary].sort((a, b) => a.fixtureSwing - b.fixtureSwing)[0]?.team || 'N/A'}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">
                    {[...teamFixtureSummary].sort((a, b) => a.fixtureSwing - b.fixtureSwing)[0]?.fixtureSwing || 0}% harder
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-card hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-right" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/20 rounded-full group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-8 w-8 text-blue-500 animate-pulse" style={{ animationDelay: '1000ms' }} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams Analyzed</p>
                  <p className="text-xl font-bold text-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">{teamFixtureSummary.length}</p>
                  <p className="text-xs text-muted-foreground">Next 6 gameweeks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fixture Period Comparison */}
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-card backdrop-blur-md shadow-xl mb-8">
          <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                📊
              </div>
              Fixture Difficulty by Period
              <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Next 6 GWs
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Compare team fixture quality across two periods. Higher percentage = easier fixtures. Click "View Players" to see recommended players from each team.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Near-term: Next 3 Gameweeks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 animate-in fade-in slide-in-from-left duration-500">
                    🔥 Next 3 Gameweeks
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">(Immediate Priority)</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {[...teamFixtureSummary]
                    .sort((a, b) => b.nearTermRating - a.nearTermRating)
                    .map((team, index) => {
                      return (
                        <div
                          key={index}
                          style={{ animationDelay: `${index * 50}ms` }}
                          className={`p-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 ${getTeamBackgroundColor(team.team)} 
                            hover:scale-[1.02] hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-600
                            transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom
                            group cursor-pointer`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-xs font-bold text-muted-foreground w-6 group-hover:scale-110 transition-transform duration-200">#{index + 1}</span>
                              <span className="font-semibold text-sm text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">{team.team}</span>
                            </div>
                            <span className={`font-bold text-lg ${getTeamColor(team.team)} group-hover:scale-110 transition-transform duration-200`}>
                              {team.nearTermRating}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs flex-wrap">
                              <span className="text-muted-foreground px-2 py-1 bg-secondary/50 rounded-md">🏠 {team.nearTermHomeFixtures} home</span>
                              <span className={`font-semibold px-2 py-1 rounded-md transition-all duration-200 hover:scale-105 ${
                                team.avgAttackDiff > 2 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : team.avgAttackDiff < -2 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`} title="Attack Difficulty">
                                ⚔️ {team.avgAttackDiff > 0 ? '+' : ''}{team.avgAttackDiff?.toFixed(1)}
                              </span>
                              <span className={`font-semibold px-2 py-1 rounded-md transition-all duration-200 hover:scale-105 ${
                                team.avgDefenseDiff > 2 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                                  : team.avgDefenseDiff < -2 
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' 
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`} title="Defense Difficulty">
                                🛡️ {team.avgDefenseDiff > 0 ? '+' : ''}{team.avgDefenseDiff?.toFixed(1)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleViewPicks(team.team)}
                              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-[11px] font-semibold rounded-md transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 whitespace-nowrap"
                            >
                              View Players
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>

              {/* Medium-term: Following 3 Gameweeks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    📅 Following 3 Gameweeks
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">(Plan Ahead)</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {[...teamFixtureSummary]
                    .sort((a, b) => b.mediumTermRating - a.mediumTermRating)
                    .map((team, index) => {
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 ${getTeamBackgroundColor(team.team)} hover:scale-[1.01] transition-all`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-xs font-bold text-muted-foreground w-6">#{index + 1}</span>
                              <span className="font-semibold text-sm text-foreground truncate">{team.team}</span>
                              {team.fixtureSwing > 0 && (
                                <span className="text-green-600 dark:text-green-400 text-lg font-bold" title="Fixtures improving">↑</span>
                              )}
                              {team.fixtureSwing < 0 && (
                                <span className="text-red-600 dark:text-red-400 text-lg font-bold" title="Fixtures declining">↓</span>
                              )}
                            </div>
                            <span className={`font-bold text-lg ${getTeamColor(team.team)}`}>
                              {team.mediumTermRating}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">🏠 {team.mediumTermHomeFixtures} home</span>
                              <span className="text-muted-foreground">•</span>
                              <span className={`font-semibold ${team.avgAttackDiff > 2 ? 'text-green-600 dark:text-green-400' : team.avgAttackDiff < -2 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                ⚔️ {team.avgAttackDiff > 0 ? '+' : ''}{team.avgAttackDiff?.toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className={`font-semibold ${team.avgDefenseDiff > 2 ? 'text-green-600 dark:text-green-400' : team.avgDefenseDiff < -2 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                🛡️ {team.avgDefenseDiff > 0 ? '+' : ''}{team.avgDefenseDiff?.toFixed(1)}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className={team.fixtureSwing > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : team.fixtureSwing < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>
                                {team.swingEmoji} {team.fixtureSwing > 0 ? '+' : ''}{team.fixtureSwing}%
                              </span>
                            </div>
                            <button
                              onClick={() => handleViewPicks(team.team)}
                              className="px-3 py-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-[11px] font-semibold rounded-md transition-all duration-200 hover:shadow-lg active:scale-95 whitespace-nowrap"
                            >
                              View Player Picks
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Biggest Movers */}
        <Card className="border-border/50 bg-card backdrop-blur-md shadow-lg">
          <CardHeader className="pb-4 border-b border-border/50">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                🔄
              </div>
              Biggest Fixture Swings
              <Badge variant="secondary" className="ml-auto text-xs">
                Priority Transfers
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Teams with the largest fixture difficulty changes between periods. Green = Buy targets, Red = Sell candidates.
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...teamFixtureSummary]
                .sort((a, b) => Math.abs(b.fixtureSwing) - Math.abs(a.fixtureSwing))
                .slice(0, 12)
                .map((team, index) => {
                  const isImproving = team.fixtureSwing > 0
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                        isImproving
                          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40'
                          : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm text-foreground">{team.team}</span>
                        <Badge className={isImproving 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }>
                          {team.swingEmoji} {team.fixtureSwing > 0 ? '+' : ''}{team.fixtureSwing}%
                        </Badge>
                      </div>
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Next 3 GWs</span>
                          <span className={`font-semibold ${getTeamColor(team.team)}`}>
                            {team.nearTermRating}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Following 3 GWs</span>
                          <span className={`font-semibold ${getTeamColor(team.team)}`}>
                            {team.mediumTermRating}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {isImproving ? '📈 BUY: Fixtures easing' : '📉 SELL: Fixtures toughening'}
                        </p>
                        <button
                          onClick={() => handleViewPicks(team.team)}
                          className="py-1 px-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white text-[11px] font-semibold rounded-md transition-all duration-200 hover:shadow-lg active:scale-95 whitespace-nowrap"
                        >
                          View Player Picks
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Picks Modal */}
      {selectedTeam && (
        <TeamPicksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          teamName={selectedTeam.name}
          teamCode={selectedTeam.name.substring(0, 3).toUpperCase()}
          {...getTeamPicksData(selectedTeam.name)}
        />
      )}
    </div>
  )
}
