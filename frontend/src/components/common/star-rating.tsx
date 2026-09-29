import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({ value, count, className }: { value: number; count?: number; className?: string }) {
  if (!value) return null
  const label = `التقييم ${value.toFixed(1)} من 5${count ? ` (${count} تقييم)` : ''}`

  return (
    <span className={cn('inline-flex items-center gap-1 text-sm', className)} aria-label={label} role="img">
      <Star className="size-4 fill-accent text-accent" aria-hidden="true" />
      <span className="font-semibold tabular-nums">{value.toFixed(1)}</span>
      {count !== undefined && count > 0 && <span className="text-muted-foreground tabular-nums">({count})</span>}
    </span>
  )
}
