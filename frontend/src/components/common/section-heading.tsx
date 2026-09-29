import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeading({
  title,
  description,
  action,
  id,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl space-y-2">
        <h2 id={id} className="text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
