import Link from "next/link"
import { TrendingUp, Trophy, Calendar, Gem, ArrowLeftRight, Target, Users, Shield, Activity, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useEffect } from "react"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000"
const MAX_RETRIES = 3

// Default stats in case API fetch fails
const defaultQuickStats = [
  { label: "Total Players Analyzed", value: "500+", icon: Users, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  { label: "Teams Ranked", value: "20", icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { label: "Fixtures Analyzed", value: "8 GWs", icon: Activity, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { label: "Last Updated", value: "Live", icon: Clock, color: "text-orange-500", bgColor: "bg-orange-500/10" },
]

const actionCards = [
  {
    title: "Top Performers",
    description: "Goal leaders, value players, and season stars",
    icon: TrendingUp,
    href: "/top-performers",
    color: "bg-gradient-to-br from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-500",
    gradientFrom: "from-emerald-500/5",
    gradientTo: "to-emerald-600/5",
  },
  {
    title: "Team Rankings",
    description: "Attack and defense strength analysis",
    icon: Trophy,
    href: "/team-rankings",
    color: "bg-gradient-to-br from-amber-500/20 to-orange-600/20",
    iconColor: "text-amber-500",
    gradientFrom: "from-amber-500/5",
    gradientTo: "to-orange-600/5",
  },
  {
    title: "Fixture Analysis",
    description: "Gameweek difficulty and matchup insights",
    icon: Calendar,
    href: "/fixture-analysis",
    color: "bg-gradient-to-br from-blue-500/20 to-cyan-600/20",
    iconColor: "text-blue-500",
    gradientFrom: "from-blue-500/5",
    gradientTo: "to-cyan-600/5",
  },
  {
    title: "Quick Picks",
    description: "Position-based instant recommendations",
    icon: Target,
    href: "/quick-picks",
    color: "bg-gradient-to-br from-indigo-500/20 to-blue-600/20",
    iconColor: "text-indigo-500",
    gradientFrom: "from-indigo-500/5",
    gradientTo: "to-blue-600/5",
  },  
  {
    title: "Transfer Strategy",
    description: "Multi-gameweek planning and recommendations",
    icon: ArrowLeftRight,
    href: "/transfer-strategy",
    color: "bg-gradient-to-br from-red-500/20 to-rose-600/20",
    iconColor: "text-red-500",
    gradientFrom: "from-red-500/5",
    gradientTo: "to-rose-600/5",
  },
]

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      return await response.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay between retries
    }
  }
}

export default function HomePage() {
  const [quickStats, setQuickStats] = useState(defaultQuickStats)
  const [gameweek, setGameWeek] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchWithRetry(`${API_BASE_URL}/api/summary-stats`)
        const summary = data[0] // Assume single object in array
        const mappedStats = [
          {
            label: "Total Players Analyzed",
            value: summary.number_of_players.toString(),
            icon: Users,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
          },
          {
            label: "Teams Ranked",
            value: summary.total_teams.toString(),
            icon: Shield,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
          },
          {
            label: "Fixtures Analyzed",
            value: `${summary.total_gameweeks} GWs`,
            icon: Activity,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
          },
          {
            label: "Last Updated",
            value: "Live",
            icon: Clock,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
          },
        ]
        setQuickStats(mappedStats)
        setGameWeek(summary.total_gameweeks)
      } catch (err) {
        setError(`Failed to fetch summary stats: ${err.message}`)
        setQuickStats(defaultQuickStats) // Fallback to default
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-blue-500/10 px-4 py-2 mb-6 border border-emerald-500/20">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Live Analytics</span>
          </div>
          
          <h1 className="mb-4 text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent leading-tight">
            FPL Analyst
          </h1>
          <p className="text-xl sm:text-2xl font-medium text-emerald-600 dark:text-emerald-400 mb-3">
            Your Strategic Advantage
          </p>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Gameweek {gameweek} • 2025/26 Season 
          </p>
        </div>

        {/* Enhanced Quick Stats Grid with staggered animations */}
        <div className="mb-16">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {quickStats.map((stat, index) => (
              <Card 
                key={stat.label} 
                className="group relative overflow-hidden border-0 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-in fade-in slide-in-from-bottom-8"
                style={{ 
                  animationDelay: `${index * 150}ms`,
                  animationFillMode: 'both'
                }}
              >
                {/* Subtle gradient overlay */}
                <div className={`absolute inset-0 ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <CardContent className="relative flex items-center gap-4 p-6">
                  <div className={`rounded-xl ${stat.bgColor} p-3 transition-transform duration-300 group-hover:scale-110`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                      {stat.value}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Enhanced Action Cards Section */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
          <div className="text-center mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3">
              Explore Analytics
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-500 to-blue-500 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {actionCards.map((card, index) => (
              <Link key={card.title} href={card.href} className="group block">
                <Card 
                  className="relative overflow-hidden border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 h-full animate-in fade-in slide-in-from-bottom-8"
                  style={{ 
                    animationDelay: `${(index * 100) + 500}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {/* Animated gradient background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-0 group-hover:opacity-100 transition-all duration-500`}></div>
                  
                  {/* Animated border effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                  
                  <CardHeader className="relative p-6 sm:p-8">
                    {/* Enhanced icon with multiple animations */}
                    <div className="relative mb-4">
                      <div className={`inline-flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl ${card.color} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                        <card.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${card.iconColor} transition-transform duration-300 group-hover:scale-110`} />
                      </div>
                      {/* Pulse effect on hover */}
                      <div className={`absolute inset-0 rounded-2xl ${card.color} opacity-0 group-hover:opacity-60 animate-ping`}></div>
                    </div>
                    
                    <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors duration-300 mb-3">
                      {card.title}
                    </CardTitle>
                    
                    <CardDescription className="text-slate-600 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors duration-300 text-base leading-relaxed">
                      {card.description}
                    </CardDescription>
                    
                    {/* Arrow indicator */}
                    <div className="flex items-center mt-4 text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-all duration-300">
                      <span>Explore</span>
                      <svg 
                        className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Enhanced Footer Section */}
        <div className="mt-20 text-center animate-in fade-in duration-1000 delay-700">
          <div className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="h-1 w-8 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-600 rounded-full"></div>
            <span>Powered by advanced FPL analytics</span>
            <div className="h-1 w-8 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
