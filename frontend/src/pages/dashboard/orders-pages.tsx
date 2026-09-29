import { FileText, Receipt, RefreshCw, XCircle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { OrderStatusBadge } from '@/features/commerce/order-status-badge'
import { Totals } from '@/features/commerce/totals'
import { redirectToPayment, useCancelOrder, useOrder, useOrders, usePayOrder } from '@/features/commerce/use-commerce'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { formatAccess, formatDate, formatDateTime, formatPrice } from '@/utils/format'

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const orders = useOrders(page)

  return (
    <DashboardSection>
      <Seo title="طلباتي" noIndex />
      <PageHeader title="طلباتي" description="سجل مشترياتك وحالة الدفع." />
      <Card className="gap-0 py-0">
        {orders.isError ? (
          <div className="p-4">
            <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
          </div>
        ) : orders.isPending ? (
          <div className="grid gap-3 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : orders.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Receipt}
              title="لا توجد طلبات بعد"
              action={
                <Button asChild>
                  <Link to="/courses">تصفّح الدورات</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجمالي</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.data.data.map((o) => (
                  <TableRow key={o.number}>
                    <TableCell>
                      <Link to={`/dashboard/orders/${encodeURIComponent(o.number)}`} className="font-semibold text-primary hover:underline ltr-nums">
                        {o.number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(o.created_at)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-end font-semibold tabular-nums">{formatPrice(o.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t p-4">
              <Pagination meta={orders.data.meta} onPageChange={(p) => setParams(p > 1 ? { page: String(p) } : {})} />
            </div>
          </>
        )}
      </Card>
    </DashboardSection>
  )
}

export function OrderDetailPage() {
  const { number = '' } = useParams()
  const order = useOrder(number)
  const pay = usePayOrder()
  const cancel = useCancelOrder()

  if (order.isPending) return <PageLoader />
  if (order.isError) {
    if (order.error.isNotFound || order.error.isForbidden) return <NotFoundPage inDashboard />
    return <ErrorState error={order.error} onRetry={() => void order.refetch()} />
  }
  const o = order.data

  return (
    <DashboardSection className="max-w-4xl">
      <Seo title={`الطلب ${o.number}`} noIndex />
      <PageHeader
        title={`الطلب ${o.number}`}
        description={<span className="flex flex-wrap items-center gap-2">{formatDateTime(o.created_at)} <OrderStatusBadge status={o.status} /></span>}
        actions={
          <>
            {o.is_payable && (
              <Button loading={pay.isPending} onClick={() => pay.mutate(o.number, { onSuccess: (r) => redirectToPayment(r.payment_url) })}>
                <RefreshCw />
                {o.status.value === 'failed' ? 'إعادة محاولة الدفع' : 'إكمال الدفع'}
              </Button>
            )}
            {o.is_payable && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                loading={cancel.isPending}
                onClick={() => cancel.mutate(o.number, { onSuccess: (r) => toast.success(r.message ?? 'تم الإلغاء') })}
              >
                <XCircle />
                إلغاء الطلب
              </Button>
            )}
            {o.invoice_number && (
              <Button asChild variant="outline">
                <Link to={`/dashboard/invoices/${encodeURIComponent(o.invoice_number)}`}>
                  <FileText />
                  الفاتورة
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card>
          <CardHeader>
            <CardTitle>العناصر</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {o.items?.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    {item.type === 'course_plan' && (
                      <p className="text-xs text-muted-foreground">
                        {item.plan_name} · وصول {formatAccess(item.duration_days)}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">{formatPrice(item.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="content-start">
          <CardContent>
            <Totals subtotal={o.subtotal} discount={o.discount} tax={o.tax} total={o.total} couponCode={o.coupon_code} />
          </CardContent>
        </Card>
      </div>
      {o.payments && o.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>محاولات الدفع</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {o.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-muted-foreground">{formatDateTime(p.created_at)}</span>
                  <OrderStatusBadge status={p.status} />
                  <span className="tabular-nums">{formatPrice(p.amount)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </DashboardSection>
  )
}
