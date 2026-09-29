import { BookOpen, CalendarClock, CheckCircle2, Clock, GraduationCap, Smartphone, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { breadcrumbJsonLd, type Crumb } from '@/lib/json-ld'
import { RichText } from '@/components/common/rich-text'
import { SectionHeading } from '@/components/common/section-heading'
import { Seo } from '@/components/common/seo'
import { StarRating } from '@/components/common/star-rating'
import { ErrorState } from '@/components/common/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { checkoutPathForPlan } from '@/features/catalog/checkout-link'
import { CourseCard, CourseGrid } from '@/features/catalog/course-card'
import { CoverArt } from '@/features/catalog/cover-art'
import { Curriculum } from '@/features/catalog/curriculum'
import { PlanPicker } from '@/features/catalog/plan-picker'
import { PriceTag } from '@/features/catalog/price-tag'
import { useCourse } from '@/features/catalog/use-catalog'
import { config } from '@/lib/config'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import type { CourseDetail, CoursePlan } from '@/types/catalog'
import { formatAccess, formatDuration, initials, lessonsLabel, studentsLabel } from '@/utils/format'

function courseJsonLd(course: CourseDetail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.seo.description ?? course.subtitle ?? undefined,
    inLanguage: course.language,
    url: `${config.siteUrl}/courses/${encodeURIComponent(course.slug)}`,
    provider: { '@type': 'Organization', name: config.appName, sameAs: config.siteUrl },
    ...(course.cover_url ? { image: course.cover_url } : {}),
    offers: course.plans.map((plan) => ({
      '@type': 'Offer',
      category: 'Paid',
      name: plan.name,
      price: plan.price.amount,
      priceCurrency: plan.price.currency,
      availability: 'https://schema.org/InStock',
    })),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: `PT${Math.round(course.duration_seconds / 60)}M` },
    ...(course.rating.count > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: course.rating.average, ratingCount: course.rating.count } }
      : {}),
  }
}

