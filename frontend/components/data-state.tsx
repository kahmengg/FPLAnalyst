import type { LucideIcon } from "lucide-react"
import { AlertCircle, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function PageSkeleton({ label = "Loading data" }: { label?: string }) {
  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 h-32 animate-pulse rounded-xl bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-44 animate-pulse rounded-xl border border-border bg-card" />)}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

type StateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: LucideIcon
}

export function ErrorState({ title, description, actionLabel = "Try again", onAction, icon: Icon = AlertCircle }: StateProps) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4">
      <Card className="w-full"><CardContent className="flex flex-col items-center py-10 text-center">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive"><Icon className="h-5 w-5" aria-hidden="true" /></div>
        <h2 className="text-2xl font-medium">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        {onAction ? <Button className="mt-6" onClick={onAction}>{actionLabel}</Button> : null}
      </CardContent></Card>
    </div>
  )
}

export function EmptyState({ title, description, actionLabel, onAction, icon: Icon = SearchX }: StateProps) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 p-6 text-center">
      <Icon className="mb-4 h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <h2 className="font-sans text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {onAction ? <Button variant="outline" className="mt-5" onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  )
}
