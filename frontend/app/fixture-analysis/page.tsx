"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarIcon, Home, Plane, Search, X, Filter, Target, Shield, TrendingUp, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

// Team short codes mapping for FDR
const teamShortCodes: Record<string, string> = {
  "Arsenal": "ARS", "Aston Villa": "AVL", "Bournemouth": "BOU", "Brentford": "BRE",
  "Brighton": "BHA", "Burnley": "BUR", "Chelsea": "CHE", "Crystal Palace": "CRY",
  "Everton": "EVE", "Fulham": "FUL", "Leeds": "LEE", "Liverpool": "LIV",
  "Man City": "MCI", "Man Utd": "MUN", "Newcastle": "NEW", "Nott'm Forest": "NFO",
  "Sunderland": "SUN", "Spurs": "TOT", "West Ham": "WHU", "Wolves": "WOL"
}

// Get difficulty color based on rating (2.1-7.4 observed range, lower is easier)
// 6-tier system optimized for actual data distribution
const getDifficultyColor = (rating: number) => {
  if (rating <= 3.5) return "bg-green-500 dark:bg-green-600 text-white border-green-600 dark:border-green-500"  // Very Easy: 2.1-3.5
  if (rating <= 4.5) return "bg-green-300 dark:bg-green-700 text-green-900 dark:text-green-100 border-green-400 dark:border-green-600"  // Easy: 3.6-4.5
  if (rating <= 5.3) return "bg-yellow-300 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 border-yellow-400 dark:border-yellow-500"  // Moderate-Easy: 4.6-5.3
  if (rating <= 6.2) return "bg-orange-400 dark:bg-orange-600 text-white border-orange-500 dark:border-orange-500"  // Moderate-Hard: 5.4-6.2
  if (rating <= 7.0) return "bg-red-400 dark:bg-red-600 text-white border-red-500 dark:border-red-500"  // Hard: 6.3-7.0
  return "bg-red-600 dark:bg-red-700 text-white border-red-700 dark:border-red-600"  // Very Hard: 7.0+
}

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
};

const getTeamColor = (teamName: string) => {
  return teamColors[teamName] || "text-foreground";
};

const getTeamBorderColor = (teamName: string) => {
  const borderColors = {
    "Arsenal": "border-red-600 dark:border-red-400",
    "Liverpool": "border-red-700 dark:border-red-500",
    "Man City": "border-sky-500 dark:border-sky-400",
    "Chelsea": "border-blue-600 dark:border-blue-400",
    "Man Utd": "border-red-600 dark:border-red-400",
    "Spurs": "border-slate-700 dark:border-slate-300",
    "Newcastle": "border-slate-800 dark:border-slate-200",
    "Brighton": "border-blue-500 dark:border-blue-300",
    "Aston Villa": "border-purple-700 dark:border-purple-400",
    "West Ham": "border-amber-700 dark:border-amber-500",
    "Everton": "border-blue-700 dark:border-blue-500",
    "Wolves": "border-orange-600 dark:border-orange-400",
    "Crystal Palace": "border-blue-600 dark:border-blue-400",
    "Brentford": "border-red-600 dark:border-red-400",
    "Fulham": "border-slate-800 dark:border-slate-300",
    "Bournemouth": "border-red-700 dark:border-red-500",
    "Nott'm Forest": "border-red-800 dark:border-red-600",
    "Burnley": "border-purple-900 dark:border-purple-400",
    "Leeds": "border-blue-600 dark:border-blue-400",
    "Sunderland": "border-red-700 dark:border-red-500",
  };
  return borderColors[teamName] || "border-border";
};

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
  };
  return bgColors[teamName] || "bg-secondary/20";
};

