"use client"

import { useEffect, useRef, useState } from "react"
import { Shield, Sparkles, Target, Users, X } from "lucide-react"

import { TeamBadge } from "@/components/team-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type PlayerPick = {
  name: string
  position: string
  position_name: string
  price: number
  goals_pg?: number
  assists_pg?: number
  points_pg?: number
  points_per_game?: number
  ownership?: number
  selected_by_percent?: number
  attacker_score?: number
  defender_score?: number
  form?: number
  cs_rate?: number
  clean_sheet_rate?: number
}

interface TeamPicksModalProps {
  isOpen: boolean
  onClose: () => void
  teamName: string
  teamCode: string
  attackingPlayers: PlayerPick[]
  defensivePlayers: PlayerPick[]
  attackRank?: number
  defenseRank?: number
}

const positionMap: Record<string, string> = {
  Goalkeeper: "GK",
  Defender: "DEF",
  Midfielder: "MID",
  Forward: "FWD",
}

function formatMetric(value: number | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—"
}

function getRecommendation(player: PlayerPick) {
  const score = player.position_name === "Midfielder" || player.position_name === "Forward"
    ? player.attacker_score ?? 0
    : player.defender_score ?? 0
  const points = player.points_per_game ?? 0
  const form = player.form ?? 0
  const ownership = player.selected_by_percent ?? 0
  const isAttacker = player.position_name === "Midfielder" || player.position_name === "Forward"

  if ((isAttacker && score >= 2.2) || (!isAttacker && score >= 3) || (points >= 6 && form >= 5)) {
    return { label: "Top pick", className: "border-success/30 bg-success/10 text-success" }
  }
  if (((isAttacker && score >= 1.6) || (!isAttacker && score >= 2.3)) && ownership < 15) {
    return { label: "Differential", className: "border-foreground/20 bg-secondary text-foreground" }
  }
  if ((isAttacker && score >= 1.5) || (!isAttacker && score >= 2)) {
    return { label: "Solid choice", className: "border-foreground/20 bg-secondary text-foreground" }
  }
  if ((isAttacker && score >= 1) || (!isAttacker && score >= 1.5)) {
    return { label: "Monitor", className: "border-warning/30 bg-warning/10 text-warning" }
  }
  return { label: "Risky", className: "border-destructive/30 bg-destructive/10 text-destructive" }
}

function ownershipLabel(ownership = 0) {
  if (ownership < 10) return "Differential"
  if (ownership < 30) return "Low owned"
  if (ownership < 60) return "Moderate"
  if (ownership < 80) return "Popular"
  return "Template"
}

function PlayerCard({ player, mode }: { player: PlayerPick; mode: "attacking" | "defensive" }) {
  const recommendation = getRecommendation(player)
  const ownership = player.ownership ?? player.selected_by_percent ?? 0
  const score = mode === "attacking" ? player.attacker_score : player.defender_score

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-base font-semibold text-foreground">{player.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">{positionMap[player.position] ?? player.position}</Badge>
            <Badge variant="outline" className={recommendation.className}>{recommendation.label}</Badge>
          </div>
        </div>
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">£{formatMetric(player.price, 1)}m</span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-border pt-4 text-sm">
        <div><dt className="text-xs text-muted-foreground">Points / match</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(player.points_pg)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Form</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(player.form, 1)}</dd></div>
        {mode === "attacking" ? (
          <>
            <div><dt className="text-xs text-muted-foreground">Goals / match</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(player.goals_pg)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Assists / match</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(player.assists_pg)}</dd></div>
          </>
        ) : (
          <div><dt className="text-xs text-muted-foreground">Clean-sheet rate</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{typeof player.cs_rate === "number" ? `${(player.cs_rate * 100).toFixed(0)}%` : "—"}</dd></div>
        )}
        <div><dt className="text-xs text-muted-foreground">Ownership</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(ownership, 1)}%</dd><span className="text-[11px] text-muted-foreground">{ownershipLabel(ownership)}</span></div>
        <div><dt className="text-xs text-muted-foreground">Model score</dt><dd className="mt-1 font-mono font-semibold tabular-nums">{formatMetric(score)}</dd></div>
      </dl>
    </article>
  )
}

export default function TeamPicksModal({
  isOpen,
  onClose,
  teamName,
  teamCode,
  attackingPlayers,
  defensivePlayers,
  attackRank,
  defenseRank,
}: TeamPicksModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const hasAttackingPicks = attackingPlayers.length > 0
  const hasDefensivePicks = defensivePlayers.length > 0
  const [activeTab, setActiveTab] = useState<"attacking" | "defensive">("attacking")

  useEffect(() => {
    if (!isOpen) return

    // Start on the first available category and support the expected Escape shortcut.
    setActiveTab(hasAttackingPicks ? "attacking" : "defensive")
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab") return

      // Keep keyboard focus inside the modal until it is dismissed.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [hasAttackingPicks, isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="team-picks-title" className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-background shadow-[0_24px_80px_rgba(50,45,37,0.2)]">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <TeamBadge code={teamCode} className="h-11 min-w-14 text-sm" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Quick picks</p>
                <h2 id="team-picks-title" className="truncate text-2xl font-medium text-foreground sm:text-3xl">{teamName}</h2>
              </div>
            </div>
            <Button ref={closeButtonRef} type="button" variant="ghost" size="icon" aria-label="Close team picks" onClick={onClose}><X className="h-5 w-5" /></Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {attackRank ? <Badge variant="outline" className="bg-card"><Target className="h-3 w-3" />Attack #{attackRank}</Badge> : null}
            {defenseRank ? <Badge variant="outline" className="bg-card"><Shield className="h-3 w-3" />Defense #{defenseRank}</Badge> : null}
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {!hasAttackingPicks && !hasDefensivePicks ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center"><Users className="mb-4 h-7 w-7 text-muted-foreground" aria-hidden="true" /><h3 className="font-sans text-lg font-semibold">No quick picks available</h3><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">This team is not currently represented in the leading attacking or defensive recommendations.</p></div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "attacking" | "defensive")}>
              <TabsList className="mb-5 grid w-full grid-cols-2 bg-secondary p-1">
                <TabsTrigger value="attacking" disabled={!hasAttackingPicks} className="gap-2"><Target className="h-4 w-4" />Attack {hasAttackingPicks ? `(${attackingPlayers.length})` : ""}</TabsTrigger>
                <TabsTrigger value="defensive" disabled={!hasDefensivePicks} className="gap-2"><Shield className="h-4 w-4" />Defense {hasDefensivePicks ? `(${defensivePlayers.length})` : ""}</TabsTrigger>
              </TabsList>
              <TabsContent value="attacking" className="mt-0"><div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" />Recommended attacking options based on current output and form.</div><div className="grid gap-3 sm:grid-cols-2">{attackingPlayers.map((player) => <PlayerCard key={`${player.name}-${player.position}`} player={player} mode="attacking" />)}</div></TabsContent>
              <TabsContent value="defensive" className="mt-0"><div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="h-4 w-4" aria-hidden="true" />Recommended defensive options based on security and clean-sheet potential.</div><div className="grid gap-3 sm:grid-cols-2">{defensivePlayers.map((player) => <PlayerCard key={`${player.name}-${player.position}`} player={player} mode="defensive" />)}</div></TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
