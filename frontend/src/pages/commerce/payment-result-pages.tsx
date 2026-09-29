import { CircleCheck, CircleX, LoaderCircle, RefreshCw } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { Seo } from '@/components/common/seo'
import { Button } from '@/components/ui/button'
import { OrderStatusBadge } from '@/features/commerce/order-status-badge'
import { redirectToPayment, useOrder, usePayOrder } from '@/features/commerce/use-commerce'
import { formatPrice } from '@/utils/format'

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="container-page flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-5 py-16 text-center">{children}</div>
}

const REASONS: Record<string, string> = {
  unknown_payment: 'لم نتمكن من التحقق من عملية الدفع.',
  invalid_callback: 'رابط العودة من بوابة الدفع غير مكتمل.',
}

export function PaymentSuccessPage() {
  const [params] = useSearchParams()
  const number = params.get('order') ?? ''
  const order = useOrder(number, { poll: true })

  const status = order.data?.status.value

  if (!number || status === undefined || status === 'pending') {
    return (
      <Frame>
        <Seo title="جارٍ تأكيد الدفع" noIndex />
        <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden="true" />
        <h1 className="text-2xl font-bold">جارٍ تأكيد عملية الدفع…</h1>
        <p className="text-muted-foreground" role="status">
          نتحقق من الدفع مع بوابة الدفع. عادةً يستغرق ذلك ثوانٍ قليلة، ولا حاجة لإعادة الدفع.
        </p>
        <Button asChild variant="outline">
          <Link to={number ? `/dashboard/orders/${encodeURIComponent(number)}` : '/dashboard/orders'}>عرض طلباتي</Link>
        </Button>
      </Frame>
    )
  }

  if (status !== 'paid') {
    return <PaymentFailedContent number={number} />
  }

  const o = order.data!
  const firstCourse = o.items?.find((i) => i.type === 'course_plan')

  return (
    <Frame>
      <Seo title="تم الدفع بنجاح" noIndex />
      <span className="flex size-16 items-center justify-center rounded-2xl bg-success/12 text-success">
        <CircleCheck className="size-9" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold sm:text-3xl">تم الدفع بنجاح 🎉</h1>
      <p className="text-muted-foreground">
        شكراً لك! أصبح المحتوى متاحاً في لوحتك. رقم الطلب <span className="font-semibold ltr-nums">{o.number}</span> — الإجمالي{' '}
        {formatPrice(o.total)}.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link to="/dashboard/courses">{firstCourse ? 'ابدأ التعلّم' : 'الذهاب إلى لوحتي'}</Link>
        </Button>
        {o.invoice_number && (
          <Button asChild size="lg" variant="outline">
            <Link to={`/dashboard/invoices/${encodeURIComponent(o.invoice_number)}`}>عرض الفاتورة</Link>
          </Button>
        )}
      </div>
    </Frame>
  )
}

function PaymentFailedContent({ number, reason }: { number: string; reason?: string | null }) {
  const order = useOrder(number)
  const pay = usePayOrder()

  return (
    <Frame>
      <Seo title="لم يكتمل الدفع" noIndex />
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <CircleX className="size-9" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold sm:text-3xl">لم تكتمل عملية الدفع</h1>
      <p className="text-muted-foreground" role="alert">
        {(reason && REASONS[reason]) || 'لم يتم خصم أي مبلغ. يمكنك إعادة المحاولة أو استخدام بطاقة أخرى.'}
      </p>
      {order.data && (
        <p className="flex items-center gap-2 text-sm">
          الطلب <span className="font-semibold ltr-nums">{order.data.number}</span>
          <OrderStatusBadge status={order.data.status} />
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        {order.data?.is_payable && (
          <Button size="lg" loading={pay.isPending} onClick={() => pay.mutate(order.data!.number, { onSuccess: (r) => redirectToPayment(r.payment_url) })}>
            <RefreshCw />
            إعادة المحاولة
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          <Link to={number ? `/dashboard/orders/${encodeURIComponent(number)}` : '/dashboard/orders'}>عرض الطلب</Link>
        </Button>
      </div>
    </Frame>
  )
}

export function PaymentFailedPage() {
  const [params] = useSearchParams()
  return <PaymentFailedContent number={params.get('order') ?? ''} reason={params.get('reason')} />
}
