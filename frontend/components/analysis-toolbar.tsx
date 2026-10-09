import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function AnalysisToolbar({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-soft)] sm:p-4", className)}
      {...props}
    />
  )
}
