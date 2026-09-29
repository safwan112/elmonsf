import { BookOpen, CalendarDays, Mail, ShieldCheck } from 'lucide-react'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCurrentUser } from '@/features/auth/use-auth'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { roleLabels } from '@/types/user'
import { formatDate } from '@/utils/format'

export function DashboardHomePage() {
  const { user } = useCurrentUser()
  if (!user) return null

  const firstName = user.name.split(/\s+/)[0] ?? user.name

  return (
    <DashboardSection>
      <Seo title="لوحة الطالب" noIndex />
      <PageHeader title={`أهلاً ${firstName} 👋`} description="هنا تتابع دوراتك واختباراتك وتقدّمك." />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>دوراتي</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={BookOpen}
              title="لا توجد اشتراكات فعّالة بعد"
              description="عندما تشترك في دورة أو باقة ستظهر هنا مع نسبة تقدّمك والمدة المتبقية للوصول."
            />
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
