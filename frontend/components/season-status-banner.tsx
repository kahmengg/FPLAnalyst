import { Activity, Archive, CheckCircle2 } from "lucide-react"
import { DATA_SEASON } from "@/lib/season"

export function SeasonStatusBanner() {
  const archived = DATA_SEASON.isComplete
  const StatusIcon = archived ? Archive : Activity

  return (
    <aside
      aria-label="Dataset season status"
      className={archived
        ? "border-b border-warning/25 bg-warning/10 py-3 pl-16 pr-4 text-foreground sm:px-6"
        : "border-b border-success/25 bg-success/10 py-3 pl-16 pr-4 text-foreground sm:px-6"}
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3">
        <div className={archived ? "mt-0.5 rounded-full bg-warning/15 p-1.5 text-warning" : "mt-0.5 rounded-full bg-success/15 p-1.5 text-success"}>
          <StatusIcon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold">{archived ? "Archived season analysis" : "Current season analysis"}</p>
            <span className={archived ? "inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning" : "inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success"}>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {DATA_SEASON.label} {archived ? "completed" : "active"}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {archived
              ? `This is historical data from the completed ${DATA_SEASON.label} season.`
              : `Statistics and fixture insights are synced for the ${DATA_SEASON.label} season.`}
          </p>
        </div>
      </div>
    </aside>
  )
}
