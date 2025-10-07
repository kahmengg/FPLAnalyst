"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect, useMemo } from "react"
import { TrendingUp, Minus, Star, Shield, Target, Gem, DollarSign, Trophy, ArrowUp, ArrowUpDown, ArrowDown} from "lucide-react"


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
const MAX_RETRIES = 3

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

const TeamBadge = ({ team }) => {
  const colors = {
    ARS: "bg-red-100 text-red-800 border-red-200",
    BOU: "bg-red-600 text-white border-red-700", // Replaced cherry with standard red
    BRE: "bg-red-200 text-red-900 border-red-300",
    BHA: "bg-blue-200 text-blue-900 border-blue-300",
    BUR: "bg-red-500 text-white border-red-600", // Replaced claret with standard red
    CHE: "bg-blue-100 text-blue-800 border-blue-200",
    CRY: "bg-blue-300 text-blue-900 border-blue-400",
    EVE: "bg-blue-400 text-blue-900 border-blue-500",
    FUL: "bg-white text-gray-800 border-gray-200", // Simplified white-100 to white
    LEE: "bg-white text-blue-800 border-gray-300", // Simplified white-200 to white
    LIV: "bg-green-100 text-green-800 border-green-200",
    MCI: "bg-sky-100 text-sky-800 border-sky-200",
    MUN: "bg-yellow-100 text-yellow-800 border-yellow-200",
    NEW: "bg-gray-900 text-white border-gray-950", // Replaced black-100 for better contrast
    TOT: "bg-white text-blue-900 border-gray-400", // Replaced navy with blue-900
    SUN: "bg-red-300 text-white border-red-400",
    WHU: "bg-red-400 text-sky-800 border-red-500", // Adjusted claret to red
    WOL: "bg-yellow-200 text-gray-900 border-yellow-300",
    NFO: "bg-red-400 text-white border-red-500",
    AVL: "bg-red-500 text-blue-900 border-red-600", // Adjusted claret to red
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

// New: FormBadge - colored pill based on form value
const FormBadge = ({ value }: { value: number }) => {
  // green >= 7, amber 5-7, red <5
  const v = Number(value || 0)
  const cls =
    v >= 7 ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
      v >= 5 ? "bg-amber-100 text-amber-800 border-amber-200" :
        "bg-red-100 text-red-800 border-red-200"

  return (
    <span
      role="status"
      aria-label={`Form ${v.toFixed(1)}`}
      className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-md text-xs font-mono ${cls}`}
    >
      {v.toFixed(1)}
    </span>
  )
}


  
export default function TopPerformersPage() {
  const [activeTab, setActiveTab] = useState("season");
  const [goalScorers, setGoalScorers] = useState([]);
  const [assistProviders, setAssistProviders] = useState([]);
  const [defensiveLeaders, setDefensiveLeaders] = useState([]);
  const [seasonPerformers, setSeasonPerformers] = useState([]);
  const [hiddenGems, setHiddenGems] = useState([]);
  const [valuePlayers, setValuePlayers] = useState([]);
  const [overperformers, setOverperformers] = useState([]);
  const [sustainableScorers, setSustainableScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  // Add sorting state
  const [sortBy, setSortBy] = useState("points"); // Default sort by points
  const [sortOrder, setSortOrder] = useState("desc"); // Default descending (higher is better)

  // Sorting logic for seasonPerformers
  const sortedSeasonPerformers = useMemo(() => {
    return [...seasonPerformers].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [sortBy, sortOrder, seasonPerformers]);

  // Handle sort click
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Get sort icon
  const getSortIcon = (column) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3" />;
    return sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setErrors({})
      const newErrors = {};

      try {
        const endpoints = [
          {
            key: 'goalScorers', url: `${API_BASE_URL}/api/goal_scorer-picks`, setter: setGoalScorers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, goals: p.goals,
              goalsPerGame: p.goalsPerGame, points: p.points, price: p.price,
              ownership: p.ownership, form: p.form
            })
          },
          {
            key: 'assistProviders', url: `${API_BASE_URL}/api/assist-gems`, setter: setAssistProviders, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, assists: p.assists,
              assistsPerGame: p.assistsPerGame, points: p.points, price: p.price,
              ownership: p.ownership, form: p.form
            })
          },
          {
            key: 'defensiveLeaders', url: `${API_BASE_URL}/api/def_lead`, setter: setDefensiveLeaders, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, position: p.position,
              points: p.points, ppg: p.ppg, cleanSheets: p.cleanSheets, csRate: p.csRate,
              tackles: p.tackles, price: p.price, form: p.form
            })
          },
          {
            key: 'seasonPerformers', url: `${API_BASE_URL}/api/season-performers`, setter: setSeasonPerformers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, position: p.position,
              points: p.points, ppg: p.ppg, price: p.price, ownership: p.ownership, form: p.form
            })
          },
          {
            key: 'hiddenGems', url: `${API_BASE_URL}/api/hidden-gems`, setter: setHiddenGems, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, position: p.position,
              points: p.points, ownership: p.ownership, price: p.price, xG: p.xG,
              xA: p.xA, xCS: p.xCS, potentialScore: p.potentialScore, form: p.form
            })
          },
          {
            key: 'valuePlayers', url: `${API_BASE_URL}/api/value-players`, setter: setValuePlayers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, position: p.position,
              pointsPerMillion: p.pointsPerMillion, totalPoints: p.totalPoints, price: p.price, form: p.form
            })
          },
          {
            key: 'overperformers', url: `${API_BASE_URL}/api/overperformers`, setter: setOverperformers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, goals: p.goals,
              xG: p.xG, overperformance: p.overperformance, sustainable: p.sustainable, form: p.form
            })
          },
          {
            key: 'sustainableScorers', url: `${API_BASE_URL}/api/sustainable-scorers`, setter: setSustainableScorers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, goals: p.goals,
              xG: p.xG, overperformance: p.overperformance, sustainable: p.sustainable, form: p.form
            })
          }
        ];

        await Promise.all(endpoints.map(async ({ key, url, setter, mapper }) => {
          try {
            const data = await fetchWithRetry(url);
            setter(data.map(mapper));
          } catch (err) {
            newErrors[key] = `Failed to fetch ${key}: ${err.message}`;
          }
        }));

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        }
      } catch (err) {
        setErrors({ general: `Unexpected error: ${err.message}` });
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading performers...</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-background via-secondary/10 to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-foreground flex items-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-600" />
            FPL Key Insights & Recommendations
          </h1>
          <p className="text-lg text-muted-foreground">
            Comprehensive analysis based on actual season data through gameweeks
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
                {/* Mobile Card Layout (unchanged) */}
                <div className="block sm:hidden space-y-3">
                  {sortedSeasonPerformers.map((player, index) => (
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
                              <TeamBadge team={player.team_short} />
                              <PositionBadge position={player.position} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-accent">{player.points}</div>
                          <div className="text-xs text-muted-foreground">points</div>
                          <div className="text-sm font-mono text-muted-foreground mt-2">
                            <span className="sr-only">Form</span>
                            <FormBadge value={player.form} />
                          </div>
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

                {/* Desktop Table Layout with Sorting */}
                <div className="hidden sm:block overflow-x-auto relative">
                  <table className="w-full min-w-[920px]" role="table" aria-label="Season performers table">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Rank</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Player</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Team</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Pos</th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("points")}
                        >
                          <div className="flex items-center gap-1">
                            Points {getSortIcon("points")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("form")}
                        >
                          <div className="flex items-center gap-1">
                            Form {getSortIcon("form")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                          onClick={() => handleSort("ppg")}
                        >
                          <div className="flex items-center gap-1">
                            PPG {getSortIcon("ppg")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort("price")}
                        >
                          <div className="flex items-center gap-1">
                            Price {getSortIcon("price")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort("ownership")}
                        >
                          <div className="flex items-center gap-1">
                            Ownership {getSortIcon("ownership")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSeasonPerformers.map((player, index) => (
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
                            <TeamBadge team={player.team_short} />
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono font-bold text-accent text-lg group-hover:text-accent/80 transition-colors duration-200">
                            {player.points}
                          </td>
                          <td className="py-4">
                            <FormBadge value={player.form} />
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.ppg.toFixed(1)}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200 hidden lg:table-cell">
                            £{player.price}m
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden lg:table-cell">
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
                                  {player.team_short}
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
                            <span className="text-muted-foreground">{player.goalsPerGame.toFixed(2)} goals/game</span>
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
                        {overperformers.map((player) => (
                          <div
                            key={player.player}
                            className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-0 p-2 rounded-lg bg-white/50 dark:bg-red-900/20"
                          >
                            <span className="font-medium text-sm sm:text-base">{player.player}</span>
                            <span className="text-red-600 dark:text-red-400 font-semibold text-sm">
                              {player.goals} goals ≈ {player.xG.toFixed(1)} xG
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
                              {player.goals} goals ≈ {player.xG.toFixed(1)} xG
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
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Rank</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Player</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Team</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Assists</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden md:table-cell">Per Game</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Points</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Form</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden lg:table-cell">Price</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden lg:table-cell">Ownership</th>
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
                              {player.team_short}
                            </Badge>
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">{player.assists}</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.assistsPerGame.toFixed(2)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">{player.points}</td>
                          <td className="py-4">
                            <FormBadge value={player.form} />
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200 hidden lg:table-cell">
                            £{player.price}m
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden lg:table-cell">
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
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Rank</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Player</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Team</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Pos</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Points</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Form</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden md:table-cell">PPG</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Clean Sheets</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">CS Rate</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden md:table-cell">Tackles</th>
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium hidden lg:table-cell">Price</th>
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
                            <TeamBadge team={player.team_short} />
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">{player.points}</td>
                          <td className="py-4">
                            <FormBadge value={player.form} />
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.ppg.toFixed(1)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">{player.cleanSheets}</td>
                          <td className="py-4 font-mono text-sm text-green-600 group-hover:text-green-500 transition-colors duration-200">{player.csRate.toFixed(1)}%</td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.tackles}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200 hidden lg:table-cell">£{player.price}m</td>
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
                      {valuePlayers.map((player, index) => (
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
                            <TeamBadge team={player.team_short} />
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
                  {hiddenGems.map((player, index) => (
                    <div
                      key={player.player}
                      className="p-4 rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/10 border transition-all hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <TeamBadge team={player.team_short} />
                        <div className="text-xs text-muted-foreground">#{index + 1}</div>
                      </div>

                      <div className="mb-3">
                        <h3 className="font-medium text-foreground">{player.player}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <PositionBadge position={player.position} />
                          <span className="text-sm text-muted-foreground">£{player.price}m</span>
                          <span className="ml-2"><FormBadge value={player.form} /></span>
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
