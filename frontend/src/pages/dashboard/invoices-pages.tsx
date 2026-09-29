import { FileText, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { LogoMark } from '@/components/common/logo'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useInvoice, useInvoices } from '@/features/commerce/use-commerce'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { formatDate, formatPrice } from '@/utils/format'

export function InvoicesPage() {
  const invoices = useInvoices()

  return (
    <DashboardSection>
      <Seo title="الفواتير" noIndex />
      <PageHeader title="الفواتير" description="فواتيرك الضريبية المبسّطة لكل عملية شراء." />
      <Card className="gap-0 py-0">
        {invoices.isError ? (
          <div className="p-4">
            <ErrorState error={invoices.error} onRetry={() => void invoices.refetch()} />
          </div>
        ) : invoices.isPending ? (
          <div className="grid gap-3 p-4">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : invoices.data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={FileText} title="لا توجد فواتير بعد" description="تصدر الفاتورة تلقائياً بعد نجاح الدفع." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>رقم الفاتورة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead className="text-end">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.data.data.map((inv) => (
                <TableRow key={inv.number}>
                  <TableCell>
                    <Link to={`/dashboard/invoices/${encodeURIComponent(inv.number)}`} className="font-semibold text-primary hover:underline ltr-nums">
                      {inv.number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.issued_at)}</TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">{formatPrice(inv.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </DashboardSection>
  )
}

/** Printable simplified tax invoice (print → "Save as PDF"). */
export function InvoicePage() {
  const { number = '' } = useParams()
  const invoice = useInvoice(number)

  if (invoice.isPending) return <PageLoader />
  if (invoice.isError) {
    if (invoice.error.isNotFound || invoice.error.isForbidden) return <NotFoundPage inDashboard />
    return <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />
  }
  const inv = invoice.data

  return (
    <DashboardSection className="max-w-3xl">
      <Seo title={`الفاتورة ${inv.number}`} noIndex />
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>
          <Printer />
          طباعة / حفظ PDF
        </Button>
      </div>
      <article className="grid gap-8 rounded-2xl border bg-card p-6 sm:p-10 print:border-0 print:p-0 print:shadow-none" aria-label="الفاتورة">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="size-12" />
            <div>
              <p className="text-lg font-bold">{inv.seller.name}</p>
              {inv.seller.vat_number && <p className="text-sm text-muted-foreground">الرقم الضريبي: <span className="ltr-nums">{inv.seller.vat_number}</span></p>}
              {inv.seller.address && <p className="text-sm text-muted-foreground">{inv.seller.address}</p>}
            </div>
          </div>
          <div className="text-end">
            <h1 className="text-2xl font-bold">فاتورة ضريبية مبسّطة</h1>
            <p className="text-sm">
              رقم الفاتورة: <span className="font-semibold ltr-nums">{inv.number}</span>
            </p>
            <p className="text-sm text-muted-foreground">التاريخ: {formatDate(inv.issued_at)}</p>
            {inv.order_number && <p className="text-sm text-muted-foreground">رقم الطلب: <span className="ltr-nums">{inv.order_number}</span></p>}
          </div>
        </header>

        <section className="grid gap-1 text-sm">
          <h2 className="font-bold">فاتورة إلى</h2>
          <p>{inv.buyer.name}</p>
          <p className="text-muted-foreground ltr-nums">{inv.buyer.email}</p>
          {inv.buyer.phone && <p className="text-muted-foreground ltr-nums">{inv.buyer.phone}</p>}
        </section>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>البند</TableHead>
              <TableHead className="text-end">السعر</TableHead>
              <TableHead className="text-end">الخصم</TableHead>
              <TableHead className="text-end">الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inv.lines.map((line, i) => (
              <TableRow key={i}>
                <TableCell className="whitespace-normal">
                  {line.title}
                  {line.plan_name && <span className="block text-xs text-muted-foreground">{line.plan_name}</span>}
                </TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(line.unit_price)}</TableCell>
                <TableCell className="text-end tabular-nums">{line.discount.amount_minor ? formatPrice(line.discount) : '—'}</TableCell>
                <TableCell className="text-end tabular-nums">{formatPrice(line.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <dl className="ms-auto grid w-full max-w-xs gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">الإجمالي قبل الضريبة</dt>
            <dd className="tabular-nums">{formatPrice({ amount: inv.total.amount - inv.tax.amount, currency: inv.currency })}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">ضريبة القيمة المضافة ({inv.vat_rate}٪)</dt>
            <dd className="tabular-nums">{formatPrice(inv.tax)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <dt>الإجمالي شامل الضريبة</dt>
            <dd className="tabular-nums">{formatPrice(inv.total)}</dd>
          </div>
        </dl>
      </article>
    </DashboardSection>
  )
}
