import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex min-h-10 shrink-0 touch-manipulation items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold outline-none transition-[background-color,color,border-color,box-shadow,transform] duration-150 hover:-translate-y-px active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_7px_18px_rgb(37_99_235_/_0.22)] hover:bg-[var(--primary-hover)] hover:shadow-[0_10px_24px_rgb(37_99_235_/_0.28)] active:bg-[var(--primary-pressed)]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/30',
        outline:
          'border border-input bg-card shadow-sm hover:border-primary/25 hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost:
          'hover:bg-accent hover:text-accent-foreground',
        link: 'min-h-0 text-primary underline-offset-4 shadow-none hover:translate-y-0 hover:text-[var(--primary-hover)] hover:underline',
      },
      size: {
        default: 'px-4 py-2 has-[>svg]:px-3',
        sm: 'min-h-9 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'min-h-11 px-6 has-[>svg]:px-4',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
