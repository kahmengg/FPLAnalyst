import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export function MetricPill({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "primary" | "football"; className?: string }) {
  return (
    <span className={cn(
      "inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-semibold",
      tone === "primary" && "border-primary/20 bg-brand-soft text-primary",
      tone === "football" && "border-football/20 bg-football-soft text-football",
      tone === "neutral" && "border-border bg-secondary text-secondary-foreground",
      className,
    )}>
      {children}
    </span>
  )
}
