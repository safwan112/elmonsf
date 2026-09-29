import { BookOpen, CalendarClock } from 'lucide-react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverArt } from '@/features/catalog/cover-art'
import { useEnrollments } from '@/features/commerce/use-commerce'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { cn } from '@/lib/utils'
import type { Enrollment } from '@/types/commerce'
import { formatDate, lessonsLabel } from '@/utils/format'

export function EnrollmentCard({ enrollment }: { enrollment: Enrollment }) {
  const { course } = enrollment
  const soon = enrollment.is_active && enrollment.days_left !== null && enrollment.days_left <= 7

  return (
    <article className={cn('flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft', !enrollment.is_active && 'opacity-80')}>
      <CoverArt src={course.cover_url} seed={course.id} title={course.title} className="aspect-[16/7]" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={enrollment.is_active ? (soon ? 'accent' : 'success') : 'secondary'}>{enrollment.status.label}</Badge>
          <span className="text-xs text-muted-foreground">{lessonsLabel(course.lessons_count)}</span>
        </div>
        <h3 className="text-lg leading-snug font-bold">{course.title}</h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" aria-hidden="true" />
          {enrollment.expires_at === null
            ? 'وصول دائم'
            : enrollment.is_active
              ? `ينتهي الوصول في ${formatDate(enrollment.expires_at)}${enrollment.days_left !== null ? ` (${enrollment.days_left} يوماً متبقية)` : ''}`
              : `انتهى في ${formatDate(enrollment.expires_at)}`}
        </p>
        <div className="mt-auto flex gap-2 pt-1">
          {enrollment.is_active ? (
            <Button asChild className="flex-1">
              <Link to={`/courses/${encodeURIComponent(course.slug)}`}>متابعة الدورة</Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="flex-1">
              <Link to={`/courses/${encodeURIComponent(course.slug)}`}>تجديد الاشتراك</Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  )
}

export function MyCoursesPage() {
  const enrollments = useEnrollments()

  return (
    <DashboardSection>
      <Seo title="دوراتي" noIndex />
      <PageHeader title="دوراتي" description="الدورات المشترك فيها ومدة الوصول المتبقية." />
      {enrollments.isError ? (
        <ErrorState error={enrollments.error} onRetry={() => void enrollments.refetch()} />
      ) : enrollments.isPending ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : enrollments.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="لم تشترك في أي دورة بعد"
          description="اختر دورة تناسب اختبارك وابدأ التعلّم اليوم."
          action={
            <Button asChild>
              <Link to="/courses">تصفّح الدورات</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.data.map((e) => (
            <EnrollmentCard key={e.id} enrollment={e} />
          ))}
        </div>
      )}
    </DashboardSection>
  )
}
