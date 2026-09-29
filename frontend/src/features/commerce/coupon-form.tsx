import { TicketPercent, X } from 'lucide-react'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Cart } from '@/types/commerce'
import { useApplyCoupon, useRemoveCoupon } from './use-commerce'

export function CouponForm({ cart }: { cart: Cart }) {
  const id = useId()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()

  if (cart.coupon) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-success/50 bg-success/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-semibold text-success">
          <TicketPercent className="size-4" aria-hidden="true" />
          {cart.coupon.code}
        </span>
        <Button variant="ghost" size="sm" loading={remove.isPending} onClick={() => remove.mutate()} aria-label="إزالة رمز الخصم">
          <X />
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      className="grid gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!code.trim()) return
        setError(null)
        apply.mutate(code.trim(), {
          onSuccess: (res) => {
            toast.success(res.message ?? 'تم تطبيق رمز الخصم')
            setCode('')
          },
          onError: (err) => setError(err.message),
        })
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        رمز الخصم
      </label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="مثال: SAVE20"
          dir="ltr"
          className="h-10 text-end uppercase"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <Button type="submit" variant="secondary" className="h-10" loading={apply.isPending}>
          تطبيق
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
