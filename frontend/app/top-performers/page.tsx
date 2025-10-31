"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useState, useEffect, useMemo } from "react"
import { TrendingUp, Minus, Star, Shield, Target, Gem, DollarSign, Trophy, ArrowUp, ArrowUpDown, ArrowDown } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

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
    ARS: "bg-red-600 text-white border-red-700",           // Arsenal - red & white
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
  const [underperformers, setUnderperformers] = useState([]);
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
  const [assistSortBy, setAssistSortBy] = useState("assists"); // Default sort by assists
  const [assistSortDirection, setAssistSortDirection] = useState("desc"); // Default descending
  const [defenseSortBy, setDefenseSortBy] = useState("points");
  const [defenseSortDirection, setDefenseSortDirection] = useState("desc");
  const [valueSortBy, setValueSortBy] = useState('pointsPerMillion');
  const [valueSortDirection, setValueSortDirection] = useState('desc');

  const [overSortBy, setOverSortBy] = useState("overperformance_per_90");
  const [overSortDirection, setOverSortDirection] = useState("desc");
  const [sustainSortBy, setSustainSortBy] = useState("goals");
  const [sustainSortDirection, setSustainSortDirection] = useState("desc");
  const [underSortBy, setUnderSortBy] = useState("xG");
  const [underSortDirection, setUnderSortDirection] = useState("desc");

  // Sorting logic for seasonPerformers
  const sortedSeasonPerformers = useMemo(() => {
    return [...seasonPerformers].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [sortBy, sortOrder, seasonPerformers]);

  // Memoized sorting for defensive performers
  const sortedDefensiveLeaders = useMemo(() => {
    return [...defensiveLeaders].sort((a, b) => {
      const aVal = a[defenseSortBy];
      const bVal = b[defenseSortBy];
      const order = defenseSortDirection === "desc" ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player);
    });
  }, [defenseSortBy, defenseSortDirection, defensiveLeaders]);

  // Sort Best Value
  const sortedValuePlayers = useMemo(() => {
    return [...valuePlayers].sort((a, b) => {
      const aVal = a[valueSortBy];
      const bVal = b[valueSortBy];
      const order = valueSortDirection === 'desc' ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player); // Fallback to player name for ties
    });
  }, [valueSortBy, valueSortDirection, valuePlayers]);

  // Sort assistProviders
  const sortedAssistProviders = useMemo(() => {
    return [...assistProviders].sort((a, b) => {
      const aVal = a[assistSortBy];
      const bVal = b[assistSortBy];
      const order = assistSortDirection === "desc" ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player); // Fallback to player name for ties
    });
  }, [assistSortBy, assistSortDirection, assistProviders]);

  // Sort overperformers
  const sortedOverperformers = useMemo(() => {
    return [...overperformers].sort((a, b) => {
      const aVal = a[overSortBy];
      const bVal = b[overSortBy];
      const order = overSortDirection === "desc" ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player);
    });
  }, [overSortBy, overSortDirection, overperformers]);

  // Sort sustainable scorers
  const sortedSustainableScorers = useMemo(() => {
    return [...sustainableScorers].sort((a, b) => {
      const aVal = a[sustainSortBy];
      const bVal = b[sustainSortBy];
      const order = sustainSortDirection === "desc" ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player);
    });
  }, [sustainSortBy, sustainSortDirection, sustainableScorers]);

  // Sort underperformers
  const sortedUnderperformers = useMemo(() => {
    return [...underperformers].sort((a, b) => {
      const aVal = a[underSortBy];
      const bVal = b[underSortBy];
      const order = underSortDirection === "desc" ? bVal - aVal : aVal - bVal;
      return order || a.player.localeCompare(b.player);
    });
  }, [underSortBy, underSortDirection, underperformers]);

  // Handle sort click
  const handleSort = (column, tab = 'season') => {
    if (tab === 'assists') {
      if (assistSortBy === column) {
        setAssistSortDirection(assistSortDirection === 'desc' ? 'asc' : 'desc');
      } else {
        setAssistSortBy(column);
        setAssistSortDirection('desc');
      }
    } else if (tab === 'overperformers') {
      if (overSortBy === column) {
        setOverSortDirection(overSortDirection === 'desc' ? 'asc' : 'desc');
      } else {
        setOverSortBy(column);
        setOverSortDirection('desc');
      }
    } else if (tab === 'sustainable') {
      if (sustainSortBy === column) {
        setSustainSortDirection(sustainSortDirection === 'desc' ? 'asc' : 'desc');
      } else {
        setSustainSortBy(column);
        setSustainSortDirection('desc');
      }
    } else if (tab === 'underperformers') {
      if (underSortBy === column) {
        setUnderSortDirection(underSortDirection === 'desc' ? 'asc' : 'desc');
      } else {
        setUnderSortBy(column);
        setUnderSortDirection('desc');
      }
    } else if (tab === 'value') {
      if (valueSortBy === column) {
        setValueSortDirection(valueSortDirection === 'desc' ? 'asc' : 'desc');
      } else {
        setValueSortBy(column);
        setValueSortDirection('asc');
      }
    } else {
      if (sortBy === column) {
        setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
      } else {
        setSortBy(column);
        setSortOrder('desc');
      }
    }
  };

  // Get sort icon
  const getSortIcon = (key, tab = "season") => {
    const currentSortBy = tab === "assists" ? assistSortBy : tab === "defense" ? defenseSortBy : tab === "value" ? valueSortBy : sortBy;
    const currentSortDirection = tab === "assists" ? assistSortDirection : tab === "defense" ? defenseSortDirection : tab === "value" ? valueSortDirection : sortOrder;
    if (currentSortBy !== key) return <ArrowUpDown className="h-4 w-4" />;
    return currentSortDirection === "desc" ? (
      <ArrowDown className="h-4 w-4" />
    ) : (
      <ArrowUp className="h-4 w-4" />
    );
  };

  async function fetchWithRetry(url, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
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
              points: p.points, ppg: p.ppg, cleanSheets: p.cleanSheets, csRate: p.csRate, dfc: p.defensiveContributions,
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
              xG: p.xG, overperformance: p.overperformance, sustainable: p.sustainable, form: p.form, overperformance_per_90: p.overperformance_per_90
            })
          },
          {
            key: 'underperformers', url: `${API_BASE_URL}/api/underperformers`, setter: setUnderperformers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, goals: p.goals,
              xG: p.xG, overperformance: p.overperformance, sustainable: p.sustainable, form: p.form, overperformance_per_90: p.overperformance_per_90
            })
          },
          {
            key: 'sustainableScorers', url: `${API_BASE_URL}/api/sustainable-scorers`, setter: setSustainableScorers, mapper: p => ({
              player: p.player, team: p.team, team_short: p.team_short, goals: p.goals,
              xG: p.xG, overperformance: p.overperformance, sustainable: p.sustainable, form: p.form, overperformance_per_90: p.overperformance_per_90
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
  }, [activeTab])
  
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading performers...</p>
      </div>
    </div>
  )
  if (Object.keys(errors).length > 0) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      <div className="text-center">
        <p>Error loading data:</p>
        <ul>
          {Object.entries(errors).map(([key, message]) => (
            <li key={key}>{message}</li>
          ))}
        </ul>
        <button
          onClick={() => fetchData()}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Retry
        </button>
      </div>
    </div>
  );
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
                                <TeamBadge team={player.team_short} />
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
                    Goal performance compared to expected goals (xG)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-6">
                    {/* Overperformers Section */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-950/10 border border-red-200 dark:border-red-800/50 hover:shadow-lg transition-all duration-300">
                      <h4 className="font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
                        ⚠️ Potential Regression Risk
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-red-200 dark:border-red-800/50 text-left text-muted-foreground">
                              <th className="py-2 px-2 font-medium">Player</th>
                              <th className="py-2 px-2 font-medium">Team</th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("goals", "overperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  Goals {getSortIcon("goals", "overperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("xG", "overperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  xG {getSortIcon("xG", "overperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("overperformance", "overperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  Overperf {getSortIcon("overperformance", "overperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div
                                        className="flex items-center gap-1"
                                        onClick={() => handleSort("overperformance_per_90", "overperformers")}
                                      >
                                        Per 90 {getSortIcon("overperformance_per_90", "overperformers")}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Overperformance per 90 minutes
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="py-2 px-2 font-medium">Form</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedOverperformers.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-4 text-center text-muted-foreground">
                                  No overperformers found
                                </td>
                              </tr>
                            ) : (
                              sortedOverperformers.map((player) => (
                                <tr
                                  key={player.player}
                                  className="border-b border-red-100 dark:border-red-800/30 transition-all duration-200 hover:bg-red-100/50 dark:hover:bg-red-900/20"
                                >
                                  <td className="py-2 px-2 font-medium">{player.player}</td>
                                  <td className="py-2 px-2">
                                    <TeamBadge team={player.team_short} />
                                  </td>
                                  <td className="py-2 px-2 text-red-600 dark:text-red-400 font-semibold">{player.goals}</td>
                                  <td className="py-2 px-2 text-red-600 dark:text-red-400">{player.xG.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-red-600 dark:text-red-400">{player.overperformance.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-red-600 dark:text-red-400">{player.overperformance_per_90.toFixed(3)}</td>
                                  <td className="py-2 px-2">
                                    <FormBadge value={player.form} />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Sustainable Scorers Section */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-950/10 border border-green-200 dark:border-green-800/50 hover:shadow-lg transition-all duration-300">
                      <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3 flex items-center gap-2">
                        ✅ Sustainable Performers
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-green-200 dark:border-green-800/50 text-left text-muted-foreground">
                              <th className="py-2 px-2 font-medium">Player</th>
                              <th className="py-2 px-2 font-medium">Team</th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("goals", "sustainable")}
                              >
                                <div className="flex items-center gap-1">
                                  Goals {getSortIcon("goals", "sustainable")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("xG", "sustainable")}
                              >
                                <div className="flex items-center gap-1">
                                  xG {getSortIcon("xG", "sustainable")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("overperformance", "sustainable")}
                              >
                                <div className="flex items-center gap-1">
                                  Overperf {getSortIcon("overperformance", "sustainable")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div
                                        className="flex items-center gap-1"
                                        onClick={() => handleSort("overperformance_per_90", "sustainable")}
                                      >
                                        Per 90 {getSortIcon("overperformance_per_90", "sustainable")}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Overperformance per 90 minutes
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="py-2 px-2 font-medium">Form</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedSustainableScorers.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-4 text-center text-muted-foreground">
                                  No sustainable performers found
                                </td>
                              </tr>
                            ) : (
                              sortedSustainableScorers.map((player) => (
                                <tr
                                  key={player.player}
                                  className="border-b border-green-100 dark:border-green-800/30 transition-all duration-200 hover:bg-green-100/50 dark:hover:bg-green-900/20"
                                >
                                  <td className="py-2 px-2 font-medium">{player.player}</td>
                                  <td className="py-2 px-2">
                                    <TeamBadge team={player.team_short} />
                                  </td>
                                  <td className="py-2 px-2 text-green-600 dark:text-green-400 font-semibold">{player.goals}</td>
                                  <td className="py-2 px-2 text-green-600 dark:text-green-400">{player.xG.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-green-600 dark:text-green-400">{player.overperformance.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-green-600 dark:text-green-400">{player.overperformance_per_90.toFixed(3)}</td>
                                  <td className="py-2 px-2">
                                    <FormBadge value={player.form} />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Underperformers Section */}
                    <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-950/10 border border-blue-200 dark:border-blue-800/50 hover:shadow-lg transition-all duration-300">
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                        🔥 Potential Breakout Candidates
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-blue-200 dark:border-blue-800/50 text-left text-muted-foreground">
                              <th className="py-2 px-2 font-medium">Player</th>
                              <th className="py-2 px-2 font-medium">Team</th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("goals", "underperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  Goals {getSortIcon("goals", "underperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("xG", "underperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  xG {getSortIcon("xG", "underperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => handleSort("overperformance", "underperformers")}
                              >
                                <div className="flex items-center gap-1">
                                  Overperf {getSortIcon("overperformance", "underperformers")}
                                </div>
                              </th>
                              <th
                                className="py-2 px-2 font-medium cursor-pointer hover:text-foreground transition-colors"
                              >
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div
                                        className="flex items-center gap-1"
                                        onClick={() => handleSort("overperformance_per_90", "underperformers")}
                                      >
                                        Per 90 {getSortIcon("overperformance_per_90", "underperformers")}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Overperformance per 90 minutes
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </th>
                              <th className="py-2 px-2 font-medium">Form</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedUnderperformers.length === 0 ? (
                              <tr>
                                <td colSpan="7" className="py-4 text-center text-muted-foreground">
                                  No underperformers found
                                </td>
                              </tr>
                            ) : (
                              sortedUnderperformers.map((player) => (
                                <tr
                                  key={player.player}
                                  className="border-b border-blue-100 dark:border-blue-800/30 transition-all duration-200 hover:bg-blue-100/50 dark:hover:bg-blue-900/20"
                                >
                                  <td className="py-2 px-2 font-medium">{player.player}</td>
                                  <td className="py-2 px-2">
                                    <TeamBadge team={player.team_short} />
                                  </td>
                                  <td className="py-2 px-2 text-blue-600 dark:text-blue-400 font-semibold">{player.goals}</td>
                                  <td className="py-2 px-2 text-blue-600 dark:text-blue-400">{player.xG.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-blue-600 dark:text-blue-400">{player.overperformance.toFixed(1)}</td>
                                  <td className="py-2 px-2 text-blue-600 dark:text-blue-400">{player.overperformance_per_90.toFixed(3)}</td>
                                  <td className="py-2 px-2">
                                    <FormBadge value={player.form} />
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
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
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("assists", true)}
                        >
                          <div className="flex items-center gap-1">
                            Assists {getSortIcon("assists", true)}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                          onClick={() => handleSort("assistsPerGame", true)}
                        >
                          <div className="flex items-center gap-1">
                            Per Game {getSortIcon("assistsPerGame", true)}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("points", true)}
                        >
                          <div className="flex items-center gap-1">
                            Points {getSortIcon("points", true)}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("form", true)}
                        >
                          <div className="flex items-center gap-1">
                            Form {getSortIcon("form", true)}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort("price", true)}
                        >
                          <div className="flex items-center gap-1">
                            Price {getSortIcon("price", true)}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort("ownership", true)}
                        >
                          <div className="flex items-center gap-1">
                            Ownership {getSortIcon("ownership", true)}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedAssistProviders.map((player, index) => (
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
                            {player.player}
                          </td>
                          <td className="py-4">
                            <TeamBadge team={player.team_short} />
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">
                            {player.assists}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.assistsPerGame.toFixed(2)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">
                            {player.points}
                          </td>
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
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("points", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Points {getSortIcon("points", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("form", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Form {getSortIcon("form", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                          onClick={() => handleSort("ppg", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            PPG {getSortIcon("ppg", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("cleanSheets", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Clean Sheets {getSortIcon("cleanSheets", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("dfc", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Defensive Contributions {getSortIcon("dfc", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort("csRate", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            CS Rate {getSortIcon("csRate", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden md:table-cell"
                          onClick={() => handleSort("tackles", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Tackles {getSortIcon("tackles", "defense")}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors hidden lg:table-cell"
                          onClick={() => handleSort("price", "defense")}
                        >
                          <div className="flex items-center gap-1">
                            Price {getSortIcon("price", "defense")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDefensiveLeaders.map((player, index) => (
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
                            {player.player}
                          </td>
                          <td className="py-4">
                            <TeamBadge team={player.team_short} />
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">
                            {player.points}
                          </td>
                          <td className="py-4">
                            <FormBadge value={player.form} />
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.ppg.toFixed(1)}
                          </td>
                          <td className="py-4 font-mono text-sm text-foreground group-hover:text-accent transition-colors duration-200">
                            {player.cleanSheets}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.dfc}
                          </td>
                          <td className="py-4 font-mono text-sm text-green-600 group-hover:text-green-500 transition-colors duration-200">
                            {player.csRate.toFixed(2)}%
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200 hidden md:table-cell">
                            {player.tackles}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200 hidden lg:table-cell">
                            £{player.price}m
                          </td>
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
                    High Points per Million
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Players offering the best return for their cost.
                  Points per million calculated as total points divided by price (£m).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left text-sm text-muted-foreground">
                        <th className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium">Rank</th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('player', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Player {getSortIcon('player', 'value')}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('team_short', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Team {getSortIcon('team_short', 'value')}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('position', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Pos {getSortIcon('position', 'value')}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('totalPoints', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Points {getSortIcon('totalPoints', 'value')}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('price', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Price (£m) {getSortIcon('price', 'value')}
                          </div>
                        </th>
                        <th
                          className="sticky top-0 bg-card/60 backdrop-blur z-10 pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => handleSort('pointsPerMillion', 'value')}
                        >
                          <div className="flex items-center gap-1">
                            Points/Million {getSortIcon('pointsPerMillion', 'value')}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedValuePlayers.map((player, index) => (
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
                            {player.player}
                          </td>
                          <td className="py-4">
                            <TeamBadge team={player.team_short} />
                          </td>
                          <td className="py-4">
                            <PositionBadge position={player.position} />
                          </td>
                          <td className="py-4 font-mono text-accent font-bold group-hover:text-accent/80 transition-colors duration-200">
                            {player.totalPoints}
                          </td>
                          <td className="py-4 font-mono text-sm text-muted-foreground group-hover:text-green-600 transition-colors duration-200">
                            £{player.price.toFixed(1)}m
                          </td>
                          <td className="py-4 font-mono text-sm text-green-600 group-hover:text-green-500 transition-colors duration-200">
                            {player.pointsPerMillion.toFixed(2)}
                          </td>
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
                <CardDescription>
                  Undervalued players with above-average stats (Potential Score: 0–10).
                  Score calculated from weighted stats like xG, xA, form, and points per game, tailored by position.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {hiddenGems.map((player, index) => (
                    <div
                      key={player.player}
                      className="p-4 rounded-lg bg-gradient-to-br from-secondary/30 to-secondary/10 border transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-accent/50"
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

                      <div className="mb-3 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <Gem className="h-5 w-5 text-pink-500" />
                          <span className="text-2xl font-bold text-pink-600">{player.potentialScore.toFixed(1)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Potential Score</div>
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
                          <span>xG: {player.xG.toFixed(2)}</span>
                          <span>xA: {player.xA.toFixed(2)}</span>
                          <span>xCS: {player.xCS.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Progress value={player.ownership * 1} className="h-1 bg-accent/20 [&>div]:bg-accent" />
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
