import { GraduationCap, UserPlus, UserRound, Users, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { ErrorState } from '@/components/common/states'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminOverview } from '@/features/admin/use-admin'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { formatNumber } from '@/utils/format'

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number; icon: LucideIcon; hint?: string }) {
  return (
    <Card className="gap-3 px-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="size-[1.125rem]" aria-hidden="true" />
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums">{formatNumber(value)}</p>
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

  return (
    <DashboardSection>
      <Seo title="لوحة الإدارة" noIndex />
      <PageHeader
        title="نظرة عامة"
        description="مؤشرات المنصة الرئيسية."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/users">إدارة المستخدمين</Link>
          </Button>
        }
      />

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={isPending}>
          {isPending || !data ? (
            Array.from({ length: 4 }, (_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard label="إجمالي المستخدمين" value={data.users.total} icon={Users} hint={`${formatNumber(data.users.active)} حساب نشط`} />
              <StatCard label="الطلاب" value={data.users.by_role.student} icon={GraduationCap} />
              <StatCard label="المدرّبون" value={data.users.by_role.instructor} icon={UserRound} />
              <StatCard label="مستخدمون جدد" value={data.users.new_last_30_days} icon={UserPlus} hint="خلال آخر 30 يوماً" />
            </>
          )}
        </div>
      )}
    </DashboardSection>
  )
}
