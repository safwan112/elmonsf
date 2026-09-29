import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { MoneyValue } from '@/types/catalog'
import { formatPrice } from '@/utils/format'

export function PriceTag({
  price,
  compareAt,
  discountPercent,
  prefix,
  size = 'md',
  className,
}: {
  price: MoneyValue | null | undefined
  compareAt?: MoneyValue | null
  discountPercent?: number | null
  prefix?: string
  size?: 'md' | 'lg'
  className?: string
}) {
  if (!price) {
    return <span className={cn('text-sm font-medium text-muted-foreground', className)}>السعر قريباً</span>
  }

  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2 gap-y-1', className)}>
      {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
      <span className={cn('font-bold text-foreground', size === 'lg' ? 'text-3xl' : 'text-lg')}>{formatPrice(price)}</span>
      {compareAt && (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">بدلاً من </span>
          {formatPrice(compareAt)}
        </span>
      )}
      {discountPercent ? (
        <Badge variant="accent" className="self-center">
          وفّر {discountPercent}٪
        </Badge>
      ) : null}
    </span>
  )
}
