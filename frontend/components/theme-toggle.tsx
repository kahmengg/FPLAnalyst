"use client"
import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const current = mounted ? theme : "system"
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor
  const label = current === "dark" ? "Dark" : current === "light" ? "Light" : "System"

  return (
    <button
      type="button"
      disabled={!mounted}
      onClick={() => setTheme(current === "light" ? "dark" : current === "dark" ? "system" : "light")}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground disabled:opacity-70"
    >
      <Icon className="h-[18px] w-[18px]" />
      <span className="flex-1 text-left">Theme</span>
      <span className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">{label}</span>
    </button>
  )
}
