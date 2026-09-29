import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CoursePlan } from '@/types/catalog'
import { formatAccess, formatPrice } from '@/utils/format'

/** Accessible radio-card group for choosing a course plan. */
export function PlanPicker({
  plans,
  value,
  onChange,
  name = 'plan',
}: {
  plans: CoursePlan[]
  value: number | undefined
  onChange: (id: number) => void
  name?: string
}) {
  return (
    <fieldset className="grid gap-2.5">
      <legend className="mb-2 text-sm font-bold">اختر مدة الاشتراك</legend>
      {plans.map((plan) => {
        const checked = plan.id === value
        const id = `${name}-${plan.id}`
        return (
          <label
            key={plan.id}
            htmlFor={id}
            className={cn(
              'relative flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/25',
              checked ? 'border-primary bg-primary-soft/60' : 'border-border hover:border-primary/40',
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={plan.id}
              checked={checked}
              onChange={() => onChange(plan.id)}
              className="sr-only"
            />
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
              )}
              aria-hidden="true"
            >
              {checked && <Check className="size-3" strokeWidth={3} />}
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">{plan.name}</span>
              <span className="text-xs text-muted-foreground">وصول {formatAccess(plan.duration_days)}</span>
            </span>
            <span className="flex flex-col items-end">
              <span className="font-bold">{formatPrice(plan.price)}</span>
              {plan.compare_at_price && (
                <span className="text-xs text-muted-foreground line-through">{formatPrice(plan.compare_at_price)}</span>
              )}
            </span>
            {plan.discount_percent ? (
              <span className="absolute -top-2.5 end-3 rounded-full bg-accent px-2 py-0.5 text-[0.7rem] font-bold text-accent-foreground">
                وفّر {plan.discount_percent}٪
              </span>
            ) : null}
          </label>
        )
      })}
    </fieldset>
  )
}
