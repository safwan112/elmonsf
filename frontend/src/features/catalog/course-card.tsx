import { BookOpen, Clock } from 'lucide-react'
import { Link } from 'react-router'
import { StarRating } from '@/components/common/star-rating'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { CourseSummary } from '@/types/catalog'
import { formatDuration, lessonsLabel } from '@/utils/format'
import { CoverArt } from './cover-art'
import { PriceTag } from './price-tag'

export function CourseCard({ course, categoryIcon }: { course: CourseSummary; categoryIcon?: string | null }) {
  const plan = course.starting_plan

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
      <div className="relative">
        <CoverArt src={course.cover_url} seed={course.id} icon={categoryIcon} title={course.title} />
        <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5">
          {course.category && <Badge className="bg-card/90 text-foreground backdrop-blur">{course.category.name}</Badge>}
          {course.is_featured && <Badge variant="accent">مميّزة</Badge>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{course.level.label}</span>
          <StarRating value={course.rating.average} count={course.rating.count} className="text-xs" />
        </div>
        <h3 className="text-lg leading-snug font-bold">
          {/* Stretched link: the whole card is clickable, one tab stop. */}
          <Link to={`/courses/${encodeURIComponent(course.slug)}`} className="outline-none after:absolute after:inset-0">
            {course.title}
          </Link>
        </h3>
        {course.instructor && <p className="text-sm text-muted-foreground">{course.instructor.name}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5" aria-hidden="true" />
            {lessonsLabel(course.lessons_count)}
          </span>
          {course.duration_seconds > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {formatDuration(course.duration_seconds)}
            </span>
          )}
        </div>
        <div className="border-t pt-3">
          <PriceTag
            price={plan?.price}
            compareAt={plan?.compare_at_price}
            prefix={plan ? 'يبدأ من' : undefined}
          />
        </div>
      </div>
    </article>
  )
}

export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card" aria-hidden="true">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="grid gap-3 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-3 h-6 w-28" />
      </div>
    </div>
  )
}

export function CourseGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}
