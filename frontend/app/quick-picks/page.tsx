"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Shield, Target, Star, Users, Award, DollarSign, Clock, X } from "lucide-react"

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
const getRecommendation = (player) => {
  const { points_per_game, form, position_name, attacker_score = 0, defender_score = 0, selected_by_percent, clean_sheet_rate = 0 } = player;

  const isAttacker = position_name === 'Midfielder' || position_name === 'Forward';
  const score = isAttacker ? attacker_score : defender_score;

  const categories = [
    {
      // Elite picks - only the very best
      // Attackers: 2.2+ (top tier like Gravenberch 2.43)
      // Defenders: 3.0+ (top tier from range 3.67-1.1)
      condition: (isAttacker && score >= 2.2) || (!isAttacker && score >= 3.0) || (points_per_game >= 6.0 && form >= 5.0),
      label: "⭐ Top Pick",
      className: "text-green-800 dark:text-green-200 font-medium",
    },
    {
      // Strong differentials - good score but low ownership
      // Attackers: 1.6+ | Defenders: 2.3+
      condition: ((isAttacker && score >= 1.6) || (!isAttacker && score >= 2.3)) && selected_by_percent < 15,
      label: "🎯 Differential",
      className: "text-purple-800 dark:text-purple-200 font-medium",
    },
    {
      // Solid options - above average
      // Attackers: 1.5+ | Defenders: 2.0+
      condition: (isAttacker && score >= 1.5) || (!isAttacker && score >= 2.0),
      label: "📊 Solid Choice",
      className: "text-blue-800 dark:text-blue-200 font-medium",
    },
    {
      // Average - needs monitoring
      // Attackers: 1.0+ | Defenders: 1.5+
      condition: (isAttacker && score >= 1.0) || (!isAttacker && score >= 1.5),
      label: "🔍 Monitor",
      className: "text-orange-800 dark:text-orange-200 font-medium",
    },
    {
      // Below average - risky pick
      // Attackers: <1.0 | Defenders: <1.5
      condition: (isAttacker && score < 1.0) || (!isAttacker && score < 1.5),
      label: "⚠️ Risky",
      className: "text-yellow-800 dark:text-yellow-200 font-medium",
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
      className: "text-purple-800 dark:text-purple-200",
    },
    {
      condition: ownership >= 10 && ownership < 30,
      label: "🔹 Low Owned",
      className: "text-blue-800 dark:text-blue-200",
    },
    {
      condition: ownership >= 30 && ownership < 60,
      label: "⚖️ Moderate",
      className: "text-gray-800 dark:text-gray-200",
    },
    {
      condition: ownership >= 60 && ownership < 80,
      label: "📈 Popular",
      className: "text-orange-800 dark:text-orange-200",
    },
    {
      condition: ownership >= 80,
      label: "🏆 Template",
      className: "text-green-800 dark:text-green-200",
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
  const [selectedTeams, setSelectedTeams] = useState([]) // Team filter state

  // START: Added fetchData for reuse
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const resAttacking = await fetch(`${API_BASE_URL}/api/top-attacking_qp`, { cache: 'no-store' })
      if (!resAttacking.ok) throw new Error('Failed to fetch attacking picks')
      const dataAttacking = await resAttacking.json()
      const transformedAttacking = dataAttacking.map(team => ({
        team: team.team,
        teamCode: team.short_name || team.team.substring(0, 3).toUpperCase(),
        attackRank: team.attack_rank,
        attackStrength: team.attack_strength,
        players: team.players.map(player => ({
          name: player.web_name,
          position: player.position_name,
          position_name: player.position_name, // For recommendation function
          price: player.now_cost,
          goals_pg: player.goals_per_game || 0,
          assists_pg: player.assists_per_game || 0,
          points_pg: player.points_per_game,
          points_per_game: player.points_per_game, // For recommendation function
          ownership: player.selected_by_percent,
          selected_by_percent: player.selected_by_percent, // For recommendation function
          attacker_score: player.attacker_score || 0,
          defender_score: 0, // Not applicable for attacking players
          form: player.form ?? 5.0,
          clean_sheet_rate: 0 // Not applicable for attacking players
        }))
      }))
      setAttackingPicks(transformedAttacking)

      const resDefensive = await fetch(`${API_BASE_URL}/api/top-defensive_qp`, { cache: 'no-store' })
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
          position_name: player.position_name, // For recommendation function
          price: player.now_cost,
          cs_rate: player.clean_sheet_rate,
          clean_sheet_rate: player.clean_sheet_rate, // For recommendation function
          points_pg: player.points_per_game,
          points_per_game: player.points_per_game, // For recommendation function
          ownership: player.selected_by_percent,
          selected_by_percent: player.selected_by_percent, // For recommendation function
          defender_score: player.defender_score || 0,
          attacker_score: 0, // Not applicable for defensive players
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
  // END: Added fetchData

  // CHANGED: Added activeTab dependency
  useEffect(() => {
    fetchData()
    setSelectedTeams([]) // Clear filters when switching tabs
  }, [activeTab])

  // Filter picks based on selected teams
  const filteredPicks = useMemo(() => {
    const picks = activeTab === "attacking" ? attackingPicks : defensivePicks;
    if (!picks || picks.length === 0) return [];
    if (selectedTeams.length === 0) return picks;
    return picks.filter(teamData => selectedTeams.includes(teamData.team));
  }, [attackingPicks, defensivePicks, activeTab, selectedTeams]);

  // Get all unique teams from current tab
  const allTeams = useMemo(() => {
    const picks = activeTab === "attacking" ? attackingPicks : defensivePicks;
    if (!picks || picks.length === 0) return [];
    return picks.map(t => t.team).sort(); // Sort alphabetically
  }, [attackingPicks, defensivePicks, activeTab]);

  const toggleTeamFilter = (team) => {
    setSelectedTeams(prev => 
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  };

  // CHANGED: Added retry button to error state
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      Error: {error}
      <button
        onClick={() => fetchData()}
        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Retry
      </button>
    </div>
  )

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
          {/* Mobile Tabs with better touch targets */}
          <TabsList className="w-full grid grid-cols-2 gap-3 bg-transparent p-0 sm:gap-2">
            <TabsTrigger
              value="attacking"
              className="flex items-center justify-center gap-2 text-sm sm:text-base px-4 py-4 sm:py-3 rounded-xl transition-all duration-300 active:scale-95 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white border-2 data-[state=active]:border-red-400 data-[state=inactive]:border-border data-[state=inactive]:bg-card/50"
            >
              <Target className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="font-semibold">Attacking</span>
            </TabsTrigger>
            <TabsTrigger
              value="defensive"
              className="flex items-center justify-center gap-2 text-sm sm:text-base px-4 py-4 sm:py-3 rounded-xl transition-all duration-300 active:scale-95 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white border-2 data-[state=active]:border-blue-400 data-[state=inactive]:border-border data-[state=inactive]:bg-card/50"
            >
              <Shield className="h-5 w-5 sm:h-4 sm:w-4" />
              <span className="font-semibold">Defensive</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attacking" className="space-y-6">
            {/* Team Filter */}
            {allTeams.length > 0 && (
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-card shadow-lg">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-semibold text-foreground">Filter by Team</span>
                      </div>
                      {selectedTeams.length > 0 && (
                        <button
                          onClick={() => setSelectedTeams([])}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allTeams.map(team => (
                        <button
                          key={team}
                          onClick={() => toggleTeamFilter(team)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedTeams.includes(team)
                              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 scale-105'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary hover:scale-105 border border-border'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {team}
                            {selectedTeams.includes(team) && (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedTeams.length > 0 && (
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/30 px-3 py-2 rounded-md">
                        <Shield className="h-3.5 w-3.5" />
                        Showing {filteredPicks.length} of {allTeams.length} teams
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                {filteredPicks.map((teamData, index) => (
                  <div
                    key={`${teamData.team}-${teamData.attack_rank}-${index}`} // Use composite key for uniqueness
                    className="border-l-4 border-l-red-500 pl-6"
                  >
                    {/* Team Header */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-600 font-bold text-sm">
                          #{teamData.attackRank}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{teamData.team}</h3>
                          <p className="text-sm text-muted-foreground">
                            Attack Strength: <span className="font-mono font-medium">{teamData.attackStrength?.toFixed(3) || 'N/A'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Players Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {teamData.players.map((player, playerIndex) => {
                        const ownershipCat = getOwnershipCategory(player.ownership)
                        const recommendation = getRecommendation(player)
                        const isTopPick = recommendation.label.includes("Top Pick")
                        
                        return (
                          <Card
                            key={`${player.web_name}-${playerIndex}`}
                            className={`relative border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden ${
                              isTopPick
                                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 via-card to-card'
                                : 'border-border/50 hover:border-red-400/50 bg-gradient-to-br from-card to-secondary/10'
                            }`}
                          >
                            {/* Top indicator bar */}
                            {isTopPick && (
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
                            )}
                            
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-foreground">{player.name}</h4>
                                  <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md">
                                    <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                    <span className="font-mono text-sm font-bold text-green-600 dark:text-green-400">
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
                                  <span className="font-mono font-medium text-red-600">{player.goals_pg?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Points/Game:</span>
                                  <span className="font-mono font-bold text-red-600">{player.points_pg?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Attack Score:</span>
                                  <span className="font-mono font-bold text-red-600">{player.attacker_score?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Form:</span>
                                  <span className="font-mono font-bold text-red-600">{player.form?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ownership:</span>
                                  <span className={`font-mono font-medium ${ownershipCat.className}`}>
                                    {player.ownership}%
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action Indicator */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-medium">Status:</span>
                                  <Badge
                                    aria-label={`Recommendation for ${player.web_name}: ${recommendation.label}`}
                                    className={`${recommendation.className} font-semibold shadow-sm`}
                                  >
                                    {recommendation.label}
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
            {/* Team Filter */}
            {allTeams.length > 0 && (
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card shadow-lg">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-semibold text-foreground">Filter by Team</span>
                      </div>
                      {selectedTeams.length > 0 && (
                        <button
                          onClick={() => setSelectedTeams([])}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allTeams.map(team => (
                        <button
                          key={team}
                          onClick={() => toggleTeamFilter(team)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedTeams.includes(team)
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary hover:scale-105 border border-border'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {team}
                            {selectedTeams.includes(team) && (
                              <X className="h-3.5 w-3.5" />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                    {selectedTeams.length > 0 && (
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-secondary/30 px-3 py-2 rounded-md">
                        <Target className="h-3.5 w-3.5" />
                        Showing {filteredPicks.length} of {allTeams.length} teams
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

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
                {filteredPicks.map((teamData, index) => (
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
                            Defense Strength: <span className="font-mono font-medium">{teamData.defenseStrength?.toFixed(3) || 'N/A'}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Players Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {teamData.players.map((player, playerIndex) => {
                        const ownershipCat = getOwnershipCategory(player.ownership)
                        const recommendation = getRecommendation(player)
                        const isTopPick = recommendation.label.includes("Top Pick")
                        
                        return (
                          <Card
                            key={`${player.name}-${playerIndex}`}
                            className={`relative border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer overflow-hidden ${
                              isTopPick
                                ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 via-card to-card'
                                : 'border-border/50 hover:border-red-400/50 bg-gradient-to-br from-card to-secondary/10'
                            }`}
                          >
                            {/* Top indicator bar */}
                            {isTopPick && (
                              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500" />
                            )}
                            
                            <CardContent className="p-4">
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold text-foreground">{player.name}</h4>
                                  <div className="flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded-md">
                                    <DollarSign className="h-3.5 w-3.5 text-green-600" />
                                    <span className="font-mono text-sm font-bold text-green-600">
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
                                  <span className="font-mono font-bold text-blue-600">{player.points_pg?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Defender Score:</span>
                                  <span className="font-mono font-bold text-red-600">{player.defender_score?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Form:</span>
                                  <span className="font-mono font-bold text-blue-600">{player.form?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Ownership:</span>
                                  <span className={`font-mono font-medium ${ownershipCat.className}`}>
                                    {player.ownership}%
                                  </span>
                                </div>
                              </div>

                              {/* Quick Action Indicator */}
                              <div className="mt-3 pt-3 border-t border-border/50">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground font-medium">Status:</span>
                                  <Badge
                                    aria-label={`Recommendation for ${player.web_name}: ${recommendation.label}`}
                                    className={`${recommendation.className} font-semibold shadow-sm`}
                                  >
                                    {recommendation.label}
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
