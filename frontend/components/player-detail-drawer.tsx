"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Clock3, RefreshCw } from "lucide-react"

import { PlayerPortrait } from "@/components/player-portrait"
import { TouchProfile } from "@/components/touch-profile"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { scoreForRole, scoreLabel } from "@/lib/decision-model"
import type { PlayerRoleInsight } from "@/lib/player-role-insights"
import { playerGameweeksQuery } from "@/lib/research-queries"
import { buildTouchProfile } from "@/lib/touch-profile"

type PlayerDetailDrawerProps = {
  player: PlayerRoleInsight | null
  cohort: PlayerRoleInsight[]
  open: boolean
  onOpenChange(open: boolean): void
}

function metric(value: number, suffix = "") {
  return `${value.toFixed(1).replace(/\.0$/, "")}${suffix}`
}

export function PlayerDetailDrawer({ player, cohort, open, onOpenChange }: PlayerDetailDrawerProps) {
  const gameweeks = useQuery(playerGameweeksQuery(player?.playerId ?? "", 5))
  const rows = gameweeks.data ?? []
  const touchProfile = buildTouchProfile(
    rows.map((row) => ({
      minutes: row.minutes,
      touches: row.touches,
      touchesOppBox: row.penalty_area_touches,
    })),
    cohort.map((item) => item.touchesBoxPer90).filter(Number.isFinite),
  )

  if (!player) return null

  const roleScore = scoreForRole(player)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-describedby={undefined}>
        <div className="pr-14">
          <PlayerPortrait name={player.name} photoCode={player.photoCode} teamCode={player.teamCode} size="lg" priority />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-primary">{player.position} · {player.team}</p>
          <SheetTitle className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground">{player.name}</SheetTitle>
          <SheetDescription className="mt-2 text-sm leading-6 text-muted-foreground">
            Role quality, recent output and aggregate touch volume in one view.
          </SheetDescription>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-surface-tint p-3">
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{scoreLabel(player.position)}</p><p className="mt-1 font-mono text-xl font-semibold">{roleScore === null ? "—" : Math.round(roleScore)}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Price</p><p className="mt-1 font-mono text-xl font-semibold">£{metric(player.price)}m</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Minutes</p><p className="mt-1 font-mono text-xl font-semibold">{Math.round(player.minutes)}</p></div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Points / 90</dt><dd className="mt-1 font-mono text-lg font-semibold">{metric(player.pointsPer90)}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">xGI / 90</dt><dd className="mt-1 font-mono text-lg font-semibold">{metric(player.xGIPer90)}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">60+ reliability</dt><dd className="mt-1 font-mono text-lg font-semibold">{metric(player.minuteSecurity * 100, "%")}</dd></div>
          <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Ownership</dt><dd className="mt-1 font-mono text-lg font-semibold">{metric(player.ownership, "%")}</dd></div>
        </dl>

        <div className="mt-5">
          {gameweeks.isPending ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground"><Clock3 className="mr-2 h-4 w-4 animate-pulse" />Loading recent data…</div>
          ) : gameweeks.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Recent data could not be loaded.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => gameweeks.refetch()}><RefreshCw className="h-4 w-4" />Retry</Button>
            </div>
          ) : (
            <TouchProfile profile={touchProfile} />
          )}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button asChild><Link href={`/player-trends?position=${player.positionCode}&players=${player.playerId}`}>Compare player <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline"><Link href={`/fixture-analysis?club=${player.teamCode}`}>View team fixtures</Link></Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
