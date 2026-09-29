import { formatPrice } from '@/utils/format'

interface Point {
  date: string
  revenue: number
  orders: number
}

const dayFormatter = new Intl.DateTimeFormat('ar-SA-u-nu-latn', { day: 'numeric', month: 'short', calendar: 'gregory' })
const day = (iso: string) => dayFormatter.format(new Date(`${iso}T12:00:00`))

/**
 * Daily revenue, one series: thin bars in the brand color anchored to the
 * baseline, per-bar hover/focus tooltip, and a table view for screen readers.
 */
export function RevenueChart({ data, currency }: { data: Point[]; currency: string }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const money = (amount: number) => formatPrice({ amount, currency })

  return (
    <figure className="grid gap-3">
      <div className="relative h-48" aria-hidden="true">
        {/* Recessive grid: baseline + half + max. */}
        {[0, 0.5, 1].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-border/60" style={{ bottom: `${f * 100}%` }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {data.map((d) => (
            <div key={d.date} className="group relative flex h-full flex-1 items-end">
              <div
                className="w-full rounded-t-[4px] bg-primary transition-opacity group-hover:opacity-80"
                style={{ height: `${d.revenue > 0 ? Math.max(2, (d.revenue / max) * 100) : 0}%` }}
              />
              <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-md border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-soft group-hover:block rtl:translate-x-1/2">
                <p className="font-semibold">{day(d.date)}</p>
                <p className="tabular-nums">{money(d.revenue)}</p>
                <p className="text-muted-foreground">{d.orders} طلب</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground" aria-hidden="true">
        <span>{data[0] && day(data[0].date)}</span>
        <span>أعلى يوم: {money(max === 1 && data.every((d) => d.revenue === 0) ? 0 : max)}</span>
        <span>{data.at(-1) && day(data.at(-1)!.date)}</span>
      </div>
      <figcaption className="sr-only">الإيرادات اليومية خلال آخر 30 يوماً</figcaption>
      <table className="sr-only">
        <thead>
          <tr>
            <th>اليوم</th>
            <th>الإيرادات</th>
            <th>الطلبات</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{day(d.date)}</td>
              <td>{money(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
