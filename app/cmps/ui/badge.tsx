import { type VariantProps, cva } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '../../utils/tw'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-1 font-semibold text-xs leading-none focus:outline-none focus:ring-2 focus:ring-ring',
  {
    variants: {
      variant: {
        default:
          'border-white/12 light:border-black/10 bg-white/10 light:bg-black/5 text-foreground shadow-sm backdrop-blur-md hover:bg-white/15',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline:
          'border-white/15 light:border-black/12 bg-black/14 light:bg-white/30 text-foreground/72 backdrop-blur-md',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
