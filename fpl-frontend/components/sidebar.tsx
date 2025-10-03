"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Trophy, Calendar, Gem, ArrowLeftRight, Target, Menu, X, Clock } from "lucide-react"
import { useState } from "react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, color: "text-emerald-500", bgColor: "bg-emerald-500/10", hoverColor: "hover:bg-emerald-500/20" },
  { name: "Top Performers", href: "/top-performers", icon: TrendingUp, color: "text-blue-500", bgColor: "bg-blue-500/10", hoverColor: "hover:bg-blue-500/20" },
  { name: "Team Rankings", href: "/team-rankings", icon: Trophy, color: "text-amber-500", bgColor: "bg-amber-500/10", hoverColor: "hover:bg-amber-500/20" },
  { name: "Fixture Analysis", href: "/fixture-analysis", icon: Calendar, color: "text-purple-500", bgColor: "bg-purple-500/10", hoverColor: "hover:bg-purple-500/20" },
  { name: "Transfer Strategy", href: "/transfer-strategy", icon: ArrowLeftRight, color: "text-red-500", bgColor: "bg-red-500/10", hoverColor: "hover:bg-red-500/20" },
  { name: "Quick Picks", href: "/quick-picks", icon: Target, color: "text-indigo-500", bgColor: "bg-indigo-500/10", hoverColor: "hover:bg-indigo-500/20" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2 shadow-lg border border-slate-200 dark:border-slate-700 transition-all duration-300 hover:scale-105"
      >
        <Menu className="h-5 w-5 text-slate-700 dark:text-slate-300" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 top-0 h-screen w-72 z-50 transform transition-all duration-300 ease-in-out
        lg:translate-x-0 lg:z-30
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
        border-r border-slate-200/50 dark:border-slate-700/50
        shadow-xl lg:shadow-lg
      `}>
        <div className="flex h-full flex-col">
          {/* Enhanced Logo Section */}
          <div className="relative flex h-20 items-center border-b border-slate-200/50 dark:border-slate-700/50 px-6 bg-gradient-to-r from-emerald-500/5 to-blue-500/5">
            {/* Mobile Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-4 top-6 lg:hidden rounded-lg p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              {/* Enhanced Logo Icon */}
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 opacity-20 blur-lg"></div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">
                  FPL Analyst
                </h1>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    GW 15 • 2024/25 • Live
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Navigation */}
          <nav className="flex-1 space-y-2 px-4 py-6">
            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 mb-3">
                Analytics
              </p>
              {navigation.map((item, index) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`
                      group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-300
                      animate-in fade-in slide-in-from-left-4
                      ${isActive
                        ? `${item.bgColor} ${item.color} shadow-lg shadow-${item.color.split('-')[1]}-500/20`
                        : `text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white ${item.hoverColor}`
                      }
                    `}
                    style={{ 
                      animationDelay: `${index * 75}ms`,
                      animationFillMode: 'both'
                    }}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 ${item.color.replace('text-', 'bg-')} rounded-r-full`}></div>
                    )}
                    
                    {/* Icon with enhanced styling */}
                    <div className={`
                      relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300
                      ${isActive 
                        ? `${item.bgColor.replace('/10', '/20')} ${item.color}` 
                        : 'group-hover:bg-slate-100 dark:group-hover:bg-slate-700/50'
                      }
                      group-hover:scale-110
                    `}>
                      <item.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                      
                      {/* Subtle glow for active state */}
                      {isActive && (
                        <div className={`absolute inset-0 rounded-lg ${item.bgColor.replace('/10', '/30')} blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                      )}
                    </div>
                    
                    <span className="flex-1 transition-all duration-300 group-hover:translate-x-1">
                      {item.name}
                    </span>
                    
                    {/* Hover arrow indicator */}
                    <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Enhanced Footer with more info */}
          <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-4 space-y-3">
            {/* Status Card */}
            <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-4 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Last Updated</p>
              </div>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                {new Date().toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Real-time data</p>
              </div>
            </div>
        </div>
      </aside>

      {/* Content Spacer for Desktop */}
      <div className="hidden lg:block w-72 flex-shrink-0"></div>
    </>
  )
}
