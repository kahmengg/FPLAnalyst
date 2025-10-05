"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarIcon, Target, Shield, TrendingUp, Users, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"

const API_BASE_URL = "http://localhost:5000"; // Adjust if deployed elsewhere

const getLevelColor = (level) => {
	switch (level) {
		case "VERY EASY":
			return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200";
		case "EASY":
			return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900 dark:text-blue-200";
		case "MEDIUM":
			return "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900 dark:text-yellow-200";
		case "HARD":
			return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900 dark:text-orange-200";
		case "VERY HARD":
			return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900 dark:text-gray-200";
	}
};

const getDifficultyEmoji = (score) => {
	if (score >= 3) return "🟢";
	if (score >= 1) return "🟡";
	if (score >= -1) return "🟠";
	return "🔴";
};

const getScoreColor = (score) => {
	if (score >= 5) return "text-green-600 dark:text-green-400";
	if (score >= 2) return "text-blue-600 dark:text-blue-400";
	if (score >= -2) return "text-yellow-600 dark:text-yellow-400";
	if (score >= -5) return "text-orange-600 dark:text-orange-400";
	return "text-red-600 dark:text-red-400";
};

const getFavorabilityColor = (favorability, teamName) => {
	if (favorability === teamName) {
		return "bg-green-500/20 border-green-500/50";
	}
	return "bg-red-500/20 border-red-500/50";
};

const getRankColor = (rank) => {
	if (rank <= 2) return "text-green-600 font-bold";
	if (rank <= 4) return "text-blue-600 font-semibold";
	return "text-red-600";
};

