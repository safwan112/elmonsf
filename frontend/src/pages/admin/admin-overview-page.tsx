import { AlertTriangle, Banknote, GraduationCap, Inbox, ReceiptText, Star, UserPlus, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { ErrorState } from '@/components/common/states'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RevenueChart } from '@/features/admin/revenue-chart'
import { useAdminOverview } from '@/features/admin/use-admin'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { formatNumber, formatPrice } from '@/utils/format'

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string; icon: LucideIcon; hint?: string }) {
  return (
    <Card className="gap-3 px-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}

function StatSkeleton() {
  return (
    <Card className="gap-3 px-5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-16" />
      <Skeleton className="h-3 w-32" />
    </Card>
  )
}

export function AdminOverviewPage() {
  const { data, isPending, isError, error, refetch } = useAdminOverview()
  const sar = (amount: number) => formatPrice({ amount, currency: data?.sales?.currency ?? 'SAR' })

  const attention = data?.attention
    ? [
        { count: data.attention.pending_reviews, label: 'مراجعات بانتظار النشر', to: '/admin/reviews?status=pending', icon: Star },
        { count: data.attention.new_messages, label: 'رسائل تواصل جديدة', to: '/admin/messages?status=new', icon: Inbox },
        { count: data.attention.payments_needing_review, label: 'مدفوعات تحتاج مراجعة', to: '/admin/payments', icon: AlertTriangle },
      ]
    : []

  return (
    <DashboardSection>
      <Seo title="لوحة الإدارة" noIndex />
      <PageHeader
        title="نظرة عامة"
        description="مؤشرات المنصة الرئيسية."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/orders">الطلبات</Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={isPending}>
            {isPending || !data ? (
              Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="إيرادات 30 يوماً"
                  value={sar(data.sales?.revenue_last_30_days ?? 0)}
                  icon={Banknote}
                  hint={`الإجمالي منذ البداية ${sar(data.sales?.revenue_total ?? 0)}`}
                />
                <StatCard
                  label="طلبات مدفوعة (30 يوماً)"
                  value={formatNumber(data.sales?.paid_orders_last_30_days ?? 0)}
                  icon={ReceiptText}
                  hint={`${formatNumber(data.sales?.pending_orders ?? 0)} طلب بانتظار الدفع`}
                />
                <StatCard
                  label="اشتراكات فعّالة"
                  value={formatNumber(data.learning?.active_enrollments ?? 0)}
                  icon={GraduationCap}
                  hint={`${formatNumber(data.users.by_role.student)} طالب مسجّل`}
                />
                <StatCard
                  label="مستخدمون جدد"
                  value={formatNumber(data.users.new_last_30_days)}
                  icon={UserPlus}
                  hint={`${formatNumber(data.users.total)} مستخدم · ${formatNumber(data.users.active)} نشط`}
                />
              </>
            )}
          </div>

          {data?.sales && (
            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>الإيرادات اليومية</CardTitle>
                </CardHeader>
                <CardContent>
                  <RevenueChart data={data.sales.daily} currency={data.sales.currency} />
                </CardContent>
              </Card>
              <div className="grid content-start gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>يحتاج انتباهك</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2">
                      {attention.map(({ count, label, to, icon: Icon }) => (
                        <li key={to}>
                          <Link to={to} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/60">
                            <span className="flex items-center gap-2">
                              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                              {label}
                            </span>
                            <span className={count > 0 ? 'font-bold text-foreground tabular-nums' : 'text-muted-foreground tabular-nums'}>{count}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>الأكثر مبيعاً</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.sales.top_courses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد.</p>
                    ) : (
                      <ol className="grid gap-2 text-sm">
                        {data.sales.top_courses.map((c, i) => (
                          <li key={c.course_id} className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate">
                              <span className="text-muted-foreground ltr-nums">{i + 1}. </span>
                              {c.title}
                            </span>
                            <span className="shrink-0 text-muted-foreground tabular-nums">{c.sales} عملية</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-5 text-muted-foreground" aria-hidden="true" />
                  المستخدمون حسب الدور
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-3 gap-4 text-center">
                  {(['student', 'instructor', 'admin'] as const).map((role) => (
                    <div key={role}>
                      <dt className="text-sm text-muted-foreground">{{ student: 'الطلاب', instructor: 'المدرّبون', admin: 'المديرون' }[role]}</dt>
                      <dd className="text-2xl font-bold tabular-nums">{formatNumber(data.users.by_role[role])}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </DashboardSection>
  )
}
