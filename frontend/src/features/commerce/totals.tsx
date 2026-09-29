import type { MoneyValue } from '@/types/catalog'
import { formatPrice } from '@/utils/format'

export function Totals({
  subtotal,
  discount,
  tax,
  total,
  vatRate = 15,
  couponCode,
}: {
  subtotal: MoneyValue
  discount: MoneyValue
  tax: MoneyValue
  total: MoneyValue
  vatRate?: number
  couponCode?: string | null
}) {
  return (
    <dl className="grid gap-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">المجموع</dt>
        <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
      </div>
      {discount.amount_minor > 0 && (
        <div className="flex justify-between text-success">
          <dt>الخصم{couponCode ? ` (${couponCode})` : ''}</dt>
          <dd className="tabular-nums">− {formatPrice(discount)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t pt-3 text-base font-bold">
        <dt>الإجمالي</dt>
        <dd className="tabular-nums">{formatPrice(total)}</dd>
      </div>
      <p className="text-xs text-muted-foreground">
        شامل ضريبة القيمة المضافة ({vatRate}٪): {formatPrice(tax)}
      </p>
    </dl>
  )
}
