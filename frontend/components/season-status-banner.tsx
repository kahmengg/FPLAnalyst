import { Activity, Archive, CheckCircle2 } from "lucide-react"
import { DATA_SEASON } from "@/lib/season"

export function SeasonStatusBanner() {
  const archived = DATA_SEASON.isComplete
  const StatusIcon = archived ? Archive : Activity

  return (
    <aside
      aria-label="Dataset season status"
      className={archived
        ? "border-b border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/45 dark:text-amber-100 sm:px-6"
        : "border-b border-emerald-300/70 bg-emerald-50 px-4 py-3 text-emerald-950 dark:border-emerald-800/70 dark:bg-emerald-950/45 dark:text-emerald-100 sm:px-6"}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <div className={archived ? "mt-0.5 rounded-full bg-amber-200 p-1.5 dark:bg-amber-900" : "mt-0.5 rounded-full bg-emerald-200 p-1.5 dark:bg-emerald-900"}>
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{archived ? "Archived season analysis" : "Current season analysis"}</p>
            <span className={archived ? "inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-semibold dark:bg-amber-900" : "inline-flex items-center gap-1 rounded-full bg-emerald-200/80 px-2 py-0.5 text-xs font-semibold dark:bg-emerald-900"}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {DATA_SEASON.label} {archived ? "completed" : "active"}
            </span>
          </div>
          <p className={archived ? "mt-0.5 text-sm text-amber-800 dark:text-amber-200" : "mt-0.5 text-sm text-emerald-800 dark:text-emerald-200"}>
            {archived
              ? `This is historical data from the completed ${DATA_SEASON.label} season.`
              : `Statistics and fixture insights are synced for the ${DATA_SEASON.label} season.`}
          </p>
        </div>
      </div>
    </aside>
  )
}