// Color configuration for rankings and difficulty scores
const colorConfig = {
  favorability: {
    match: (favorability, teamName) =>
      favorability === teamName
        ? "bg-green-500/20 border-green-500/50"
        : "bg-red-500/20 border-red-500/50",
  },
  rank: {
    ranges: [
      {
        max: 3,
        classes:
          "bg-purple-100 text-purple-800 border-purple-300 font-bold dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700",
      },
      {
        max: 6,
        classes:
          "bg-blue-100 text-blue-800 border-blue-300 font-semibold dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-600",
      },
      {
        max: 10,
        classes:
          "bg-indigo-100 text-indigo-800 border-indigo-300 font-medium dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700",
      },
      {
        max: 15,
        classes:
          "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800/30 dark:text-slate-200 dark:border-slate-600",
      },
      {
        max: Infinity,
        classes:
          "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-600",
      },
    ],
  },
  difficulty: {
    ranges: [
      { min: 3, classes: "text-purple-600 dark:text-purple-400", emoji: "🟣" },
      { min: 1, classes: "text-blue-600 dark:text-blue-400", emoji: "🔵" },
      { min: -1, classes: "text-slate-600 dark:text-slate-400", emoji: "⚪" },
      { min: -Infinity, classes: "text-slate-700 dark:text-slate-500", emoji: "⚫" },
    ],
  },
};

// Helper function for styling rankings and difficulty
const getColorStyles = (metricType, value, context = null, returnType = "classes") => {
  const config = colorConfig[metricType];
  if (!config) return returnType === "classes" ? "text-gray-600 dark:text-gray-400" : "🔴";

  if (metricType === "difficulty") {
    const range = config.ranges.find((r) => value >= r.min);
    return range ? range[returnType] : config.ranges[config.ranges.length - 1][returnType];
  }
  if (metricType === "favorability") {
    return config.match(value, context);
  }
  if (metricType === "rank") {
    const range = config.ranges.find((r) => value <= r.max);
    return range?.classes || config.ranges[config.ranges.length - 1].classes;
  }
  return returnType === "classes" ? "text-gray-600 dark:text-gray-400" : "🔴";
};

// Helper function to get rating color and description
const getRatingDisplay = (rating: number) => {
  if (rating >= 80) {
    return {
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      borderColor: "border-purple-300 dark:border-purple-700",
      textColor: "text-purple-800 dark:text-purple-200",
      label: "Excellent",
      emoji: "🔥"
    };
  } else if (rating >= 65) {
    return {
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      borderColor: "border-blue-300 dark:border-blue-700",
      textColor: "text-blue-800 dark:text-blue-200",
      label: "Good",
      emoji: "✅"
    };
  } else if (rating >= 45) {
    return {
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-800/30",
      borderColor: "border-slate-300 dark:border-slate-700",
      textColor: "text-slate-800 dark:text-slate-200",
      label: "Neutral",
      emoji: "➖"
    };
  } else if (rating >= 25) {
    return {
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
      borderColor: "border-indigo-300 dark:border-indigo-700",
      textColor: "text-indigo-800 dark:text-indigo-200",
      label: "Difficult",
      emoji: "⚠️"
    };
  } else {
    return {
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-100 dark:bg-slate-900/30",
      borderColor: "border-slate-300 dark:border-slate-700",
      textColor: "text-red-800 dark:text-red-200",
      label: "Very Difficult",
      emoji: "❌"
    };
  }
};

// FDR Grid Component
interface Fixture {
  gameweek: number
  home_team: string
  away_team: string
}

interface TeamFixtures {
  team: string
  fixtures: {
    gameweek: number
    opponent: string
    isHome: boolean
    difficulty: number
  }[]
  avgDifficulty?: number
}

