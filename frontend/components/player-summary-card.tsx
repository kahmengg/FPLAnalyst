import type { ReactNode } from "react"
import { Activity, ShieldCheck } from "lucide-react"

import { TeamBadge } from "@/components/team-badge"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type PlayerSummary = {
  name: string
  teamCode: string
  teamName?: string
  position?: string
  price?: number
  totalPoints?: number
  pointsLabel?: string
  form?: number
  expectedPoints?: number
  fixtureDifficulty?: number
  ownership?: number
  defensiveContribution?: number
  status?: string
}

function metric(value: number | undefined, digits = 1) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits).replace(/\.0$/, "") : "—"
}

function formTone(form = 0) {
  if (form >= 7) return "border-success/30 bg-success/10 text-success"
  if (form >= 5) return "border-warning/30 bg-warning/10 text-warning"
  return "border-border bg-secondary text-muted-foreground"
}

export function PlayerSummaryCard({ player, rank, className, footer }: { player: PlayerSummary; rank?: number; className?: string; footer?: ReactNode }) {
  const stats = [
    player.totalPoints !== undefined ? [player.pointsLabel ?? "Points", metric(player.totalPoints, player.pointsLabel ? 1 : 0)] : null,
    player.expectedPoints !== undefined ? ["Expected", metric(player.expectedPoints)] : null,
    player.ownership !== undefined ? ["Owned", `${metric(player.ownership)}%`] : null,
    player.defensiveContribution !== undefined ? ["Def. contrib.", metric(player.defensiveContribution, 0)] : null,
  ].filter(Boolean) as string[][]

  return (
    <article className={cn("rounded-xl border border-border bg-card p-4 transition-colors hover:bg-secondary/25", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamBadge code={player.teamCode || player.teamName || "FPL"} />
          <div className="min-w-0">
            <h3 className="truncate font-sans text-base font-semibold text-foreground">{player.name}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              {player.position ? <span>{player.position}</span> : null}
              {player.teamName ? <><span aria-hidden="true">·</span><span className="truncate">{player.teamName}</span></> : null}
            </div>
          </div>
        </div>
        {rank ? <span className="font-mono text-sm font-semibold text-muted-foreground">#{rank}</span> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {player.form !== undefined ? <Badge variant="outline" className={formTone(player.form)}><Activity className="h-3 w-3" />Form {metric(player.form)}</Badge> : null}
        {player.price !== undefined ? <Badge variant="outline" className="bg-background font-mono">£{metric(player.price)}m</Badge> : null}
        {player.status && player.status !== "available" ? <Badge variant="outline" className="border-destructive/30 bg-destructive/10 text-destructive">{player.status}</Badge> : null}
        {player.defensiveContribution !== undefined ? <ShieldCheck className="ml-auto h-4 w-4 text-muted-foreground" aria-label="Defensive contribution available" /> : null}
      </div>

      {stats.length ? <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4">{stats.map(([label, value]) => <div key={label}><dt className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</dt><dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{value}</dd></div>)}</dl> : null}
      {footer ? <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">{footer}</div> : null}
    </article>
  )
}
