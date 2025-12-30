"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Crosshair, TrendingUp, TrendingDown, Shield, TrophyIcon, Search, X, Filter, ArrowUpDown, Star } from "lucide-react"
import TeamPicksModal from "@/components/team-picks-modal"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

// Rank Medal Component
const RankMedal = ({ rank }: { rank: number }) => {
  if (rank > 3) return null;
  
  const medals = {
    1: { emoji: "🥇", color: "from-yellow-400 to-yellow-600", glow: "shadow-yellow-500/50" },
    2: { emoji: "🥈", color: "from-gray-300 to-gray-500", glow: "shadow-gray-500/50" },
    3: { emoji: "🥉", color: "from-orange-400 to-orange-600", glow: "shadow-orange-500/50" }
  };
  
  const medal = medals[rank as keyof typeof medals];
  
  return (
    <div className={`flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br ${medal.color} ${medal.glow} shadow-lg text-base`}>
      {medal.emoji}
    </div>
  );
};

export default function TeamRankingsPage() {
  const [view, setView] = useState<"attack" | "defense" | "combined">("combined")
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // New: Filter and search states
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMode, setFilterMode] = useState<"all" | "top5" | "bottom5">("all")
  const [sortBy, setSortBy] = useState<"rank" | "attack" | "defense" | "goals" | "cleansheets">("rank")
  
  // Quick Picks states
  const [attackingPicks, setAttackingPicks] = useState([])
  const [defensivePicks, setDefensivePicks] = useState([])
  const [selectedTeam, setSelectedTeam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // START: Added fetchData for reuse
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [overallRes, attackRes, defenseRes, attackingPicksRes, defensivePicksRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/overall_rankings`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/attack_rankings`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/defense_rankings`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/top-attacking_qp`, { cache: 'no-store' }),
        fetch(`${API_BASE_URL}/api/top-defensive_qp`, { cache: 'no-store' })
      ])

      if (!overallRes.ok || !attackRes.ok || !defenseRes.ok) {
        throw new Error('Failed to fetch rankings')
      }

      const overall = await overallRes.json()
      const attack = await attackRes.json()
      const defense = await defenseRes.json()
      
      // Quick Picks data
      if (attackingPicksRes.ok) {
        const attackingData = await attackingPicksRes.json()
        setAttackingPicks(attackingData)
      }
      if (defensivePicksRes.ok) {
        const defensiveData = await defensivePicksRes.json()
        setDefensivePicks(defensiveData)
      }

      const attackMap = new Map(attack.map(t => [t.team, t]))
      const defenseMap = new Map(defense.map(t => [t.team, t]))

      const maxGoalsPerGame = Math.max(...overall.map(t => t.goals_per_game))
      const maxCleanSheetPct = Math.max(...overall.map(t => t.clean_sheet_rate)) * 100
      const maxOverallStrength = Math.max(...overall.map(t => t.overall_strength))
      
      // Calculate max values for proper scaling
      const maxAttackStrength = Math.max(...attack.map(t => t.attack_strength || 0))
      const maxDefenseStrength = Math.max(...defense.map(t => t.defense_strength || 0))

      const mergedTeams = overall.map(o => {
        const a = attackMap.get(o.team) || {}
        const d = defenseMap.get(o.team) || {}
        return {
          name: o.team,
          code: o.team_short,
          attackRank: a.attack_rank || 'N/A',
          defenseRank: d.defense_rank || 'N/A',
          goalsPerGame: o.goals_per_game,
          xGPerGame: o.expected_goals_per_game,
          cleanSheetPct: o.clean_sheet_rate * 100,
          goalsConceded: o.goals_conceded_per_game,
          attackStrength: a.attack_strength || 0,
          defenseStrength: d.defense_strength || 0,
          // Scale attack and defense strength as percentages of their respective maxes
          attackStrengthPct: ((a.attack_strength || 0) / maxAttackStrength) * 100,
          defenseStrengthPct: ((d.defense_strength || 0) / maxDefenseStrength) * 100,
          attackScore: Math.round((o.goals_per_game / maxGoalsPerGame) * 100),
          defenseScore: Math.round((o.clean_sheet_rate * 100) / maxCleanSheetPct * 100),
          overallStrength: Math.round((o.overall_strength / maxOverallStrength) * 100)
        }
      })

      setTeams(mergedTeams)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  // END: Added fetchData

  // CHANGED: Added view dependency
  useEffect(() => {
    fetchData()
  }, [view])

  // Handler to open Quick Picks modal for a team
  const handleViewPicks = (team: any) => {
    setSelectedTeam(team)
    setIsModalOpen(true)
  }

  // Get Quick Picks data for selected team
  const getTeamPicksData = (teamName: string) => {
    // Normalize team name for matching (trim and case-insensitive)
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


  const TeamBadge = ({ team }) => {
    const colors = {
      ARS: "bg-[#C8102E] text-white border-[#A00D24]",       // Arsenal - red & white
      AVL: "bg-[#7A003C] text-[#95BFE5] border-[#5A002A]",   // Aston Villa - claret & sky blue
      BOU: "bg-[#DA291C] text-white border-[#000000]",       // Bournemouth - red & black
      BRE: "bg-[#E30613] text-white border-[#B3000B]",       // Brentford - red & white
      BHA: "bg-[#0057B8] text-white border-[#003F87]",       // Brighton - blue & white
      BUR: "bg-[#6C1D45] text-[#8BB8E8] border-[#4A1230]",   // Burnley - claret & sky blue
      CHE: "bg-[#034694] text-white border-[#003087]",       // Chelsea - royal blue
      CRY: "bg-[#1B458F] text-[#C81E2E] border-[#143A6F]",   // Crystal Palace - blue & red
      EVE: "bg-[#003399] text-white border-[#002875]",       // Everton - royal blue
      FUL: "bg-white text-black border-[#000000]",           // Fulham - white & black
      LEE: "bg-white text-[#1D3D7B] border-[#FFCC00]",        // Leeds - white, blue & yellow
      LIV: "bg-[#C8102E] text-white border-[#A00D24]",       // Liverpool - deep red
      MCI: "bg-[#6CABDD] text-white border-[#4A90C0]",       // Man City - sky blue
      MUN: "bg-[#DA291C] text-white border-[#B3000B]",       // Man United - red
      NEW: "bg-black text-white border-[#241F20]",           // Newcastle - black & white
      NFO: "bg-[#DD0000] text-white border-[#B30000]",       // Nottingham Forest - red
      SUN: "bg-[#ED1C24] text-white border-[#C8102E]",       // Sunderland - red & white
      TOT: "bg-white text-[#132257] border-[#001C37]",       // Spurs - white & navy
      WHU: "bg-[#7A263A] text-[#F3D2B3] border-[#591C2A]",   // West Ham - claret & light blue
      WOL: "bg-[#FDB913] text-black border-[#D9A00E]",       // Wolves - gold & black
    };
    return (
      <Badge
        variant="outline"
        className={`text-xs font-sans uppercase px-2 py-0.5 rounded-lg border-dashed border-2 ${colors[team] || "bg-orange-50 text-orange-700 border-orange-500 hover:bg-orange-100 transition-all duration-200"}`}
      >
        {team}
      </Badge>
    );
  };


  const sortedTeams = [...teams].sort((a, b) => {
    if (view === "attack") return a.attackRank - b.attackRank
    if (view === "defense") return a.defenseRank - b.defenseRank
    return a.attackRank + a.defenseRank - (b.attackRank + b.defenseRank)
  })

  const teamsWithOverallRank = sortedTeams.map((team, index) => ({
    ...team,
    overallRank: view === "combined" ? index + 1 : null
  }))

  // Filter and search logic
  const filteredTeams = useMemo(() => {
    let result = [...teamsWithOverallRank];
    
    // Apply search filter
    if (searchQuery) {
      result = result.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply filter mode
    if (filterMode === "top5") {
      result = result.slice(0, 5);
    } else if (filterMode === "bottom5") {
      result = result.slice(-5).reverse();
    }
    
    // Apply sorting
    if (sortBy === "attack") {
      result.sort((a, b) => a.attackRank - b.attackRank);
    } else if (sortBy === "defense") {
      result.sort((a, b) => a.defenseRank - b.defenseRank);
    } else if (sortBy === "goals") {
      result.sort((a, b) => b.goalsPerGame - a.goalsPerGame);
    } else if (sortBy === "cleansheets") {
      result.sort((a, b) => b.cleanSheetPct - a.cleanSheetPct);
    }
    
    return result;
  }, [teamsWithOverallRank, searchQuery, filterMode, sortBy]);

  const strongestAttack = [...teams].sort((a, b) => a.attackRank - b.attackRank)[0]?.name || "Unknown"
  const bestDefense = [...teams].sort((a, b) => a.defenseRank - b.defenseRank)[0]?.name || "Unknown"
  const weakestAttack = [...teams].sort((a, b) => b.attackRank - a.attackRank)[0]?.name || "Unknown"
  const weakestDefense = [...teams].sort((a, b) => b.defenseRank - a.defenseRank)[0]?.name || "Unknown"

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading rankings...</div>
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
        <div className="mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="mb-2 text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <TrophyIcon className="h-8 w-8 text-yellow-500 animate-pulse" style={{ animationDuration: '2s' }} />
            Team Rankings
          </h1>
          <p className="text-lg text-muted-foreground animate-in fade-in slide-in-from-top duration-700" style={{ animationDelay: '200ms' }}>Attack and defense strength analysis for all 20 teams</p>
        </div>

        {/* Key Insights */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-purple-500/50 bg-card hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-left" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500 animate-pulse" style={{ animationDuration: '2s', animationDelay: '0ms' }} />
                <div>
                  <p className="text-sm text-muted-foreground">Strongest Attack</p>
                  <p className="text-xl font-bold text-foreground">{strongestAttack}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-500/50 bg-card hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-left" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-500 animate-pulse" style={{ animationDuration: '2s', animationDelay: '200ms' }} />
                <div>
                  <p className="text-sm text-muted-foreground">Best Defense</p>
                  <p className="text-xl font-bold text-foreground">{bestDefense}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/50 bg-card hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-left" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-indigo-500 animate-pulse" style={{ animationDuration: '2s', animationDelay: '400ms' }} />
                <div>
                  <p className="text-sm text-muted-foreground">Weakest Attack</p>
                  <p className="text-xl font-bold text-foreground">{weakestAttack}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-500/50 bg-card hover:shadow-lg transition-all duration-300 animate-in fade-in slide-in-from-left" style={{ animationDelay: '400ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-slate-500 animate-pulse" style={{ animationDuration: '2s', animationDelay: '600ms' }} />
                <div>
                  <p className="text-sm text-muted-foreground">Weakest Defense</p>
                  <p className="text-xl font-bold text-foreground">{weakestDefense}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Controls */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Mode */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <select
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                  className="px-4 py-2.5 rounded-lg bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                >
                  <option value="all">All Teams</option>
                  <option value="top5">Top 5</option>
                  <option value="bottom5">Bottom 5</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2.5 rounded-lg bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                >
                  <option value="rank">Overall Rank</option>
                  <option value="attack">Attack Strength</option>
                  <option value="defense">Defense Strength</option>
                  <option value="goals">Goals per Game</option>
                  <option value="cleansheets">Clean Sheet %</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || filterMode !== "all" || sortBy !== "rank") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setFilterMode("all");
                    setSortBy("rank");
                  }}
                  className="px-4 py-2.5 rounded-lg border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 font-medium active:scale-95 whitespace-nowrap"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Results Count */}
            <div className="mt-3 text-sm text-muted-foreground">
              Showing <span className="font-bold text-foreground">{filteredTeams.length}</span> of {teams.length} teams
            </div>
          </CardContent>
        </Card>

        {/* View Toggle - Mobile & Desktop */}
        <div className="mb-6">
          {/* Mobile: Horizontal Scrollable */}
          <div className="sm:hidden -mx-4 px-4">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="inline-flex gap-3 p-2 bg-secondary/50 rounded-xl min-w-max">
                <button
                  onClick={() => setView("combined")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-4 text-sm font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap ${view === "combined"
                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 border border-purple-500/20"
                    : "bg-transparent text-muted-foreground active:bg-white/20"
                    }`}
                >
                  <span className="text-lg">📊</span>
                  <span>Overall</span>
                </button>
                <button
                  onClick={() => setView("attack")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-4 text-sm font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap ${view === "attack"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20"
                    : "bg-transparent text-muted-foreground active:bg-blue-100"
                    }`}
                >
                  <span className="text-lg">⚽</span>
                  <span>Attack</span>
                </button>
                <button
                  onClick={() => setView("defense")}
                  className={`flex items-center gap-2 rounded-lg px-5 py-4 text-sm font-semibold transition-all duration-300 active:scale-95 whitespace-nowrap ${view === "defense"
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/20"
                    : "bg-transparent text-muted-foreground active:bg-indigo-100"
                    }`}
                >
                  <span className="text-lg">🛡️</span>
                  <span>Defense</span>
                </button>
              </div>
            </div>
          </div>

          {/* Desktop: Flex Layout */}
          <div className="hidden sm:flex flex-wrap gap-2 p-1 bg-secondary/50 rounded-xl">
            <button
              onClick={() => setView("combined")}
              className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${view === "combined"
                ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/25 border border-purple-500/20"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/10 active:bg-white/20"
                }`}
            >
              <span className="relative z-10">📊 Overall Rankings</span>
              {view === "combined" && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-purple-400/10 rounded-lg blur-sm" />
              )}
            </button>
            <button
              onClick={() => setView("attack")}
              className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${view === "attack"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500/20"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100"
                }`}
            >
              <span className="relative z-10">⚽ Attack Rankings</span>
              {view === "attack" && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-400/10 rounded-lg blur-sm" />
              )}
            </button>
            <button
              onClick={() => setView("defense")}
              className={`relative rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${view === "defense"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-500/20"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-indigo-50 hover:text-indigo-600 active:bg-indigo-100"
                }`}
            >
              <span className="relative z-10">🛡️ Defense Rankings</span>
              {view === "defense" && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-indigo-400/10 rounded-lg blur-sm" />
              )}
            </button>
          </div>
        </div>

        {/* Rankings Grid */}
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team, index) => {
            const teamColors = {
              ARS: "ring-2 ring-[#C8102E]/20 bg-gradient-to-br from-[#C8102E]/10 to-card",
              AVL: "ring-2 ring-[#7A003C]/20 bg-gradient-to-br from-[#7A003C]/10 to-card",
              BOU: "ring-2 ring-[#DA291C]/20 bg-gradient-to-br from-[#DA291C]/10 to-card",
              BRE: "ring-2 ring-[#E30613]/20 bg-gradient-to-br from-[#E30613]/10 to-card",
              BHA: "ring-2 ring-[#0057B8]/20 bg-gradient-to-br from-[#0057B8]/10 to-card",
              BUR: "ring-2 ring-[#6C1D45]/20 bg-gradient-to-br from-[#6C1D45]/10 to-card",
              CHE: "ring-2 ring-[#034694]/20 bg-gradient-to-br from-[#034694]/10 to-card",
              CRY: "ring-2 ring-[#1B458F]/20 bg-gradient-to-br from-[#1B458F]/10 to-card",
              EVE: "ring-2 ring-[#003399]/20 bg-gradient-to-br from-[#003399]/10 to-card",
              FUL: "ring-2 ring-black/20 bg-gradient-to-br from-white/10 to-card",
              LEE: "ring-2 ring-[#FFCC00]/20 bg-gradient-to-br from-white/10 to-card",
              LIV: "ring-2 ring-[#C8102E]/20 bg-gradient-to-br from-[#C8102E]/10 to-card",
              MCI: "ring-2 ring-[#6CABDD]/20 bg-gradient-to-br from-[#6CABDD]/10 to-card",
              MUN: "ring-2 ring-[#DA291C]/20 bg-gradient-to-br from-[#DA291C]/10 to-card",
              NEW: "ring-2 ring-black/20 bg-gradient-to-br from-black/10 to-card",
              NFO: "ring-2 ring-[#DD0000]/20 bg-gradient-to-br from-[#DD0000]/10 to-card",
              SUN: "ring-2 ring-[#ED1C24]/20 bg-gradient-to-br from-[#ED1C24]/10 to-card",
              TOT: "ring-2 ring-[#001C37]/20 bg-gradient-to-br from-white/10 to-card",
              WHU: "ring-2 ring-[#7A263A]/20 bg-gradient-to-br from-[#7A263A]/10 to-card",
              WOL: "ring-2 ring-[#FDB913]/20 bg-gradient-to-br from-[#FDB913]/10 to-card",
            };

            return (
              <Card
                key={team.code}
                className={`group border-border bg-card transition-all duration-300 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 cursor-pointer animate-in fade-in slide-in-from-bottom-4 ${teamColors[team.code] || "ring-2 ring-gray-500/20 bg-gradient-to-br from-gray-50/50 to-card"}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg transition-all duration-300 group-hover:scale-110 ${teamColors[team.code]?.split(" ")[0]} text-white shadow-lg`}
                      >
                        <TeamBadge team={team.code} />
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
                                className="text-xs transition-all duration-300 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100"
                              >
                                ATT #{team.attackRank}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="text-xs transition-all duration-300 bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-100"
                              >
                                DEF #{team.defenseRank}
                              </Badge>
                            </>
                          ) : view === "attack" ? (
                            <Badge
                              variant="outline"
                              className="text-xs transition-all duration-300 bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-100"
                            >
                              ATT #{team.attackRank}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-xs transition-all duration-300 bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-100"
                            >
                              DEF #{team.defenseRank}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {/* Rank Medal for Top 3 */}
                      {((view === "combined" && team.overallRank <= 3) ||
                        (view === "attack" && team.attackRank <= 3) ||
                        (view === "defense" && team.defenseRank <= 3)) && (
                        <RankMedal
                          rank={
                            view === "combined"
                              ? team.overallRank
                              : view === "attack"
                              ? team.attackRank
                              : team.defenseRank
                          }
                        />
                      )}
                      {view === "combined" && (
                        <>
                          <div className="text-2xl font-bold text-purple-500">#{team.overallRank}</div>
                          <div className="text-xs text-muted-foreground">Overall Rank</div>
                        </>
                      )}
                      {view === "attack" && (
                        <>
                          <div className="text-2xl font-bold text-blue-500">#{team.attackRank}</div>
                          <div className="text-xs text-muted-foreground">Attack Rank</div>
                        </>
                      )}
                      {view === "defense" && (
                        <>
                          <div className="text-2xl font-bold text-indigo-500">#{team.defenseRank}</div>
                          <div className="text-xs text-muted-foreground">Defense Rank</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* Attack Strength */}
                    <div className="group/attack">
                      <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/attack:text-blue-600 transition-colors">
                        Attack Strength
                      </p>
                      <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500 ease-out group-hover:from-blue-500 group-hover:to-blue-600"
                          style={{ width: `${team.attackStrengthPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="group-hover/attack:text-blue-600 transition-colors">
                          {team.goalsPerGame.toFixed(2)} goals/game
                        </span>
                        <span className="font-mono font-bold">{team.attackStrength.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Defense Strength */}
                    <div className="group/defense">
                      <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/defense:text-indigo-600 transition-colors">
                        Defense Strength
                      </p>
                      <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-500 ease-out group-hover:from-indigo-500 group-hover:to-indigo-600"
                          style={{ width: `${team.defenseStrengthPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="group-hover/defense:text-indigo-600 transition-colors">
                          {team.cleanSheetPct.toFixed(0)}% clean sheets
                        </span>
                        <span className="font-mono font-bold">{team.defenseStrength.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Overall Strength */}
                    <div className="group/overall">
                      <p className="mb-2 text-xs font-medium text-muted-foreground group-hover/overall:text-purple-600 transition-colors">
                        Overall Strength
                      </p>
                      <div className="mb-1 h-3 w-full overflow-hidden rounded-full bg-secondary group-hover:h-4 transition-all duration-300">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-purple-500 transition-all duration-500 ease-out group-hover:from-purple-500 group-hover:to-purple-600"
                          style={{ width: `${team.overallStrength}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="group-hover/overall:text-purple-600 transition-colors">
                          {team.overallStrength}
                        </span>
                        <span className="font-mono font-bold">{team.overallStrength}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">xG/Game</div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300">{team.xGPerGame.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg hover:shadow-md transition-all duration-300">
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Goals Conceded</div>
                      <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{team.goalsConceded.toFixed(1)}</div>
                    </div>
                  </div>
                  
                  {/* View Quick Picks Button */}
                  <div className="mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewPicks(team)
                      }}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
                    >
                      <Star className="h-4 w-4" />
                      View Quick Picks
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      
      {/* Quick Picks Modal */}
      {selectedTeam && (
        <TeamPicksModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          teamName={selectedTeam.name}
          teamCode={selectedTeam.code}
          attackRank={selectedTeam.attackRank}
          defenseRank={selectedTeam.defenseRank}
          {...getTeamPicksData(selectedTeam.name)}
        />
      )}
    </div>
  )
}
