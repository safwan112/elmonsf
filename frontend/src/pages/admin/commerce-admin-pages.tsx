import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, ReceiptText, Undo2, Webhook } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ResourcePage } from '@/features/admin/resource-page'
import { Totals } from '@/features/commerce/totals'
import { OrderStatusBadge } from '@/features/commerce/order-status-badge'
import { DashboardSection } from '@/layouts/dashboard-shell'
import type { AdminOrder, AdminPayment } from '@/types/admin'
import { formatAccess, formatDateTime, formatPrice } from '@/utils/format'

const orderStatusOptions = [
  { value: 'pending', label: 'بانتظار الدفع' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'failed', label: 'فشل الدفع' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'refunded', label: 'مسترجع' },
]

export function AdminOrdersPage() {
  return (
    <ResourcePage<AdminOrder>
      resource="orders"
      title="الطلبات"
      description="كل طلبات الشراء وحالة الدفع."
      singular="طلب"
      emptyIcon={ReceiptText}
      canCreate={false}
      canDelete={() => false}
      filters={[
        { name: 'search', label: 'بحث', type: 'search', placeholder: 'رقم الطلب أو البريد أو الاسم' },
        { name: 'status', label: 'الحالة', type: 'select', options: orderStatusOptions },
      ]}
      rowKey={(o) => o.number}
      editHref={(o) => `/admin/orders/${encodeURIComponent(o.number)}`}
      columns={[
        {
          header: 'الطلب',
          cell: (o) => (
            <Link to={`/admin/orders/${encodeURIComponent(o.number)}`} className="font-semibold text-primary hover:underline ltr-nums">
              {o.number}
            </Link>
          ),
        },
        {
          header: 'العميل',
          cell: (o) => (
            <div className="grid">
              <span>{o.billing.name}</span>
              <span dir="ltr" className="text-xs text-muted-foreground">
                {o.billing.email}
              </span>
            </div>
          ),
          className: 'hidden md:table-cell',
        },
        { header: 'التاريخ', cell: (o) => formatDateTime(o.created_at), className: 'hidden lg:table-cell' },
        { header: 'الإجمالي', cell: (o) => <span className="font-semibold tabular-nums">{formatPrice(o.total)}</span> },
        { header: 'الحالة', cell: (o) => <OrderStatusBadge status={o.status} /> },
      ]}
    />
  )
}

