import { Activity, Crosshair } from "lucide-react"

import type { TouchProfileResult } from "@/lib/touch-profile"

function display(value: number | null, suffix = "") {
  return value === null ? "Not enough data" : `${value.toFixed(1)}${suffix}`
}

export function TouchProfile({ profile }: { profile: TouchProfileResult }) {
  const available = profile.touchesPer90 !== null && profile.boxTouchesPer90 !== null

  return (
    <section aria-labelledby="touch-profile-heading" className="rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-football">Volume summary</p>
          <h3 id="touch-profile-heading" className="mt-1 text-lg">Touch profile</h3>
        </div>
        <span className="rounded-full bg-football-soft p-2 text-football"><Activity className="h-4 w-4" aria-hidden="true" /></span>
      </div>

      {available ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,.8fr)] sm:items-center">
          <svg viewBox="0 0 280 168" role="img" aria-label="Aggregate touch volume, with opponent-box activity highlighted" className="w-full rounded-xl border border-football/20 bg-football/8">
            <rect x="6" y="6" width="268" height="156" rx="10" fill="none" stroke="currentColor" className="text-football/35" />
            <line x1="140" y1="6" x2="140" y2="162" stroke="currentColor" className="text-football/25" />
            <circle cx="140" cy="84" r="22" fill="none" stroke="currentColor" className="text-football/25" />
            <rect x="218" y="41" width="56" height="86" fill="currentColor" className="text-highlight/20" />
            <rect x="235" y="61" width="39" height="46" fill="currentColor" className="text-highlight/28" />
            <circle cx="86" cy="86" r="32" fill="currentColor" className="text-football/22" />
            <circle cx="244" cy="84" r="18" fill="currentColor" className="text-highlight/55" />
          </svg>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-1">
            <div><dt className="text-xs text-muted-foreground">All touches / 90</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{display(profile.touchesPer90)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Box touches / 90</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{display(profile.boxTouchesPer90)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Share in box</dt><dd className="mt-1 font-mono text-sm font-semibold tabular-nums">{display(profile.boxShare === null ? null : profile.boxShare * 100, "%")}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Position percentile</dt><dd className="mt-1 flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums"><Crosshair className="h-3.5 w-3.5 text-highlight" aria-hidden="true" />{display(profile.boxTouchesPercentile)}</dd></div>
          </dl>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center">
          <p className="font-medium">Not enough data</p>
          <p className="mt-1 text-sm text-muted-foreground">Touch volume appears after the player records a complete minutes sample.</p>
        </div>
      )}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">This is an aggregate volume view, not a spatial touch heat map.</p>
    </section>
  )
}
