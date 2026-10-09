import type { ReactNode } from "react"

type PageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-7 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary before:h-2 before:w-2 before:rounded-full before:bg-highlight">{eyebrow}</p>
        <h1 className="text-4xl font-medium leading-[1.04] text-foreground sm:text-[44px]">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