export function AdminOrderDetailPage() {
  const number = useParams().number ?? ''
  const queryClient = useQueryClient()
  const order = useQuery({ queryKey: queryKeys.admin.order(number), queryFn: () => adminApi.order(number) })
  const [refundOpen, setRefundOpen] = useState(false)
  const [reason, setReason] = useState('')

  const refund = useMutation({
    mutationFn: () => adminApi.refundOrder(number, reason),
    onSuccess: (res) => {
      toast.success(res.message ?? 'تم تسجيل الاسترجاع')
      setRefundOpen(false)
      queryClient.setQueryData(queryKeys.admin.order(number), res.data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('orders', 'list') })
    },
    onError: (err) => toast.error(err.message),
  })

  if (order.isPending) return <PageLoader />
  if (order.isError) {
    return (
      <DashboardSection>
        <ErrorState error={order.error} onRetry={() => void order.refetch()} />
      </DashboardSection>
    )
  }
  const o = order.data

  return (
    <DashboardSection className="max-w-5xl">
      <Seo title={`الطلب ${o.number}`} noIndex />
      <PageHeader
        title={`الطلب ${o.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDateTime(o.created_at)} <OrderStatusBadge status={o.status} />
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/orders">كل الطلبات</Link>
            </Button>
            {o.status.value === 'paid' && (
              <Button variant="destructive" onClick={() => setRefundOpen(true)}>
                <Undo2 />
                تسجيل استرجاع
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid content-start gap-6">
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
          <Card>
            <CardHeader>
              <CardTitle>محاولات الدفع</CardTitle>
            </CardHeader>
            <CardContent>
              {o.payments && o.payments.length > 0 ? (
                <ul className="grid gap-3 text-sm">
                  {o.payments.map((p) => (
                    <li key={p.id} className="grid gap-1 rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <OrderStatusBadge status={p.status} />
                        <span className="font-semibold tabular-nums">{formatPrice(p.amount)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {p.provider} · {formatDateTime(p.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد محاولات دفع.</p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>العميل</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              <p className="font-semibold">{o.billing.name}</p>
              <p dir="ltr" className="text-end text-muted-foreground">
                {o.billing.email}
              </p>
              {o.billing.phone && (
                <p dir="ltr" className="text-end text-muted-foreground">
                  {o.billing.phone}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Totals subtotal={o.subtotal} discount={o.discount} tax={o.tax} total={o.total} couponCode={o.coupon_code} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسجيل استرجاع الطلب</DialogTitle>
            <DialogDescription>
              نفّذ الاسترجاع أولاً من بوابة MyFatoorah، ثم سجّله هنا. سيُلغى وصول الطالب للمحتوى المرتبط بالطلب.
            </DialogDescription>
          </DialogHeader>
          <Textarea aria-label="سبب الاسترجاع" placeholder="سبب الاسترجاع" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" loading={refund.isPending} disabled={reason.trim().length < 3} onClick={() => refund.mutate()}>
              تأكيد الاسترجاع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardSection>
  )
}

const paymentStatusOptions = [
  { value: 'pending', label: 'قيد الانتظار' },
  { value: 'paid', label: 'مدفوع' },
  { value: 'failed', label: 'فشل' },
  { value: 'cancelled', label: 'ملغي' },
  { value: 'refunded', label: 'مسترجع' },
]

export function AdminPaymentsPage() {
  return (
    <DashboardSection>
      <Seo title="المدفوعات" noIndex />
      <Tabs defaultValue="payments" dir="rtl">
        <TabsList>
          <TabsTrigger value="payments">
            <CreditCard className="size-4" aria-hidden="true" />
            عمليات الدفع
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="size-4" aria-hidden="true" />
            إشعارات البوابة
          </TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-4">
          <ResourcePage<AdminPayment>
            resource="payments"
            title="عمليات الدفع"
            description="كل محاولات الدفع عبر MyFatoorah. التكرار أو عدم تطابق المبلغ يحتاج مراجعة."
            singular="عملية"
            emptyIcon={CreditCard}
            canCreate={false}
            canDelete={() => false}
            filters={[
              { name: 'search', label: 'بحث', type: 'search', placeholder: 'رقم الطلب أو الفاتورة أو البريد' },
              { name: 'status', label: 'الحالة', type: 'select', options: paymentStatusOptions },
            ]}
            columns={[
              {
                header: 'الطلب',
                cell: (p) =>
                  p.order ? (
                    <Link to={`/admin/orders/${encodeURIComponent(p.order.number)}`} className="font-semibold text-primary hover:underline ltr-nums">
                      {p.order.number}
                    </Link>
                  ) : (
                    '—'
                  ),
              },
              { header: 'رقم الفاتورة', cell: (p) => <span dir="ltr" className="text-xs">{p.provider_invoice_id ?? '—'}</span>, className: 'hidden md:table-cell' },
              { header: 'المبلغ', cell: (p) => <span className="tabular-nums">{formatPrice(p.amount)}</span> },
              { header: 'التاريخ', cell: (p) => formatDateTime(p.created_at), className: 'hidden lg:table-cell' },
              {
                header: 'الحالة',
                cell: (p) => (
                  <span className="flex flex-wrap gap-1">
                    <Badge variant={p.status.value === 'paid' ? 'success' : p.status.value === 'pending' ? 'accent' : 'secondary'}>{p.status.label}</Badge>
                    {p.is_duplicate && <Badge variant="destructive">مكرر</Badge>}
                    {p.failure_reason === 'amount_mismatch' && <Badge variant="destructive">مبلغ غير مطابق</Badge>}
                  </span>
                ),
              },
            ]}
          />
        </TabsContent>
        <TabsContent value="webhooks" className="mt-4">
          <WebhookEvents />
        </TabsContent>
      </Tabs>
    </DashboardSection>
  )
}

function WebhookEvents() {
  const [page, setPage] = useState(1)
  const events = useQuery({ queryKey: queryKeys.admin.resource('webhooks', page), queryFn: () => adminApi.webhookEvents({ page }) })

  return (
    <Card className="gap-0 py-0">
      {events.isError ? (
        <div className="p-4">
          <ErrorState error={events.error} onRetry={() => void events.refetch()} />
        </div>
      ) : events.isPending ? (
        <div className="grid gap-3 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : events.data.data.length === 0 ? (
        <div className="p-4">
          <EmptyState icon={Webhook} title="لا توجد إشعارات بعد" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحدث</TableHead>
                <TableHead>الدفعة</TableHead>
                <TableHead>التوقيع</TableHead>
                <TableHead>المعالجة</TableHead>
                <TableHead className="hidden md:table-cell">الوقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.data.data.map((e) => (
                <TableRow key={e.id}>
                  <TableCell dir="ltr" className="text-xs">{e.event_type ?? '—'}</TableCell>
                  <TableCell dir="ltr" className="text-xs">{e.provider_payment_id ?? e.provider_invoice_id ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={e.signature_valid ? 'success' : 'destructive'}>{e.signature_valid ? 'صحيح' : 'غير صحيح'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.status === 'processed' ? 'success' : e.status === 'failed' ? 'destructive' : 'secondary'}>{e.status}</Badge>
                    {e.error && <span className="ms-2 text-xs text-muted-foreground">{e.error}</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{formatDateTime(e.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <Pagination meta={events.data.meta} onPageChange={setPage} />
          </div>
        </>
      )}
    </Card>
  )
}
