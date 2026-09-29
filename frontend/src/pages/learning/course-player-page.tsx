import { ClipboardList, PlayCircle, Timer } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Seo } from '@/components/common/seo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { CoverArt } from '@/features/catalog/cover-art'
import { LearningError } from '@/features/learning/locked-state'
import { PlayerCurriculum } from '@/features/learning/player-curriculum'
import { useCoursePlayer } from '@/features/learning/use-learning'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { formatDate, lessonsLabel } from '@/utils/format'

/** Course overview inside the dashboard: progress, curriculum and exams. */
export function CoursePlayerPage() {
  const courseId = Number(useParams().id)
  const player = useCoursePlayer(courseId)

  if (player.isPending) {
    return (
      <DashboardSection>
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </DashboardSection>
    )
  }
  if (player.isError) {
    return (
      <DashboardSection>
        <LearningError
          error={player.error}
          onRetry={() => void player.refetch()}
          action={
            <Button asChild>
              <Link to="/courses">تصفّح الدورات</Link>
            </Button>
          }
        />
      </DashboardSection>
    )
  }

  const { course, progress, curriculum, exams, enrollment, next_lesson_id: nextId } = player.data
  const started = progress.completed > 0 || progress.last_lesson_id !== null
  const resumeId = progress.last_lesson_id ?? nextId

  return (
    <DashboardSection>
      <Seo title={course.title} noIndex />
      <section className="grid gap-5 overflow-hidden rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-[14rem_1fr] sm:items-center">
        <CoverArt src={course.cover_url} seed={course.id} title={course.title} className="aspect-video rounded-xl" />
        <div className="grid gap-3">
          <h1 className="text-2xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">
            {lessonsLabel(progress.total)}
            {enrollment?.expires_at && ` · الوصول حتى ${formatDate(enrollment.expires_at)}`}
          </p>
          <div className="grid gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium">تقدّمك</span>
              <span className="font-semibold ltr-nums">{progress.percent}%</span>
            </div>
            <Progress value={progress.percent} label="نسبة إكمال الدورة" />
            <p className="text-xs text-muted-foreground ltr-nums">
              {progress.completed} / {progress.total} درس مكتمل
            </p>
          </div>
          {resumeId && (
            <Button asChild size="lg" className="justify-self-start">
              <Link to={`/dashboard/lessons/${resumeId}`}>
                <PlayCircle />
                {started ? 'متابعة التعلّم' : 'ابدأ الدورة'}
              </Link>
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>محتوى الدورة</CardTitle>
          </CardHeader>
          <CardContent>
            <PlayerCurriculum sections={curriculum} />
          </CardContent>
        </Card>

        <Card className="content-start">
          <CardHeader>
            <CardTitle>اختبارات الدورة</CardTitle>
          </CardHeader>
          <CardContent>
            {exams.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد اختبارات لهذه الدورة بعد.</p>
            ) : (
              <ul className="grid gap-2">
                {exams.map((exam) => (
                  <li key={exam.id}>
                    <Link
                      to={`/dashboard/exams/${exam.id}`}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/50"
                    >
                      <ClipboardList className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-semibold">{exam.title}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Timer className="size-3.5" aria-hidden="true" />
                          {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : 'بدون توقيت'} · {exam.questions_count} سؤال
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  )
}
