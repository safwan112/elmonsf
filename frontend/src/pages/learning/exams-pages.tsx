import { Award, ClipboardList, History, PlayCircle, RotateCcw, Timer } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { RichText } from '@/components/common/rich-text'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { LearningError } from '@/features/learning/locked-state'
import { useExam, useExams, useStartExam } from '@/features/learning/use-learning'
import { DashboardSection } from '@/layouts/dashboard-shell'
import type { ExamSummary } from '@/types/learning'
import { formatDateTime } from '@/utils/format'

function ExamMeta({ exam }: { exam: ExamSummary }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <li className="flex items-center gap-1">
        <Timer className="size-3.5" aria-hidden="true" />
        {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : 'بدون توقيت'}
      </li>
      <li>{exam.questions_count} سؤال</li>
      <li>النجاح من {exam.pass_percent}%</li>
      {exam.max_attempts !== null && <li>{exam.max_attempts} محاولات</li>}
    </ul>
  )
}

export function ExamsPage() {
  const exams = useExams()

  return (
    <DashboardSection>
      <Seo title="الاختبارات" noIndex />
      <PageHeader title="الاختبارات" description="اختبارات محاكية بتوقيت حقيقي وتصحيح فوري مع شرح الإجابات." />
      {exams.isError ? (
        <LearningError error={exams.error} onRetry={() => void exams.refetch()} />
      ) : exams.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : exams.data.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="لا توجد اختبارات متاحة"
          description="اشترك في دورة لتظهر اختباراتها هنا."
          action={
            <Button asChild>
              <Link to="/courses">تصفّح الدورات</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {exams.data.map((exam) => (
            <li key={exam.id}>
              <article className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                  {exam.is_free && <Badge variant="accent">مجاني</Badge>}
                  {exam.course && <Badge variant="secondary">{exam.course.title}</Badge>}
                  {exam.stats.passed && <Badge variant="success">ناجح</Badge>}
                </div>
                <h2 className="text-lg font-bold">
                  <Link to={`/dashboard/exams/${exam.id}`} className="hover:text-primary">
                    {exam.title}
                  </Link>
                </h2>
                <ExamMeta exam={exam} />
                <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {exam.stats.best_percent !== null ? (
                      <>
                        أفضل نتيجة: <span className="font-semibold text-foreground ltr-nums">{exam.stats.best_percent}%</span>
                      </>
                    ) : (
                      'لم تحاول بعد'
                    )}
                  </p>
                  <Button asChild size="sm" variant={exam.stats.in_progress_attempt_id ? 'default' : 'outline'}>
                    <Link to={`/dashboard/exams/${exam.id}`}>{exam.stats.in_progress_attempt_id ? 'استكمال' : 'التفاصيل'}</Link>
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}

export function ExamDetailPage() {
  const examId = Number(useParams().id)
  const exam = useExam(examId)
  const start = useStartExam()
  const navigate = useNavigate()

  if (exam.isPending) {
    return (
      <DashboardSection className="max-w-3xl">
        <Skeleton className="h-64 rounded-2xl" />
      </DashboardSection>
    )
  }
  if (exam.isError) {
    return (
      <DashboardSection className="max-w-3xl">
        <LearningError
          error={exam.error}
          onRetry={() => void exam.refetch()}
          action={
            <Button asChild>
              <Link to="/courses">تصفّح الدورات</Link>
            </Button>
          }
        />
      </DashboardSection>
    )
  }

  const e = exam.data
  const resumeId = e.stats.in_progress_attempt_id
  const exhausted = e.stats.attempts_left === 0 && !resumeId

  const onStart = () =>
    start.mutate(e.id, {
      onSuccess: (attempt) => navigate(`/dashboard/exams/${e.id}/attempts/${attempt.id}`),
      onError: (err) => toast.error(err.message),
    })

  return (
    <DashboardSection className="max-w-3xl">
      <Seo title={e.title} noIndex />
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap gap-2">
            {e.is_free && <Badge variant="accent">مجاني</Badge>}
            {e.course && <Badge variant="secondary">{e.course.title}</Badge>}
          </div>
          <CardTitle className="text-2xl">{e.title}</CardTitle>
          <ExamMeta exam={e} />
        </CardHeader>
        <CardContent className="grid gap-5">
          <RichText html={e.description_html} />
          <ul className="grid gap-1.5 rounded-xl bg-muted/60 p-4 text-sm">
            <li>• تُحفظ إجاباتك تلقائياً، ويمكنك الرجوع لأي سؤال قبل التسليم.</li>
            <li>• يمكنك تمييز الأسئلة للمراجعة لاحقاً.</li>
            {e.duration_minutes && <li>• يُسلَّم الاختبار تلقائياً عند انتهاء الوقت.</li>}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {resumeId ? (
              <Button size="lg" asChild>
                <Link to={`/dashboard/exams/${e.id}/attempts/${resumeId}`}>
                  <PlayCircle />
                  استكمال المحاولة الحالية
                </Link>
              </Button>
            ) : (
              <Button size="lg" onClick={onStart} loading={start.isPending} disabled={exhausted}>
                {e.stats.attempts_used > 0 ? <RotateCcw /> : <PlayCircle />}
                {e.stats.attempts_used > 0 ? 'محاولة جديدة' : 'ابدأ الاختبار'}
              </Button>
            )}
            {e.stats.attempts_left !== null && (
              <span className="text-sm text-muted-foreground">المحاولات المتبقية: {e.stats.attempts_left}</span>
            )}
          </div>
          {exhausted && <p className="text-sm text-destructive">استنفدت جميع المحاولات المتاحة لهذا الاختبار.</p>}
        </CardContent>
      </Card>

      {e.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-5 text-muted-foreground" aria-hidden="true" />
              محاولاتك السابقة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {e.attempts.map((a, i) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="grid gap-0.5">
                    <span className="text-sm font-semibold">المحاولة {e.attempts.length - i}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(a.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.percent !== null ? (
                      <span className="flex items-center gap-1.5 font-semibold ltr-nums">
                        {a.passed && <Award className="size-4 text-success" aria-hidden="true" />}
                        {a.percent}%
                      </span>
                    ) : (
                      <Badge variant="accent">{a.status.label}</Badge>
                    )}
                    <Button asChild size="sm" variant="ghost">
                      <Link to={`/dashboard/exams/${e.id}/attempts/${a.id}`}>{a.percent !== null ? 'المراجعة' : 'استكمال'}</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </DashboardSection>
  )
}
