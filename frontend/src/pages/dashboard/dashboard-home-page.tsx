import { BookOpen, CalendarDays, Mail, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/features/auth/use-auth'
import { useEnrollments } from '@/features/commerce/use-commerce'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { EnrollmentCard } from '@/pages/dashboard/my-courses-page'
import { roleLabels } from '@/types/user'
import { formatDate } from '@/utils/format'

export function DashboardHomePage() {
  const { user } = useCurrentUser()
  const enrollments = useEnrollments()
  if (!user) return null

  const active = enrollments.data?.filter((e) => e.is_active) ?? []

  const firstName = user.name.split(/\s+/)[0] ?? user.name

  return (
    <DashboardSection>
      <Seo title="لوحة الطالب" noIndex />
      <PageHeader title={`أهلاً ${firstName} 👋`} description="هنا تتابع دوراتك واختباراتك وتقدّمك." />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>دوراتي</CardTitle>
            {active.length > 0 && (
              <Button variant="link" size="sm" asChild>
                <Link to="/dashboard/courses">عرض الكل</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {enrollments.isPending ? (
              <Skeleton className="h-48 rounded-2xl" />
            ) : active.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {active.slice(0, 2).map((e) => (
                  <EnrollmentCard key={e.id} enrollment={e} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={BookOpen}
                title="لا توجد اشتراكات فعّالة بعد"
                description="عندما تشترك في دورة أو باقة ستظهر هنا مع المدة المتبقية للوصول."
                action={
                  <Button asChild>
                    <Link to="/courses">تصفّح الدورات</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حسابي</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-muted-foreground">البريد الإلكتروني</dt>
                  <dd className="truncate font-medium ltr-nums">{user.email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground">نوع الحساب</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {user.roles.map((role) => (
                      <Badge key={role}>{roleLabels[role]}</Badge>
                    ))}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
                <div>
                  <dt className="text-muted-foreground">عضو منذ</dt>
                  <dd className="font-medium">{formatDate(user.created_at)}</dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  )
}
