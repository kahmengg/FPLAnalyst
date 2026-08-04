import { Archive, CheckCircle2 } from "lucide-react"
import { DATA_SEASON } from "@/lib/season"

export function SeasonStatusBanner() {
  return (
    <aside
      aria-label="Dataset season status"
      className="border-b border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-100 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-200 p-1.5 dark:bg-amber-900">
          <Archive className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">Last season analysis</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-semibold dark:bg-amber-900">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {DATA_SEASON.label} completed
            </span>
          </div>
          <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
            This is historical data from the completed {DATA_SEASON.label} season. Rankings, form, and fixture insights are no longer live.
          </p>
        </div>
      </div>
    </aside>
  )
}
