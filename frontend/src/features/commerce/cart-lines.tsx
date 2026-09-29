import { Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { Cart } from '@/types/commerce'
import { formatAccess, formatPrice } from '@/utils/format'
import { useRemoveFromCart } from './use-commerce'

export function CartLines({ cart, readOnly = false }: { cart: Cart; readOnly?: boolean }) {
  const remove = useRemoveFromCart()

  return (
    <ul className="divide-y">
      {cart.items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-4">
          <div className="min-w-0 flex-1">
            <Link to={item.url} className="font-semibold hover:text-primary">
              {item.title}
            </Link>
            <p className="text-xs text-muted-foreground">
              {item.type === 'course_plan' ? `${item.plan_name ?? ''} · وصول ${formatAccess(item.duration_days)}` : 'منتج رقمي'}
            </p>
          </div>
          <div className="text-end">
            <p className="font-semibold tabular-nums">{formatPrice(item.total)}</p>
            {item.discount.amount_minor > 0 && (
              <p className="text-xs text-muted-foreground line-through tabular-nums">{formatPrice(item.unit_price)}</p>
            )}
          </div>
          {!readOnly && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label={`إزالة ${item.title}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