function FDRGrid({ fixtures }: { fixtures: any[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"team" | "difficulty">("difficulty")
  const [currentGW, setCurrentGW] = useState(1)
  const [fdrType, setFdrType] = useState<"attack" | "defense" | "overall">("overall")

  // Process fixtures into team-based view
  const teamFixtures = useMemo((): TeamFixtures[] => {
    // Find current GW
    const gameweeks = fixtures.map(f => f.gw)
    const minGW = gameweeks.length > 0 ? Math.min(...gameweeks) : 1
    if (currentGW === 1) setCurrentGW(minGW)

    const teams = new Set<string>()
    fixtures.forEach(f => {
      teams.add(f.teams.home.team)
      teams.add(f.teams.away.team)
    })

    const result: TeamFixtures[] = Array.from(teams).map(team => {
      const teamFix = fixtures
        .filter(f => (f.teams.home.team === team || f.teams.away.team === team) && f.gw >= (currentGW || minGW))
        .sort((a, b) => a.gw - b.gw)
        .slice(0, 8)
        .map(f => {
          const isHome = f.teams.home.team === team
          // Use team-specific FDR rating (1-10 scale, lower = easier)
          // Select attack or defense FDR based on fdrType
          const difficulty = isHome 
            ? (f.teams?.home?.fdr?.[fdrType] || 5)
            : (f.teams?.away?.fdr?.[fdrType] || 5)
          return {
            gameweek: f.gw,
            opponent: isHome ? f.teams.away.team : f.teams.home.team,
            isHome,
            difficulty: Math.max(1, Math.min(10, difficulty))
          }
        })

      const avgDifficulty = teamFix.length > 0
        ? teamFix.reduce((sum, f) => sum + f.difficulty, 0) / teamFix.length
        : 10

      return { team, fixtures: teamFix, avgDifficulty }
    })

    return result
  }, [fixtures, currentGW, fdrType])

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    let filtered = teamFixtures

    if (searchQuery) {
      filtered = filtered.filter(t =>
        t.team.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (sortBy === "difficulty") {
      filtered = [...filtered].sort((a, b) => {
        const aAvg = a.avgDifficulty || 10
        const bAvg = b.avgDifficulty || 10
        return aAvg - bAvg
      })
    } else {
      filtered = [...filtered].sort((a, b) => a.team.localeCompare(b.team))
    }

    return filtered
  }, [teamFixtures, searchQuery, sortBy])

  return (
    <>
      {/* FDR Type Selector with Scale */}
      <Card className="mb-3 shadow-md">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-medium text-muted-foreground">FDR:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFdrType("overall")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    fdrType === "overall"
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  📊 Overall
                </button>
                <button
                  onClick={() => setFdrType("attack")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    fdrType === "attack"
                      ? "bg-purple-600 text-white shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  ⚔️ Attack
                </button>
                <button
                  onClick={() => setFdrType("defense")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    fdrType === "defense"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  🛡️ Defense
                </button>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-0.5">
                <div className="h-6 flex-1 bg-green-500 dark:bg-green-600 rounded-l"></div>
                <div className="h-6 flex-1 bg-green-300 dark:bg-green-700"></div>
                <div className="h-6 flex-1 bg-yellow-300 dark:bg-yellow-600"></div>
                <div className="h-6 flex-1 bg-orange-400 dark:bg-orange-600"></div>
                <div className="h-6 flex-1 bg-red-400 dark:bg-red-600"></div>
                <div className="h-6 flex-1 bg-red-600 dark:bg-red-700 rounded-r"></div>
              </div>
              <div className="flex items-center gap-2 text-xs flex-shrink-0">
                <span className="text-muted-foreground">✅ Easy</span>
                <span className="text-muted-foreground">⚠️ Hard</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FDR Grid */}
      <div className="space-y-3">
        {filteredTeams.map((team, index) => (
          <Card
            key={team.team}
            className={`border-2 ${getTeamBorderColor(team.team)} ${getTeamBackgroundColor(team.team)} hover:shadow-xl transition-all duration-300`}
          >
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-full sm:w-48 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs font-bold px-2 py-1 ${getTeamBorderColor(team.team)}`}>
                      {teamShortCodes[team.team] || team.team.substring(0, 3).toUpperCase()}
                    </Badge>
                    <h3 className={`font-bold ${getTeamColor(team.team)}`}>{team.team}</h3>
                  </div>
                  {team.avgDifficulty && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Avg: {team.avgDifficulty.toFixed(1)}
                    </p>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {team.fixtures.length === 0 ? (
                    <div className="col-span-4 sm:col-span-8 text-center text-sm text-muted-foreground py-2">
                      No fixtures available
                    </div>
                  ) : (
                    team.fixtures.map((fixture, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105 hover:shadow-md ${getDifficultyColor(fixture.difficulty)}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold opacity-70">GW{fixture.gameweek}</span>
                          {fixture.isHome ? (
                            <Home className="h-3 w-3 opacity-70" />
                          ) : (
                            <Plane className="h-3 w-3 opacity-70" />
                          )}
                        </div>
                        <div className="text-xs font-bold truncate">
                          {teamShortCodes[fixture.opponent] || fixture.opponent.substring(0, 3).toUpperCase()}
                        </div>
                        <div className="text-[10px] opacity-70 mt-1">
                          {fixture.difficulty.toFixed(1)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-12 text-center text-muted-foreground">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-lg font-medium mb-2">No teams found</p>
            <p className="text-sm">Try adjusting your search query</p>
          </CardContent>
        </Card>
      )}
    </>
  )
}

export default function FixtureAnalysisPage() {
  const [gameweek, setGameweek] = useState(null);
  const [activeTab, setActiveTab] = useState("fixtures");
  const [sortBy, setSortBy] = useState("overall");
  const [sortOrder, setSortOrder] = useState("desc");
  const [fixtures, setFixtures] = useState([]);
  const [fixtureOpportunities, setFixtureOpportunities] = useState({ attack: [], defense: [] });
  const [teamFixtureSummary, setTeamFixtureSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="h-10 w-72 bg-secondary/50 rounded-lg animate-pulse mb-2"></div>
          <div className="h-6 w-96 bg-secondary/30 rounded-lg animate-pulse"></div>
        </div>
        <div className="mb-6">
          <div className="h-16 bg-secondary/30 rounded-xl animate-pulse"></div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-secondary/30 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch fixtures
        const resFixtures = await fetch(`${API_BASE_URL}/api/fixtures`, { cache: 'no-store' })
        if (!resFixtures.ok) throw new Error("Failed to fetch fixtures");
        const dataFixtures = await resFixtures.json();
        const gameweeks = dataFixtures.map((f) => f.gameweek).filter((gw) => typeof gw === "number" && !isNaN(gw));
        const minGameweek = gameweeks.length > 0 ? Math.min(...gameweeks) : 1;
        setGameweek(minGameweek);
        const transformedFixtures = dataFixtures.map((f) => {
        const homeAvgRating = (f.home_team.attacking_fixture_rating + f.home_team.defensive_fixture_rating) / 2;
        const awayAvgRating = (f.away_team.attacking_fixture_rating + f.away_team.defensive_fixture_rating) / 2;
        let favorability;
        if (homeAvgRating > awayAvgRating + 10) {
          favorability = f.home_team.name;
        } else if (awayAvgRating > homeAvgRating + 10) {
          favorability = f.away_team.name;
        } else {
          favorability = "Neutral";
        }
        return {
          gw: f.gameweek,
          fixture: f.fixture,
          home_team: f.home_team?.name || f.home_team,
          away_team: f.away_team?.name || f.away_team,
          teams: {
            home: {
              team: f.home_team.name,
              attackRating: f.home_team.attacking_fixture_rating,
              defenseRating: f.home_team.defensive_fixture_rating,
              rank: f.home_team.rank,
              fdr: f.home_team.fdr
            },
            away: {
              team: f.away_team.name,
              attackRating: f.away_team.attacking_fixture_rating,
              defenseRating: f.away_team.defensive_fixture_rating,
              rank: f.away_team.rank,
              fdr: f.away_team.fdr
            },
          },
          favorability,
          maxOpportunityRating: Math.max(
            f.home_team.attacking_fixture_rating,
            f.home_team.defensive_fixture_rating,
            f.away_team.attacking_fixture_rating,
            f.away_team.defensive_fixture_rating
          )
        };
      });
        setFixtures(transformedFixtures);

        // Fetch fixture opportunities
        const resOpportunities = await fetch(`${API_BASE_URL}/api/fixtures_opportunity`);
        if (!resOpportunities.ok) throw new Error("Failed to fetch fixture opportunities");
        const dataOpportunities = await resOpportunities.json();
        
        // Transform and sort attack opportunities by attacking_fixture_rating
        const transformedAttack = dataOpportunities.attack
          .map((o) => ({
            gw: o.gameweek,
            matchup: `${o.team} vs ${o.opponent}`,
            team: o.team,
            venue: o.venue,
            rating: o.attacking_fixture_rating,
            attackRating: o.attacking_fixture_rating,
            defenseRating: o.defensive_fixture_rating,
            combinedScore: o.combined_score,
          }))
          .sort((a, b) => b.attackRating - a.attackRating); // Sort by attack rating descending
        
        // Transform and sort defense opportunities by defensive_fixture_rating
        const transformedDefense = dataOpportunities.defense
          .map((o) => ({
            gw: o.gameweek,
            matchup: `${o.team} vs ${o.opponent}`,
            team: o.team,
            venue: o.venue,
            rating: o.defensive_fixture_rating,
            attackRating: o.attacking_fixture_rating,
            defenseRating: o.defensive_fixture_rating,
            combinedScore: o.combined_score,
          }))
          .sort((a, b) => b.defenseRating - a.defenseRating); // Sort by defense rating descending
        
        setFixtureOpportunities({ attack: transformedAttack, defense: transformedDefense });

        // Fetch team fixture summary
        const resSummary = await fetch(`${API_BASE_URL}/api/team_fixtures`);
        if (!resSummary.ok) throw new Error("Failed to fetch team fixture summary");
        const dataSummary = await resSummary.json();
        const transformedSummary = dataSummary.map((t) => ({
          team: t.team,
          att: t.avg_attack_difficulty,
          def: t.avg_defense_difficulty,
          overall: t.overall_difficulty,
          fixtures: t.num_favorable_fixtures,
          // Updated: Period-specific home fixture counts
          nearTermHomeFixtures: t.near_term_home_fixtures,
          mediumTermHomeFixtures: t.medium_term_home_fixtures,
          // Swing analysis fields
          nearTermRating: t.near_term_rating,
          mediumTermRating: t.medium_term_rating,
          fixtureSwing: t.fixture_swing,
          swingCategory: t.swing_category,
          swingEmoji: t.swing_emoji,
          formContext: t.form_context,
        }));
        setTeamFixtureSummary(transformedSummary);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [activeTab]);

  const sortedTeamData = useMemo(() => {
    return [...teamFixtureSummary].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [sortBy, sortOrder, teamFixtureSummary]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };
  
  // Filter and display fixtures
  const displayFixtures = useMemo(() => {
    let filtered = fixtures.filter((f) => f.gw === gameweek);
    
    // Sort by best opportunities (highest max rating)
    return filtered.sort((a, b) => b.maxOpportunityRating - a.maxOpportunityRating);
  }, [fixtures, gameweek]);

  const { minGameweek, maxGameweek } = useMemo(() => {
    const gameweeks = fixtures.map((f) => f.gw).filter((gw) => typeof gw === "number" && !isNaN(gw));
    const minGw = gameweeks.length > 0 ? Math.min(...gameweeks) + 1 : 2; // Current gameweek + 1
    return {
      minGameweek: minGw,
      maxGameweek: gameweeks.length > 0 ? Math.max(...gameweeks) : 38
    };
  }, [fixtures]);

  const getSortIcon = (column) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3" />;
    return sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading performers...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Failed to load fixtures</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 active:scale-95"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top duration-700">
          <h1 className="mb-2 text-2xl sm:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 animate-pulse" />
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              <span className="hidden sm:inline">Fixture Analysis</span>
              <span className="sm:hidden">Fixtures</span>
            </span>
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground animate-in fade-in slide-in-from-left duration-700" style={{ animationDelay: '200ms' }}>
            Comprehensive gameweek analysis with strategic opportunities
            and team fixture difficulty insights to optimize your fantasy lineup.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-lg border w-full grid grid-cols-2 gap-1 text-background animate-in fade-in slide-in-from-bottom duration-500" style={{ animationDelay: '300ms' }}>
            <TabsTrigger
              value="fixtures"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
            >
              <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Fixtures</span>
            </TabsTrigger>
            <TabsTrigger
              value="opportunities"
              className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-purple-600 data-[state=active]:text-white"
            >
              <Target className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">FDR</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fixtures" className="space-y-4 sm:space-y-6">
            {/* Best Fixtures Highlight */}
            {displayFixtures.length > 0 && (
              <Card className="border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] animate-in fade-in slide-in-from-bottom" style={{ animationDelay: '400ms' }}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 group-hover:scale-110 transition-transform duration-300">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground mb-1">🎯 Top Fixture Opportunity</h3>
                      <p className="text-xs text-muted-foreground">
                        Best fixture: <span className="font-bold text-foreground">{displayFixtures[0].fixture}</span> (GW {displayFixtures[0].gw})
                        {displayFixtures[0].favorability !== "Neutral" && (
                          <span className="ml-2 text-purple-600 dark:text-purple-400 font-semibold">⭐ {displayFixtures[0].favorability} favored</span>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gameweek Selector - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto">
                <Button
                  onClick={() => setGameweek(Math.max(minGameweek - 1, gameweek - 1))}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 sm:h-11 sm:w-11 rounded-full hover:bg-muted/60 transition-all active:scale-90 active:bg-muted/80"
                  aria-label="Previous gameweek"
                >
                  <ChevronLeft className="h-6 w-6 sm:h-5 sm:w-5" />
                </Button>
                <div className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-secondary/70 to-secondary/50 backdrop-blur font-semibold text-xl sm:text-xl shadow-lg border border-border/50 min-w-[160px] text-center">
                  Gameweek {gameweek}
                </div>
                <Button
                  onClick={() => setGameweek(Math.min(maxGameweek, gameweek + 1))}
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 sm:h-11 sm:w-11 rounded-full hover:bg-muted/60 transition-all active:scale-90 active:bg-muted/80"
                  aria-label="Next gameweek"
                >
                  <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </div>

            {/* Fixtures Grid */}
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {displayFixtures.map((fixture, index) => (
                <Card
                  key={index}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="overflow-hidden border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom group"
                >
                  <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 group-hover:from-purple-500/20 group-hover:to-blue-500/20 transition-all duration-300">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-200">
                        {fixture.fixture}
                      </CardTitle>
                      {fixture.favorability !== "Neutral" ? (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200 hover:scale-105 transition-transform duration-200"
                          title="Team favored to win based on attack and defense scores"
                        >
                          ⭐ {fixture.favorability} Favoured
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-slate-100 text-slate-800 dark:bg-slate-800/30 dark:text-slate-200"
                          title="No clear favorite based on attack and defense scores"
                        >
                          Neutral
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                    {/* Home Team */}
                    <div
                      className={`p-3 sm:p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${getTeamBackgroundColor(fixture.teams.home.team)} ${getTeamBorderColor(fixture.teams.home.team)}`}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {fixture.teams.home.team} (H)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <Badge
                              aria-label={`Attack Rank ${fixture.teams.home.rank.attack}`}
                              className={`text-sm font-mono hover:bg-opacity-80 transition-all duration-200 ${getColorStyles(
                                "rank",
                                fixture.teams.home.rank.attack
                              )}`}
                            >
                              #{fixture.teams.home.rank.attack} Attack
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">🎯 Attacking Threat</p>
                            <p className={`text-2xl font-bold ${getRatingDisplay(fixture.teams.home.attackRating).color}`}>
                              {fixture.teams.home.attackRating}%
                            </p>
                            <Badge className={`text-xs mt-1 ${getRatingDisplay(fixture.teams.home.attackRating).bgColor} ${getRatingDisplay(fixture.teams.home.attackRating).borderColor} ${getRatingDisplay(fixture.teams.home.attackRating).textColor}`}>
                              {getRatingDisplay(fixture.teams.home.attackRating).emoji} {getRatingDisplay(fixture.teams.home.attackRating).label}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <Badge
                              aria-label={`Defense Rank ${fixture.teams.home.rank.defense}`}
                              className={`text-sm font-mono hover:bg-opacity-80 transition-all duration-200 ${getColorStyles(
                                "rank",
                                fixture.teams.home.rank.defense
                              )}`}
                            >
                              #{fixture.teams.home.rank.defense} Defense
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">🛡️ Clean Sheet Odds</p>
                            <p className={`text-2xl font-bold ${getRatingDisplay(fixture.teams.home.defenseRating).color}`}>
                              {fixture.teams.home.defenseRating}%
                            </p>
                            <Badge className={`text-xs mt-1 ${getRatingDisplay(fixture.teams.home.defenseRating).bgColor} ${getRatingDisplay(fixture.teams.home.defenseRating).borderColor} ${getRatingDisplay(fixture.teams.home.defenseRating).textColor}`}>
                              {getRatingDisplay(fixture.teams.home.defenseRating).emoji} {getRatingDisplay(fixture.teams.home.defenseRating).label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div
                      className={`p-3 sm:p-4 rounded-xl border transition-all duration-300 hover:scale-[1.01] ${getTeamBackgroundColor(fixture.teams.away.team)} ${getTeamBorderColor(fixture.teams.away.team)}`}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {fixture.teams.away.team} (A)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <Badge
                              aria-label={`Attack Rank ${fixture.teams.away.rank.attack}`}
                              className={`text-sm font-mono hover:bg-opacity-80 transition-all duration-200 ${getColorStyles(
                                "rank",
                                fixture.teams.away.rank.attack
                              )}`}
                            >
                              #{fixture.teams.away.rank.attack} Attack
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">🎯 Attacking Threat</p>
                            <p className={`text-2xl font-bold ${getRatingDisplay(fixture.teams.away.attackRating).color}`}>
                              {fixture.teams.away.attackRating}%
                            </p>
                            <Badge className={`text-xs mt-1 ${getRatingDisplay(fixture.teams.away.attackRating).bgColor} ${getRatingDisplay(fixture.teams.away.attackRating).borderColor} ${getRatingDisplay(fixture.teams.away.attackRating).textColor}`}>
                              {getRatingDisplay(fixture.teams.away.attackRating).emoji} {getRatingDisplay(fixture.teams.away.attackRating).label}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Shield className="h-4 w-4" />
                            <Badge
                              aria-label={`Defense Rank ${fixture.teams.away.rank.defense}`}
                              className={`text-sm font-mono hover:bg-opacity-80 transition-all duration-200 ${getColorStyles(
                                "rank",
                                fixture.teams.away.rank.defense
                              )}`}
                            >
                              #{fixture.teams.away.rank.defense} Defense
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground mb-1">🛡️ Clean Sheet Odds</p>
                            <p className={`text-2xl font-bold ${getRatingDisplay(fixture.teams.away.defenseRating).color}`}>
                              {fixture.teams.away.defenseRating}%
                            </p>
                            <Badge className={`text-xs mt-1 ${getRatingDisplay(fixture.teams.away.defenseRating).bgColor} ${getRatingDisplay(fixture.teams.away.defenseRating).borderColor} ${getRatingDisplay(fixture.teams.away.defenseRating).textColor}`}>
                              {getRatingDisplay(fixture.teams.away.defenseRating).emoji} {getRatingDisplay(fixture.teams.away.defenseRating).label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4 sm:space-y-6">
            {/* FDR Grid */}
            <FDRGrid fixtures={fixtures} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
