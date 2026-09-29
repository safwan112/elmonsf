import { ShoppingCart } from 'lucide-react'
import { Link } from 'react-router'
import { PageHero } from '@/components/common/page-hero'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CartLines } from '@/features/commerce/cart-lines'
import { CouponForm } from '@/features/commerce/coupon-form'
import { Totals } from '@/features/commerce/totals'
import { useCart } from '@/features/commerce/use-commerce'

export function CartPage() {
  const cart = useCart()
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'سلة المشتريات' }]

  return (
    <>
      <Seo title="سلة المشتريات" noIndex />
      <PageHero crumbs={crumbs} title="سلة المشتريات" />
      <div className="container-page py-10">
        {cart.isPending ? (
          <PageLoader />
        ) : cart.isError ? (
          <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
        ) : cart.data.count === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="سلتك فارغة"
            description="تصفّح الدورات والمنتجات وأضف ما يناسبك."
            action={
              <Button asChild>
                <Link to="/courses">تصفّح الدورات</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
            <section aria-label="عناصر السلة" className="rounded-2xl border bg-card px-5">
              {cart.data.notices.map((n) => (
                <Alert key={n.code} className="mt-4">
                  <AlertDescription>{n.message}</AlertDescription>
                </Alert>
              ))}
              <CartLines cart={cart.data} />
            </section>
            <aside className="grid content-start gap-5 rounded-2xl border bg-card p-5">
              <CouponForm cart={cart.data} />
              <Totals {...cart.data} vatRate={cart.data.vat_rate} couponCode={cart.data.coupon?.code} />
              <Button asChild size="lg">
                <Link to="/checkout">إتمام الشراء</Link>
              </Button>
            </aside>
          </div>
        )}
      </div>
    </>
  )
}
