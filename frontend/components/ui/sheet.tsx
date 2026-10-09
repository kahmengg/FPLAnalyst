"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger

export function SheetContent({ className, children, ...props }: ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out motion-reduce:transition-none" />
      <Dialog.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto rounded-t-3xl border border-border bg-card p-5 shadow-[var(--shadow-raised)] outline-none transition-transform duration-200 data-[state=closed]:translate-y-full motion-reduce:transition-none sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(34rem,92vw)] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:p-6 sm:data-[state=closed]:translate-x-full sm:data-[state=closed]:translate-y-0",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Close player details</span>
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

export const SheetTitle = Dialog.Title
export const SheetDescription = Dialog.Description
