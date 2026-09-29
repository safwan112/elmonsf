import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number
  label: string
  className?: string
  indicatorClassName?: string
}

/** Accessible progress bar (0–100). */
export function Progress({ value, label, className, indicatorClassName }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className={cn('h-full rounded-full bg-primary transition-[width] duration-500', indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
