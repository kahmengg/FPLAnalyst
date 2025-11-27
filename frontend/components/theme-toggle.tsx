"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center w-full gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 transition-all duration-300"
        disabled
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg">
          <Sun className="h-5 w-5" />
        </div>
        <span className="flex-1 text-left">Theme</span>
      </button>
    )
  }

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("system")
    } else {
      setTheme("light")
    }
  }

  const getThemeIcon = () => {
    if (theme === "dark") {
      return <Moon className="h-5 w-5" />
    } else if (theme === "light") {
      return <Sun className="h-5 w-5" />
    } else {
      return (
        <div className="relative">
          <Sun className="h-5 w-5 absolute" />
          <Moon className="h-5 w-5 opacity-40" />
        </div>
      )
    }
  }

  const getThemeLabel = () => {
    if (theme === "dark") return "Dark"
    if (theme === "light") return "Light"
    return "System"
  }

  return (
    <button
      onClick={toggleTheme}
      className="group flex items-center justify-between w-full gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all duration-300"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg group-hover:bg-slate-200 dark:group-hover:bg-slate-600/50 transition-all duration-300 group-hover:scale-110">
          {getThemeIcon()}
        </div>
        <span className="transition-all duration-300 group-hover:translate-x-1">
          Theme
        </span>
      </div>
      <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md font-medium">
        {getThemeLabel()}
      </span>
    </button>
  )
}