export default function FixtureAnalysisPage() {
	const [gameweek, setGameweek] = useState(7);
	const [activeTab, setActiveTab] = useState("fixtures");
	const [sortBy, setSortBy] = useState("overall");
	const [sortOrder, setSortOrder] = useState("desc");
	const [expandedOpportunity, setExpandedOpportunity] = useState(null);
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
				const resFixtures = await fetch(`${API_BASE_URL}/api/fixtures`);
				if (!resFixtures.ok) throw new Error('Failed to fetch fixtures');
				const dataFixtures = await resFixtures.json();

				const transformedFixtures = dataFixtures.map(f => {
					// Calculate favorability based on average of attack and defense scores
					const homeAvgScore = (f.home_team.attack.score + f.home_team.defense.score) / 2;
					const awayAvgScore = (f.away_team.attack.score + f.away_team.defense.score) / 2;
					let favorability;
					if (homeAvgScore > awayAvgScore + 0.5) {
						favorability = f.home_team.name;
					} else if (awayAvgScore > homeAvgScore + 0.5) {
						favorability = f.away_team.name;
					} else {
						favorability = "Neutral"; // No clear favorite if scores are close
					}
					return {
						gw: f.gameweek,
						fixture: f.fixture,
						teams: {
							home: {
								team: f.home_team.name,
								attack: { ...f.home_team.attack, level: f.home_team.attack.level.toUpperCase() },
								defense: { ...f.home_team.defense, level: f.home_team.defense.level.toUpperCase() },
								rank: f.home_team.rank
							},
							away: {
								team: f.away_team.name,
								attack: { ...f.away_team.attack, level: f.away_team.attack.level.toUpperCase() },
								defense: { ...f.away_team.defense, level: f.away_team.defense.level.toUpperCase() },
								rank: f.away_team.rank
							}
						},
						favorability // Add calculated favorability
					};
				});
				setFixtures(transformedFixtures);

				// Fetch fixture opportunities
				const resOpportunities = await fetch(`${API_BASE_URL}/api/fixtures_opportunity`);
				if (!resOpportunities.ok) throw new Error('Failed to fetch fixture opportunities');
				const dataOpportunities = await resOpportunities.json();
				const transformedAttack = dataOpportunities.attack.map(o => ({
					gw: o.gameweek,
					matchup: `${o.team} vs ${o.opponent}`,
					team: o.team,
					venue: o.venue,
					score: o.score,
					level: o.level.toUpperCase()
				}));
				const transformedDefense = dataOpportunities.defense.map(o => ({
					gw: o.gameweek,
					matchup: `${o.team} vs ${o.opponent}`,
					team: o.team,
					venue: o.venue,
					score: o.score,
					level: o.level.toUpperCase()
				}));
				setFixtureOpportunities({ attack: transformedAttack, defense: transformedDefense });

				// Fetch team fixture summary
				const resSummary = await fetch(`${API_BASE_URL}/api/team_fixtures`);
				if (!resSummary.ok) throw new Error('Failed to fetch team fixture summary');
				const dataSummary = await resSummary.json();
				const transformedSummary = dataSummary.map(t => ({
					team: t.team,
					att: t.attack_difficulty,
					def: t.defense_difficulty,
					overall: t.overall_difficulty,
					fixtures: t.num_fixtures
				}));
				setTeamFixtureSummary(transformedSummary);


			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, []);

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

	const getSortIcon = (column) => {
		if (sortBy !== column) return <ArrowUpDown className="h-3 w-3" />;
		return sortOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
	};

	const currentFixtures = fixtures.filter((f) => f.gw === gameweek);
	const fixtureStats = useMemo(() => {
		const stats = { target: 0, consider: 0, avoid: 0 };
		currentFixtures.forEach((f) => {
			const avgHomeScore = (f.teams.home.attack.score + f.teams.home.defense.score) / 2;
			if (avgHomeScore >= 4) stats.target++;
			else if (avgHomeScore >= 2) stats.consider++;
			else stats.avoid++;
		});
		return stats;
	}, [currentFixtures]);

	if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
	if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Error: {error}</div>;

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
					</p>
				</div>

				<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
					<TabsList className="bg-secondary/50 p-1 rounded-lg border w-full grid grid-cols-2 sm:grid-cols-4 gap-1 text-background">
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
						<TabsTrigger
							value="transfers"
							className="flex items-center justify-center gap-2 text-xs sm:text-sm px-2 py-2 transition-all duration-300 hover:scale-105 data-[state=active]:shadow-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white"
						>
							<Users className="h-3 w-3 sm:h-4 sm:w-4" />
							<span className="hidden sm:inline">Transfers</span>
						</TabsTrigger>
					</TabsList>

					<TabsContent value="fixtures" className="space-y-4 sm:space-y-6">
						{/* Gameweek Selector */}
						<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
							<div className="flex items-center justify-center gap-3 sm:gap-6">
								<Button
									onClick={() => setGameweek(Math.max(7, gameweek - 1))}
									variant="ghost"
									size="icon"
									className="h-9 w-9 sm:h-11 sm:w-11 rounded-full hover:bg-muted/60 transition"
								>
									<ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
								</Button>

								<div className="px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-xl bg-secondary/70 backdrop-blur font-semibold text-lg sm:text-xl shadow-sm">
									Gameweek {gameweek}
								</div>

								<Button
									onClick={() => setGameweek(gameweek + 1)}
									variant="ghost"
									size="icon"
									className="h-9 w-9 sm:h-11 sm:w-11 rounded-full hover:bg-muted/60 transition"
								>
									<ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
								</Button>
							</div>

							<div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
								<Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-300">
									Target: {fixtureStats.target}
								</Badge>
								<Badge variant="secondary" className="bg-blue-500/20 text-blue-700 dark:text-blue-300">
									Consider: {fixtureStats.consider}
								</Badge>
								<Badge variant="secondary" className="bg-red-500/20 text-red-700 dark:text-red-300">
									Avoid: {fixtureStats.avoid}
								</Badge>
							</div>
						</div>

						{/* Fixtures Grid */}
						<div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
							{currentFixtures.map((fixture, index) => (
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
										<div className={`p-3 sm:p-4 rounded-xl border ${getFavorabilityColor(fixture.favorability, fixture.teams.home.team)} transition-all duration-300`}>
											<div className="flex items-center justify-between mb-2 sm:mb-3">
												<h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
													{fixture.teams.home.team} (H)
												</h3>
												<div className="flex items-center gap-1 sm:gap-2">
													<Badge
														variant="outline"
														className={`text-xs sm:text-sm border ${getRankColor(fixture.teams.home.rank.attack)} bg-transparent hover:bg-accent/10 transition-all duration-200`}
														title="Attack Rank: Higher rank indicates stronger attacking performance"
													>
														<Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
														A#{fixture.teams.home.rank.attack}
													</Badge>
													<Badge
														variant="outline"
														className={`text-xs sm:text-sm border ${getRankColor(fixture.teams.home.rank.defense)} bg-transparent hover:bg-accent/10 transition-all duration-200`}
														title="Defense Rank: Higher rank indicates stronger defensive performance"
													>
														<Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
														D#{fixture.teams.home.rank.defense}
													</Badge>
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2 sm:gap-3">
												<div className="space-y-1">
													<div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
														<Target className="h-3 w-3 sm:h-4 sm:w-4" />
														Attack
													</div>
													<Badge className={`text-xs sm:text-sm w-full justify-center ${getLevelColor(fixture.teams.home.attack.level)}`}>
														{fixture.teams.home.attack.level}
													</Badge>
													<p className={`text-center font-mono font-bold text-xs sm:text-sm ${getScoreColor(fixture.teams.home.attack.score)}`}>
														{fixture.teams.home.attack.score > 0 ? '+' : ''}{fixture.teams.home.attack.score}
													</p>
												</div>
												<div className="space-y-1">
													<div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
														<Shield className="h-3 w-3 sm:h-4 sm:w-4" />
														Defense
													</div>
													<Badge className={`text-xs sm:text-sm w-full justify-center ${getLevelColor(fixture.teams.home.defense.level)}`}>
														{fixture.teams.home.defense.level}
													</Badge>
													<p className={`text-center font-mono font-bold text-xs sm:text-sm ${getScoreColor(fixture.teams.home.defense.score)}`}>
														{fixture.teams.home.defense.score > 0 ? '+' : ''}{fixture.teams.home.defense.score}
													</p>
												</div>
											</div>
											<div className="flex items-center justify-between text-xs mt-2">
												<div className="flex items-center gap-2">
													<span>Defense Rank</span>
													<span className={`text-xs ${getRankColor(fixture.teams.home.rank.defense)}`}>#{fixture.teams.home.rank.defense}</span>
												</div>
												<div className="flex items-center gap-1">
													<Badge className={`text-xs border ${getLevelColor(fixture.teams.home.defense.level)}`}>
														{fixture.teams.home.defense.score > 0 ? '+' : ''}{fixture.teams.home.defense.score}
													</Badge>
												</div>
											</div>
										</div>

										{/* Away Team */}
										<div className={`p-3 sm:p-4 rounded-xl border ${getFavorabilityColor(fixture.favorability, fixture.teams.away.team)} transition-all duration-300`}>
											<div className="flex items-center justify-between mb-2 sm:mb-3">
												<h3 className="font-semibold text-sm sm:text-base text-foreground truncate">
													{fixture.teams.away.team} (A)
												</h3>
												<div className="flex items-center gap-1 sm:gap-2">
													<Badge
														variant="outline"
														className={`text-xs sm:text-sm border ${getRankColor(fixture.teams.away.rank.attack)} bg-transparent hover:bg-accent/10 transition-all duration-200`}
														title="Attack Rank: Higher rank indicates stronger attacking performance"
													>
														<Target className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
														A#{fixture.teams.away.rank.attack}
													</Badge>
													<Badge
														variant="outline"
														className={`text-xs sm:text-sm border ${getRankColor(fixture.teams.away.rank.defense)} bg-transparent hover:bg-accent/10 transition-all duration-200`}
														title="Defense Rank: Higher rank indicates stronger defensive performance"
													>
														<Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
														D#{fixture.teams.away.rank.defense}
													</Badge>
												</div>
											</div>
											<div className="grid grid-cols-2 gap-2 sm:gap-3">
												<div className="space-y-1">
													<div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
														<Target className="h-3 w-3 sm:h-4 sm:w-4" />
														Attack
													</div>
													<Badge className={`text-xs sm:text-sm w-full justify-center ${getLevelColor(fixture.teams.away.attack.level)}`}>
														{fixture.teams.away.attack.level}
													</Badge>
													<p className={`text-center font-mono font-bold text-xs sm:text-sm ${getScoreColor(fixture.teams.away.attack.score)}`}>
														{fixture.teams.away.attack.score > 0 ? '+' : ''}{fixture.teams.away.attack.score}
													</p>
												</div>
												<div className="space-y-1">
													<div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
														<Shield className="h-3 w-3 sm:h-4 sm:w-4" />
														Defense
													</div>
													<Badge className={`text-xs sm:text-sm w-full justify-center ${getLevelColor(fixture.teams.away.defense.level)}`}>
														{fixture.teams.away.defense.level}
													</Badge>
													<p className={`text-center font-mono font-bold text-xs sm:text-sm ${getScoreColor(fixture.teams.away.defense.score)}`}>
														{fixture.teams.away.defense.score > 0 ? '+' : ''}{fixture.teams.away.defense.score}
													</p>
												</div>
											</div>
											<div className="flex items-center justify-between text-xs mt-2">
												<div className="flex items-center gap-2">
													<span>Defense Rank</span>
													<span className={`text-xs ${getRankColor(fixture.teams.away.rank.defense)}`}>#{fixture.teams.away.rank.defense}</span>
												</div>
												<div className="flex items-center gap-1">
													<Badge className={`text-xs border ${getLevelColor(fixture.teams.away.defense.level)}`}>
														{fixture.teams.away.defense.score > 0 ? '+' : ''}{fixture.teams.away.defense.score}
													</Badge>
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
							<Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
								<CardHeader className="pb-3 sm:pb-4">
									<CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
										🔥 Best Attacking Opportunities
										<Badge variant="secondary" className="ml-auto text-xs">
											GW7-9
										</Badge>
									</CardTitle>
								</CardHeader>
								<CardContent className="p-3 sm:p-6">
									<div className="space-y-2 sm:space-y-3">
										{fixtureOpportunities.attack.map((opp, index) => (
											<div
												key={index}
												className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
												onClick={() => setExpandedOpportunity(expandedOpportunity === `att-${index}` ? null : `att-${index}`)}
											>
												<div className="flex items-center justify-between mb-2">
													<div className="flex items-center gap-2">
														<div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/20 text-red-600 font-bold text-xs flex items-center justify-center">
															{index + 1}
														</div>
														<span className="text-xs sm:text-sm font-medium text-muted-foreground">GW {opp.gw}</span>
													</div>
													<Badge className={`text-xs border ${getLevelColor(opp.level)}`}>
														🔥 {opp.level}
													</Badge>
												</div>

												<div className="mb-2">
													<p className="text-sm sm:text-base font-semibold text-foreground">{opp.matchup}</p>
													<p className="text-xs sm:text-sm text-muted-foreground">
														Target: <span className="text-accent font-medium">{opp.team}</span> ({opp.venue})
													</p>
												</div>

												<div className="flex items-center justify-between">
													<span className="text-xs text-muted-foreground">Difficulty Score</span>
													<span className={`font-mono font-bold ${getScoreColor(opp.score)}`}>
														{opp.score > 0 ? '+' : ''}{opp.score}
													</span>
												</div>

												{expandedOpportunity === `att-${index}` && (
													<div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
														Additional analysis and player recommendations would go here.
													</div>
												)}
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Defensive Opportunities */}
							<Card className="border-border bg-card/50 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all duration-300">
								<CardHeader className="pb-3 sm:pb-4">
									<CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
										🛡️ Best Defensive Opportunities
										<Badge variant="secondary" className="ml-auto text-xs">
											GW7-9
										</Badge>
									</CardTitle>
								</CardHeader>
								<CardContent className="p-3 sm:p-6">
									<div className="space-y-2 sm:space-y-3">
										{fixtureOpportunities.defense.map((opp, index) => (
											<div
												key={index}
												className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-secondary/30 to-secondary/10 border border-border/50 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer"
												onClick={() => setExpandedOpportunity(expandedOpportunity === `def-${index}` ? null : `def-${index}`)}
											>
												<div className="flex items-center justify-between mb-2">
													<div className="flex items-center gap-2">
														<div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 text-blue-600 font-bold text-xs flex items-center justify-center">
															{index + 1}
														</div>
														<span className="text-xs sm:text-sm font-medium text-muted-foreground">GW {opp.gw}</span>
													</div>
													<Badge className={`text-xs border ${getLevelColor(opp.level)}`}>
														🛡️ {opp.level}
													</Badge>
												</div>

												<div className="mb-2">
													<p className="text-sm sm:text-base font-semibold text-foreground">{opp.matchup}</p>
													<p className="text-xs sm:text-sm text-muted-foreground">
														Target: <span className="text-blue-600 font-medium">{opp.team}</span> ({opp.venue})
													</p>
												</div>

												<div className="flex items-center justify-between">
													<span className="text-xs text-muted-foreground">Difficulty Score</span>
													<span className={`font-mono font-bold ${getScoreColor(opp.score)}`}>
														{opp.score > 0 ? '+' : ''}{opp.score}
													</span>
												</div>

												{expandedOpportunity === `def-${index}` && (
													<div className="mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
														Additional analysis and player recommendations would go here.
													</div>
												)}
											</div>
										))}
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>

					<TabsContent value="summary" className="space-y-4 sm:space-y-6">
						<Card className="border-border bg-card/50 backdrop-blur-md shadow-xl">
							<CardHeader className="pb-3 sm:pb-4">
								<CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
									🏆 Team Fixture Difficulty Summary
									<Badge variant="secondary" className="ml-auto text-xs">
										Next 4-5 GWs
									</Badge>
								</CardTitle>
								<p className="text-xs sm:text-sm text-muted-foreground">
									Higher scores = easier fixtures, negative = harder fixtures
								</p>
							</CardHeader>
							<CardContent className="p-3 sm:p-6">
								<div className="overflow-x-auto">
									<table className="w-full text-xs sm:text-sm">
										<thead>
											<tr className="border-b border-border text-left text-muted-foreground">
												<th className="pb-2 sm:pb-3 font-medium">Rank</th>
												<th className="pb-2 sm:pb-3 font-medium">Team</th>
												<th
													className="pb-2 sm:pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
													onClick={() => handleSort("att")}
												>
													<div className="flex items-center gap-1">
														Attack {getSortIcon("att")}
													</div>
												</th>
												<th
													className="pb-2 sm:pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
													onClick={() => handleSort("def")}
												>
													<div className="flex items-center gap-1">
														Defense {getSortIcon("def")}
													</div>
												</th>
												<th
													className="pb-2 sm:pb-3 font-medium cursor-pointer hover:text-foreground transition-colors"
													onClick={() => handleSort("overall")}
												>
													<div className="flex items-center gap-1">
														Overall {getSortIcon("overall")}
													</div>
												</th>
												<th className="pb-2 sm:pb-3 font-medium">Fixtures</th>
											</tr>
										</thead>
										<tbody>
											{sortedTeamData.map((team, index) => (
												<tr
													key={team.team}
													className="group border-b border-border/50 transition-all duration-300 hover:bg-secondary/30 hover:shadow-sm cursor-pointer"
												>
													<td className="py-2 sm:py-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors duration-200">
														<div className="flex items-center gap-2">
															<div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-accent/10 group-hover:bg-accent/20 flex items-center justify-center text-xs font-bold transition-colors duration-200">
																{index + 1}
															</div>
														</div>
													</td>
													<td className="py-2 sm:py-4 font-medium text-foreground group-hover:text-accent transition-colors duration-200">
														{team.team}
													</td>
													<td className="py-2 sm:py-4">
														<div className="flex items-center gap-1 sm:gap-2">
															<span className="text-sm sm:text-lg">{getDifficultyEmoji(team.att)}</span>
															<span className={`font-mono text-xs sm:text-sm ${getScoreColor(team.att)}`}>
																{team.att > 0 ? '+' : ''}{team.att.toFixed(1)}
															</span>
														</div>
													</td>
													<td className="py-2 sm:py-4">
														<div className="flex items-center gap-1 sm:gap-2">
															<span className="text-sm sm:text-lg">{getDifficultyEmoji(team.def)}</span>
															<span className={`font-mono text-xs sm:text-sm ${getScoreColor(team.def)}`}>
																{team.def > 0 ? '+' : ''}{team.def.toFixed(1)}
															</span>
														</div>
													</td>
													<td className="py-2 sm:py-4 font-mono font-bold text-accent group-hover:text-accent/80 transition-colors duration-200">
														{team.overall > 0 ? '+' : ''}{team.overall.toFixed(1)}
													</td>
													<td className="py-2 sm:py-4 font-mono text-muted-foreground group-hover:text-foreground transition-colors duration-200">
														{team.fixtures}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent value="transfers" className="space-y-6">
						<div className="grid gap-6 lg:grid-cols-2">
							<Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20 backdrop-blur">
								<CardHeader>
									<CardTitle className="text-green-800 dark:text-green-200 flex items-center gap-2">
										🎯 Target Teams for Transfers
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div>
											<h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">🔥 Attacking Assets:</h4>
											<ul className="space-y-1 text-sm">
												<li>• Liverpool (3 good fixtures)</li>
												<li>• Arsenal (2 good fixtures)</li>
												<li>• Newcastle (2 good fixtures)</li>
											</ul>
										</div>
										<div>
											<h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">🛡️ Defensive Assets:</h4>
											<ul className="space-y-1 text-sm">
												<li>• Arsenal (3 good fixtures)</li>
												<li>• Liverpool (2 good fixtures)</li>
												<li>• Chelsea (2 good fixtures)</li>
											</ul>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20 backdrop-blur">
								<CardHeader>
									<CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
										❌ Avoid These Teams
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-4">
										<div>
											<h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">⚔️ Poor Attacking Fixtures:</h4>
											<ul className="space-y-1 text-sm">
												<li>• Man United (3 tough fixtures)</li>
												<li>• West Ham (2 tough fixtures)</li>
												<li>• Wolves (2 tough fixtures)</li>
											</ul>
										</div>
										<div>
											<h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">🏰 Poor Defensive Fixtures:</h4>
											<ul className="space-y-1 text-sm">
												<li>• Brighton (3 tough fixtures)</li>
												<li>• Everton (2 tough fixtures)</li>
												<li>• Southampton (2 tough fixtures)</li>
											</ul>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}