function PurchasePanel({
  course,
  plan,
  onPlanChange,
}: {
  course: CourseDetail
  plan: CoursePlan | undefined
  onPlanChange: (id: number) => void
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-lift">
      <CoverArt src={course.cover_url} seed={course.id} title={course.title} className="hidden lg:flex" />
      <div className="grid gap-5 p-5">
        {course.plans.length === 0 ? (
          <p className="text-muted-foreground">سيتوفر الاشتراك في هذه الدورة قريباً.</p>
        ) : (
          <>
            <PriceTag price={plan?.price} compareAt={plan?.compare_at_price} discountPercent={plan?.discount_percent} size="lg" />
            {course.plans.length > 1 && <PlanPicker plans={course.plans} value={plan?.id} onChange={onPlanChange} />}
            {plan && (
              <Button asChild size="lg" className="w-full">
                <Link to={checkoutPathForPlan(plan.id)}>اشترك الآن</Link>
              </Button>
            )}
          </>
        )}
        <ul className="grid gap-2.5 text-sm">
          {plan && (
            <li className="flex items-center gap-2.5">
              <CalendarClock className="size-4 text-primary" aria-hidden="true" />
              وصول كامل لمدة {formatAccess(plan.duration_days)}
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <BookOpen className="size-4 text-primary" aria-hidden="true" />
            {lessonsLabel(course.lessons_count)}
          </li>
          {course.duration_seconds > 0 && (
            <li className="flex items-center gap-2.5">
              <Clock className="size-4 text-primary" aria-hidden="true" />
              {formatDuration(course.duration_seconds)} من المحتوى
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <Smartphone className="size-4 text-primary" aria-hidden="true" />
            مشاهدة من الجوال والحاسب
          </li>
        </ul>
      </div>
    </div>
  )
}

function CourseSkeleton() {
  return (
    <div aria-busy="true" aria-label="جارٍ تحميل الدورة">
      <div className="bg-primary">
        <div className="container-page grid gap-4 py-12">
          <Skeleton className="h-4 w-48 bg-white/20" />
          <Skeleton className="h-10 w-3/4 bg-white/20" />
          <Skeleton className="h-5 w-1/2 bg-white/20" />
        </div>
      </div>
      <div className="container-page grid gap-4 py-10">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  )
}

export function CourseDetailPage() {
  const { slug = '' } = useParams()
  const query = useCourse(slug)
  const [planId, setPlanId] = useState<number | undefined>()

  if (query.isPending) return <CourseSkeleton />
  if (query.isError) {
    if (query.error.isNotFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const course = query.data.data
  const related = query.data.related
  const defaultPlan = course.plans.find((p) => p.is_default) ?? course.plans[0]
  const plan = course.plans.find((p) => p.id === planId) ?? defaultPlan

  const crumbs: Crumb[] = [
    { label: 'الرئيسية', to: '/' },
    { label: 'الدورات', to: '/courses' },
    ...(course.category ? [{ label: course.category.name, to: `/categories/${encodeURIComponent(course.category.slug)}` }] : []),
    { label: course.title },
  ]

  return (
    <>
      <Seo
        title={course.seo.title}
        description={course.seo.description ?? undefined}
        image={course.cover_url ?? undefined}
        type="product"
        jsonLd={[courseJsonLd(course), breadcrumbJsonLd(crumbs)]}
      />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="bg-lattice pointer-events-none absolute inset-0 opacity-15" aria-hidden="true" />
        <div className="container-page relative grid gap-5 py-10 lg:grid-cols-[1fr_22rem] lg:py-14">
          <div className="grid content-start gap-4">
            <Breadcrumbs items={crumbs} className="text-primary-foreground/85" />
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary-foreground/15 text-primary-foreground">{course.level.label}</Badge>
              {course.is_featured && <Badge variant="accent">مميّزة</Badge>}
            </div>
            <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{course.title}</h1>
            {course.subtitle && <p className="max-w-2xl text-lg text-primary-foreground/85">{course.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary-foreground/90">
              <StarRating value={course.rating.average} count={course.rating.count} className="[&_.text-muted-foreground]:text-primary-foreground/75" />
              {course.students_count > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-4" aria-hidden="true" />
                  {studentsLabel(course.students_count)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4" aria-hidden="true" />
                {lessonsLabel(course.lessons_count)}
              </span>
              {course.duration_seconds > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {formatDuration(course.duration_seconds)}
                </span>
              )}
            </div>
            {course.instructor && (
              <p className="text-sm">
                المدرّب:{' '}
                <Link to={`/instructors/${encodeURIComponent(course.instructor.slug)}`} className="font-semibold underline-offset-4 hover:underline">
                  {course.instructor.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-10 pb-28 lg:grid-cols-[1fr_22rem] lg:pb-16">
        {/* Purchase panel: overlaps the hero on desktop, inline on mobile. */}
        <aside aria-label="الاشتراك في الدورة" className="lg:col-start-2 lg:row-start-1 lg:-mt-64">
          <div className="lg:sticky lg:top-24">
            <PurchasePanel course={course} plan={plan} onPlanChange={setPlanId} />
          </div>
        </aside>

        <div className="grid min-w-0 content-start gap-12 lg:col-start-1 lg:row-start-1">
          {course.outcomes.length > 0 && (
            <section aria-labelledby="outcomes" className="rounded-2xl border bg-card p-6">
              <h2 id="outcomes" className="mb-4 text-xl font-bold">
                ماذا ستتعلم؟
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2.5 text-sm leading-7">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" aria-hidden="true" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {course.description_html && (
            <section aria-labelledby="about">
              <h2 id="about" className="mb-4 text-xl font-bold">
                عن الدورة
              </h2>
              <RichText html={course.description_html} />
            </section>
          )}

          {course.curriculum.length > 0 && (
            <section aria-labelledby="curriculum">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="curriculum" className="text-xl font-bold">
                  محتوى الدورة
                </h2>
                <p className="text-sm text-muted-foreground">
                  {course.curriculum.length} وحدات · {lessonsLabel(course.lessons_count)} · {formatDuration(course.duration_seconds)}
                </p>
              </div>
              <Curriculum slug={course.slug} sections={course.curriculum} />
            </section>
          )}

          {course.requirements.length > 0 && (
            <section aria-labelledby="requirements">
              <h2 id="requirements" className="mb-4 text-xl font-bold">
                المتطلبات
              </h2>
              <ul className="rich-text">
                {course.requirements.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </section>
          )}

          {course.instructor && (
            <section aria-labelledby="instructor" className="rounded-2xl border bg-card p-6">
              <h2 id="instructor" className="mb-4 text-xl font-bold">
                المدرّب
              </h2>
              <div className="flex items-start gap-4">
                <Avatar className="size-16">
                  {course.instructor.avatar_url && <AvatarImage src={course.instructor.avatar_url} alt="" />}
                  <AvatarFallback className="text-lg">{initials(course.instructor.name)}</AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <Link to={`/instructors/${encodeURIComponent(course.instructor.slug)}`} className="text-lg font-bold hover:text-primary">
                    {course.instructor.name}
                  </Link>
                  {course.instructor.headline && <p className="text-sm text-muted-foreground">{course.instructor.headline}</p>}
                  {course.instructor.courses_count !== undefined && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <GraduationCap className="size-3.5" aria-hidden="true" />
                      {course.instructor.courses_count} دورات منشورة
                    </p>
                  )}
                </div>
              </div>
              <RichText html={course.instructor.bio_html} className="mt-4 text-sm" />
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related" className="border-t bg-card/60">
          <div className="container-page py-12">
            <SectionHeading id="related" title="دورات ذات صلة" />
            <CourseGrid>
              {related.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </CourseGrid>
          </div>
        </section>
      )}

      {/* Sticky purchase bar on mobile. */}
      {plan && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <div className="min-w-0">
              <PriceTag price={plan.price} compareAt={plan.compare_at_price} />
              <p className="truncate text-xs text-muted-foreground">{plan.name}</p>
            </div>
            <Button asChild size="lg">
              <Link to={checkoutPathForPlan(plan.id)}>اشترك الآن</Link>
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
