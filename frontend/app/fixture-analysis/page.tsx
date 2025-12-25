"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarIcon, Target, Shield, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"

// Team color mapping for visual identification
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
          "bg-yellow-100 text-yellow-800 border-yellow-300 font-bold dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700",
      },
      {
        max: 6,
        classes:
          "bg-gray-100 text-gray-800 border-gray-300 font-semibold dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600",
      },
      {
        max: 10,
        classes:
          "bg-orange-100 text-orange-800 border-orange-300 font-medium dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700",
      },
      {
        max: 15,
        classes:
          "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-600",
      },
      {
        max: Infinity,
        classes:
          "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200 dark:border-red-600",
      },
    ],
  },
  difficulty: {
    ranges: [
      { min: 3, classes: "text-green-600 dark:text-green-400", emoji: "🟢" },
      { min: 1, classes: "text-yellow-600 dark:text-yellow-400", emoji: "🟡" },
      { min: -1, classes: "text-orange-600 dark:text-orange-400", emoji: "🟠" },
      { min: -Infinity, classes: "text-red-600 dark:text-red-400", emoji: "🔴" },
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
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900",
      borderColor: "border-green-300 dark:border-green-700",
      textColor: "text-green-800 dark:text-green-200",
      label: "Excellent",
      emoji: "🔥"
    };
  } else if (rating >= 65) {
    return {
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900",
      borderColor: "border-blue-300 dark:border-blue-700",
      textColor: "text-blue-800 dark:text-blue-200",
      label: "Good",
      emoji: "✅"
    };
  } else if (rating >= 45) {
    return {
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-100 dark:bg-yellow-900",
      borderColor: "border-yellow-300 dark:border-yellow-700",
      textColor: "text-yellow-800 dark:text-yellow-200",
      label: "Neutral",
      emoji: "➖"
    };
  } else if (rating >= 25) {
    return {
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900",
      borderColor: "border-orange-300 dark:border-orange-700",
      textColor: "text-orange-800 dark:text-orange-200",
      label: "Difficult",
      emoji: "⚠️"
    };
  } else {
    return {
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900",
      borderColor: "border-red-300 dark:border-red-700",
      textColor: "text-red-800 dark:text-red-200",
      label: "Very Difficult",
      emoji: "❌"
    };
  }
};

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
          teams: {
            home: {
              team: f.home_team.name,
              attackRating: f.home_team.attacking_fixture_rating,
              defenseRating: f.home_team.defensive_fixture_rating,
              rank: f.home_team.rank,
            },
            away: {
              team: f.away_team.name,
              attackRating: f.away_team.attacking_fixture_rating,
              defenseRating: f.away_team.defensive_fixture_rating,
              rank: f.away_team.rank,
            },
          },
          favorability,
          maxOpportunityRating: Math.max(
            f.home_team.attacking_fixture_rating,
            f.home_team.defensive_fixture_rating,
            f.away_team.attacking_fixture_rating,
            f.away_team.defensive_fixture_rating
          ),
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
    <div className="min-h-screen p-2 sm:p-4 lg:p-6 bg-gradient-to-br from-background via-secondary/5 to-secondary/10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="mb-2 text-2xl sm:text-4xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" />
            <span className="hidden sm:inline">Fixture Analysis</span>
            <span className="sm:hidden">Fixtures</span>
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground">
            Comprehensive gameweek analysis with strategic opportunities
            and team fixture difficulty insights to optimize your fantasy lineup.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 rounded-lg border w-full grid grid-cols-3 gap-1 text-background">
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
          </TabsList>

          <TabsContent value="fixtures" className="space-y-4 sm:space-y-6">
            {/* Best Fixtures Highlight */}
            {displayFixtures.length > 0 && (
              <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-md shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20">
                      <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-foreground mb-1">🎯 Top Fixture Opportunity</h3>
                      <p className="text-xs text-muted-foreground">
                        Best fixture: <span className="font-bold text-foreground">{displayFixtures[0].fixture}</span> (GW {displayFixtures[0].gw})
                        {displayFixtures[0].favorability !== "Neutral" && (
                          <span className="ml-2 text-green-600 dark:text-green-400">⭐ {displayFixtures[0].favorability} favored</span>
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
                  className="overflow-hidden border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]"
                >
                  <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-secondary/50 to-secondary/30">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                        {fixture.fixture}
                      </CardTitle>
                      {fixture.favorability !== "Neutral" ? (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          title="Team favored to win based on attack and defense scores"
                        >
                          ⭐ {fixture.favorability} Favoured
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
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
                      className={`p-3 sm:p-4 rounded-xl border ${getColorStyles(
                        "favorability",
                        fixture.favorability,
                        fixture.teams.home.team
                      )} transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {fixture.teams.home.team} (H)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="group relative">
                              <Target className="h-4 w-4" />
                              <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded">
                                Goal Scoring Potential
                              </span>
                            </div>
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
                            <div className="group relative">
                              <Shield className="h-4 w-4" />
                              <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded">
                                Clean Sheet Potential
                              </span>
                            </div>
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
                      className={`p-3 sm:p-4 rounded-xl border ${getColorStyles(
                        "favorability",
                        fixture.favorability,
                        fixture.teams.away.team
                      )} transition-all duration-300`}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
                          {fixture.teams.away.team} (A)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="group relative">
                              <Target className="h-4 w-4" />
                              <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded">
                                Goal Scoring Potential
                              </span>
                            </div>
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
                            <div className="group relative">
                              <Shield className="h-4 w-4" />
                              <span className="absolute hidden group-hover:block text-xs bg-gray-800 text-white p-1 rounded">
                                Clean Sheet Potential
                              </span>
                            </div>
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
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Attacking Opportunities */}
              <Card className="border-red-500/20 bg-gradient-to-br from-red-500/5 to-card backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-3 sm:pb-4 border-b border-border/50 bg-gradient-to-r from-red-500/10 to-transparent">
                  <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      🔥
                    </div>
                    Best Attacking Opportunities
                    <Badge variant="secondary" className="ml-auto text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Next 6 GWs
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-2 sm:space-y-3">
                    {fixtureOpportunities.attack.map((opp, index) => (
                      <div
                        key={index}
                        className="group p-3 sm:p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-secondary/10 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-red-500/30 text-red-600 dark:text-red-400 font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              {index + 1}
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold border-red-500/30">
                              GW {opp.gw}
                            </Badge>
                          </div>
                          <Badge className={`text-xs border-2 font-semibold ${getRatingDisplay(opp.rating).bgColor} ${getRatingDisplay(opp.rating).borderColor} ${getRatingDisplay(opp.rating).textColor}`}>
                            {getRatingDisplay(opp.rating).emoji} {getRatingDisplay(opp.rating).label}
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {opp.matchup}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Target: <span className="text-red-600 dark:text-red-400 font-bold">{opp.team}</span>
                            </span>
                            <span className="mx-2">•</span>
                            <span className="font-medium">{opp.venue === "H" ? "🏠 Home" : "✈️ Away"}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className="text-xs text-muted-foreground font-medium">Combined Rating</span>
                          <span className={`font-mono font-bold text-base ${getRatingDisplay(opp.rating).color}`}>
                            {opp.rating}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Defensive Opportunities */}
              <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-card backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="pb-3 sm:pb-4 border-b border-border/50 bg-gradient-to-r from-blue-500/10 to-transparent">
                  <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                      🛡️
                    </div>
                    Best Defensive Opportunities
                    <Badge variant="secondary" className="ml-auto text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Next 6 GWs
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-2 sm:space-y-3">
                    {fixtureOpportunities.defense.map((opp, index) => (
                      <div
                        key={index}
                        className="group p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-secondary/10 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-500/30 text-blue-600 dark:text-blue-400 font-bold text-xs sm:text-sm flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                              {index + 1}
                            </div>
                            <Badge variant="outline" className="text-xs font-semibold border-blue-500/30">
                              GW {opp.gw}
                            </Badge>
                          </div>
                          <Badge className={`text-xs border-2 font-semibold ${getRatingDisplay(opp.rating).bgColor} ${getRatingDisplay(opp.rating).borderColor} ${getRatingDisplay(opp.rating).textColor}`}>
                            {getRatingDisplay(opp.rating).emoji} {getRatingDisplay(opp.rating).label}
                          </Badge>
                        </div>
                        <div className="mb-3">
                          <p className="text-sm sm:text-base font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {opp.matchup}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            <span className="inline-flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Target: <span className="text-blue-600 dark:text-blue-400 font-bold">{opp.team}</span>
                            </span>
                            <span className="mx-2">•</span>
                            <span className="font-medium">{opp.venue === "H" ? "🏠 Home" : "✈️ Away"}</span>
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border/30">
                          <span className="text-xs text-muted-foreground font-medium">Combined Rating</span>
                          <span className={`font-mono font-bold text-base ${getRatingDisplay(opp.rating).color}`}>
                            {opp.rating}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4 sm:space-y-6">
            {/* Fixture Period Comparison */}
            <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-card backdrop-blur-md shadow-xl">
              <CardHeader className="pb-3 sm:pb-4 border-b border-border/50 bg-gradient-to-r from-purple-500/10 to-transparent">
                <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    📊
                  </div>
                  Fixture Difficulty by Period
                  <Badge variant="secondary" className="ml-auto text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Next 6 GWs
                  </Badge>
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Compare team fixture quality across two periods. Higher percentage = easier fixtures.
                </p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Near-term: Next 3 Gameweeks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        🔥 Next 3 Gameweeks
                        <span className="text-xs text-muted-foreground font-normal">(GW 1-3)</span>
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {[...teamFixtureSummary]
                        .sort((a, b) => b.nearTermRating - a.nearTermRating)
                        .slice(0, 10)
                        .map((team, index) => {
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 ${getTeamBackgroundColor(team.team)} hover:scale-[1.02] transition-all`}
                            >
                              <div className="flex items-center justify-between">
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
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-foreground">
                                    {team.nearTermRating}%
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>🏠 {team.nearTermHomeFixtures} home</span>
                                <span>•</span>
                                <span className={team.fixtureSwing > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : team.fixtureSwing < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>
                                  {team.swingEmoji} Swing: {team.fixtureSwing > 0 ? '+' : ''}{team.fixtureSwing}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Medium-term: Following 3 Gameweeks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        📅 Following 3 Gameweeks
                        <span className="text-xs text-muted-foreground font-normal">(GW 4-6)</span>
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {[...teamFixtureSummary]
                        .sort((a, b) => b.mediumTermRating - a.mediumTermRating)
                        .slice(0, 10)
                        .map((team, index) => {
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border-2 border-slate-300 dark:border-slate-700 ${getTeamBackgroundColor(team.team)} hover:scale-[1.02] transition-all`}
                            >
                              <div className="flex items-center justify-between">
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
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-lg text-foreground">
                                    {team.mediumTermRating}%
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>🏠 {team.mediumTermHomeFixtures} home</span>
                                <span>•</span>
                                <span className={team.fixtureSwing > 0 ? 'text-green-600 dark:text-green-400 font-semibold' : team.fixtureSwing < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-muted-foreground'}>
                                  {team.swingEmoji} Swing: {team.fixtureSwing > 0 ? '+' : ''}{team.fixtureSwing}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Biggest Movers - Fixture Swings */}
            <Card className="border-border/50 bg-card backdrop-blur-md shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 border-b border-border/50">
                <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                    🔄
                  </div>
                  Biggest Fixture Swings
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Transfer Targets
                  </Badge>
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  Teams with the largest fixture difficulty changes between periods.
                </p>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[...teamFixtureSummary]
                    .sort((a, b) => Math.abs(b.fixtureSwing) - Math.abs(a.fixtureSwing))
                    .slice(0, 9)
                    .map((team, index) => {
                      const isImproving = team.fixtureSwing > 0;
                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                            isImproving
                              ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20 hover:border-green-500/40'
                              : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20 hover:border-red-500/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-foreground">{team.team}</span>
                            <Badge className={isImproving 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }>
                              {team.swingEmoji} {team.fixtureSwing > 0 ? '+' : ''}{team.fixtureSwing}%
                            </Badge>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">GW 1-3</span>
                              <span className={`font-semibold ${getTeamColor(team.team)}`}>
                                {team.nearTermRating}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">GW 4-6</span>
                              <span className={`font-semibold ${getTeamColor(team.team)}`}>
                                {team.mediumTermRating}%
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {isImproving ? '📈 Consider buying' : '📉 Consider selling'}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
