import { GraduationCap } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { PageHero } from '@/components/common/page-hero'
import { RichText } from '@/components/common/rich-text'
import { SectionHeading } from '@/components/common/section-heading'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseCard, CourseGrid } from '@/features/catalog/course-card'
import { useInstructor, useInstructors } from '@/features/catalog/use-catalog'
import { config } from '@/lib/config'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { initials } from '@/utils/format'

export function InstructorsPage() {
  const instructors = useInstructors()
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المدرّبون' }]

  return (
    <>
      <Seo title="المدرّبون" description="تعرّف على المدرّبين المتخصصين في القدرات العامة والتحصيلي." jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title="المدرّبون" description="نخبة من المدرّبين المتخصصين بخبرة طويلة في تدريب الطلاب." />
      <div className="container-page py-10">
        {instructors.isError ? (
          <ErrorState error={instructors.error} onRetry={() => void instructors.refetch()} />
        ) : instructors.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : instructors.data.length === 0 ? (
          <EmptyState icon={GraduationCap} title="لا يوجد مدرّبون بعد" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.data.map((i) => (
              <article key={i.id} className="relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-soft hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
                <Avatar className="size-20">
                  {i.avatar_url && <AvatarImage src={i.avatar_url} alt="" />}
                  <AvatarFallback className="text-xl">{initials(i.name)}</AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-bold">
                  <Link to={`/instructors/${encodeURIComponent(i.slug)}`} className="outline-none after:absolute after:inset-0">
                    {i.name}
                  </Link>
                </h2>
                {i.headline && <p className="text-sm text-muted-foreground">{i.headline}</p>}
                {i.bio_excerpt && <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{i.bio_excerpt}</p>}
                <p className="mt-auto text-xs font-medium text-primary">{i.courses_count ?? 0} دورات</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export function InstructorPage() {
  const { slug = '' } = useParams()
  const query = useInstructor(slug)

  if (query.isPending) return <PageLoader />
  if (query.isError) {
    if (query.error.isNotFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const instructor = query.data.data
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المدرّبون', to: '/instructors' }, { label: instructor.name }]
  const person = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: instructor.name,
    jobTitle: instructor.headline ?? undefined,
    worksFor: { '@type': 'Organization', name: config.appName },
  }

  return (
    <>
      <Seo title={instructor.name} description={instructor.headline ?? undefined} jsonLd={[person, breadcrumbJsonLd(crumbs)]} />
      <PageHero crumbs={crumbs} title={instructor.name} description={instructor.headline}>
        <Avatar className="mt-5 size-20">
          {instructor.avatar_url && <AvatarImage src={instructor.avatar_url} alt="" />}
          <AvatarFallback className="text-xl">{initials(instructor.name)}</AvatarFallback>
        </Avatar>
      </PageHero>
      <div className="container-page grid gap-12 py-10">
        <RichText html={instructor.bio_html} className="max-w-3xl" />
        <section>
          <SectionHeading title={`دورات ${instructor.name}`} />
          {query.data.courses.length === 0 ? (
            <EmptyState title="لا توجد دورات منشورة حالياً" />
          ) : (
            <CourseGrid>
              {query.data.courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </CourseGrid>
          )}
        </section>
      </div>
    </>
  )
}
