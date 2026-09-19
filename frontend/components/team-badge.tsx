import { cn } from "@/lib/utils"
import { getTeamBrand, getTeamCode } from "@/lib/team-branding"

type TeamBadgeProps = {
  code: string
  className?: string
}

export function TeamBadge({ code, className }: TeamBadgeProps) {
  const brand = getTeamBrand(code)
  const normalizedCode = getTeamCode(code)

  return (
    <span
      aria-label={`${normalizedCode} club badge`}
      className={cn(
        "inline-flex h-9 min-w-11 items-center justify-center rounded-md border px-2 font-mono text-xs font-bold tracking-[0.08em] shadow-[0_1px_1px_rgba(32,34,31,0.08)]",
        className,
      )}
      style={{
        backgroundColor: brand.background,
        borderColor: brand.border,
        color: brand.foreground,
      }}
    >
      {normalizedCode}
    </span>
  )
}
