import { CreditCard, Lock, MailWarning, ShoppingCart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHero } from '@/components/common/page-hero'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { FormField } from '@/components/forms/form-field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResendVerification } from '@/features/account/use-account'
import { useCurrentUser } from '@/features/auth/use-auth'
import { CartLines } from '@/features/commerce/cart-lines'
import { CouponForm } from '@/features/commerce/coupon-form'
import { Totals } from '@/features/commerce/totals'
import { redirectToPayment, useAddToCart, useCart, usePlaceOrderAndPay } from '@/features/commerce/use-commerce'
import { formatPrice } from '@/utils/format'

/**
 * Checkout. `?plan=ID` / `?product=ID` (from "subscribe/buy now" buttons)
 * first adds that item to the cart.
 */
export function CheckoutPage() {
  const { user } = useCurrentUser()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const cart = useCart()
  const add = useAddToCart()
  const pay = usePlaceOrderAndPay()
  const resend = useResendVerification()
  const handled = useRef(false)

  const [name, setName] = useState(user?.name ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [accepted, setAccepted] = useState(false)
  const [termsError, setTermsError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const plan = Number(params.get('plan'))
    const product = Number(params.get('product'))
    const item = plan ? { type: 'course_plan' as const, id: plan } : product ? { type: 'product' as const, id: product } : null
    if (!item || handled.current) return
    handled.current = true
    add.mutate(item, {
      onError: (err) => toast.error(err.message),
      onSettled: () => setParams({}, { replace: true }),
    })
  }, [params, add, setParams])

  // The query string is cleared once the add settles, so it doubles as the
  // "still adding" signal.
  const adding = add.isPending || Boolean(params.get('plan') || params.get('product'))

  const onPay = () => {
    setError(null)
    setTermsError(null)
    if (!accepted) {
      setTermsError('يجب الموافقة على الشروط وسياسة الاسترجاع للمتابعة')
      return
    }
    pay.mutate(
      { billing_name: name || undefined, billing_phone: phone || undefined, accept_terms: true },
      {
        onSuccess: ({ redirect, external }) => (external ? redirectToPayment(redirect) : navigate(redirect)),
        onError: (err) => setError(err.message),
      },
    )
  }

  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'السلة', to: '/cart' }, { label: 'إتمام الشراء' }]

  return (
    <>
      <Seo title="إتمام الشراء" noIndex />
      <PageHero crumbs={crumbs} title="إتمام الشراء" />
      <div className="container-page py-10">
        {cart.isPending || adding ? (
          <PageLoader />
        ) : cart.isError ? (
          <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
        ) : cart.data.count === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="لا توجد عناصر للدفع"
            action={
              <Button asChild>
                <Link to="/courses">تصفّح الدورات</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
            <div className="grid content-start gap-6">
              {user && !user.email_verified && (
                <Alert>
                  <MailWarning />
                  <AlertTitle>أكّد بريدك الإلكتروني لإتمام الدفع</AlertTitle>
                  <AlertDescription>
                    <p>أرسلنا رابط التأكيد إلى {user.email}. بعد التأكيد عُد إلى هذه الصفحة.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      loading={resend.isPending}
                      disabled={resend.isSuccess}
                      onClick={() => resend.mutate(undefined, { onSuccess: (r) => toast.success(r.message) })}
                    >
                      {resend.isSuccess ? 'تم الإرسال' : 'إعادة إرسال الرابط'}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <section aria-labelledby="order-items" className="rounded-2xl border bg-card px-5 pt-5">
                <h2 id="order-items" className="font-bold">
                  طلبك
                </h2>
                <CartLines cart={cart.data} />
              </section>

              <section aria-labelledby="billing" className="grid gap-5 rounded-2xl border bg-card p-5">
                <h2 id="billing" className="font-bold">
                  بيانات الفاتورة
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="الاسم في الفاتورة">
                    <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                  </FormField>
                  <FormField label="رقم الجوال (اختياري)">
                    <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" />
                  </FormField>
                </div>
                <p className="text-xs text-muted-foreground">
                  ستصل الفاتورة إلى <span className="ltr-nums">{user?.email}</span>
                </p>
              </section>
            </div>

            <aside className="grid content-start gap-5 rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
              <CouponForm cart={cart.data} />
              <Totals {...cart.data} vatRate={cart.data.vat_rate} couponCode={cart.data.coupon?.code} />

              <div className="grid gap-1.5">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="accept_terms"
                    checked={accepted}
                    onCheckedChange={(v) => setAccepted(v === true)}
                    aria-invalid={termsError ? true : undefined}
                    aria-describedby={termsError ? 'terms-error' : undefined}
                  />
                  <Label htmlFor="accept_terms" className="leading-6 font-normal">
                    أوافق على{' '}
                    <Link to="/terms" target="_blank" className="text-primary underline">
                      الشروط والأحكام
                    </Link>{' '}
                    و
                    <Link to="/refund-policy" target="_blank" className="text-primary underline">
                      سياسة الاسترجاع
                    </Link>
                  </Label>
                </div>
                {termsError && (
                  <p id="terms-error" role="alert" className="text-xs text-destructive">
                    {termsError}
                  </p>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button size="lg" onClick={onPay} loading={pay.isPending} disabled={!user?.email_verified}>
                <CreditCard />
                {cart.data.total.amount_minor === 0 ? 'تأكيد الطلب' : `ادفع ${formatPrice(cart.data.total)}`}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <Lock className="size-3.5" aria-hidden="true" />
                دفع آمن عبر MyFatoorah — مدى، فيزا، ماستركارد، Apple Pay
              </p>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
