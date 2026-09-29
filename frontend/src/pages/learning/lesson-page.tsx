import { ArrowLeft, ArrowRight, CheckCircle2, Download, ListTree, PlayCircle, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { learningApi } from '@/api/learning'
import { RichText } from '@/components/common/rich-text'
import { Seo } from '@/components/common/seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { LearningError } from '@/features/learning/locked-state'
import { PlayerCurriculum } from '@/features/learning/player-curriculum'
import { useCoursePlayer, useLesson, useLessonCompletion } from '@/features/learning/use-learning'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { formatDuration } from '@/utils/format'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LessonPage() {
  const lessonId = Number(useParams().id)
  const lesson = useLesson(lessonId)
  const courseId = lesson.data?.is_enrolled ? lesson.data.course.id : 0
  const player = useCoursePlayer(courseId)
  const completion = useLessonCompletion(lesson.data)
  const [outlineOpen, setOutlineOpen] = useState(false)

  if (lesson.isPending) {
    return (
      <DashboardSection>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </DashboardSection>
    )
  }
  if (lesson.isError) {
    return (
      <DashboardSection>
        <LearningError error={lesson.error} onRetry={() => void lesson.refetch()} />
      </DashboardSection>
    )
  }

  const l = lesson.data
  const completed = Boolean(l.progress.completed_at)
  const outline = player.data && (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <div className="flex justify-between text-sm">
          <span className="font-medium">تقدّمك في الدورة</span>
          <span className="font-semibold ltr-nums">{player.data.progress.percent}%</span>
        </div>
        <Progress value={player.data.progress.percent} label="نسبة إكمال الدورة" />
      </div>
      <PlayerCurriculum sections={player.data.curriculum} currentLessonId={l.id} onNavigate={() => setOutlineOpen(false)} />
    </div>
  )

  const toggleComplete = () =>
    completion.mutate(!completed, {
      onSuccess: (res) => toast.success(res.message ?? 'تم الحفظ'),
      onError: (err) => toast.error(err.message),
    })

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 xl:grid-cols-[1fr_22rem]">
      <Seo title={l.title} noIndex />
      <article className="grid min-w-0 content-start gap-5">
        <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {l.is_enrolled ? (
            <Link to={`/dashboard/courses/${l.course.id}`} className="hover:text-primary">
              {l.course.title}
            </Link>
          ) : (
            <Link to={`/courses/${encodeURIComponent(l.course.slug)}`} className="hover:text-primary">
              {l.course.title}
            </Link>
          )}
          <span aria-hidden="true">/</span>
          <span>{l.section.title}</span>
        </nav>

        {l.video_embed_url ? (
          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-soft">
            <iframe
              src={l.video_embed_url}
              title={l.title}
              className="size-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : l.type.value === 'video' ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted/50 text-center text-muted-foreground">
            <PlayCircle className="size-10" aria-hidden="true" />
            <p className="text-sm">سيتوفر فيديو هذا الدرس قريباً، ويمكنك الاطلاع على ملخّصه أدناه.</p>
          </div>
        ) : null}

        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{l.type.label}</Badge>
              {l.duration_seconds > 0 && <span className="text-xs text-muted-foreground">{formatDuration(l.duration_seconds)}</span>}
              {completed && (
                <Badge variant="success">
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  مكتمل
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold sm:text-2xl">{l.title}</h1>
          </div>
          {player.data && (
            <Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="xl:hidden">
                  <ListTree />
                  محتوى الدورة
                </Button>
              </SheetTrigger>
              <SheetContent side="start" className="overflow-y-auto">
                <SheetTitle>محتوى الدورة</SheetTitle>
                <SheetDescription className="sr-only">دروس الدورة وحالة إكمالها</SheetDescription>
                {outline}
              </SheetContent>
            </Sheet>
          )}
        </header>

        {l.content_html && (
          <div className="rounded-2xl border bg-card p-5 sm:p-6">
            <RichText html={l.content_html} />
          </div>
        )}

        {l.attachments.length > 0 && (
          <section aria-labelledby="attachments" className="grid gap-2 rounded-2xl border bg-card p-5">
            <h2 id="attachments" className="font-bold">
              مرفقات الدرس
            </h2>
            <ul className="grid gap-2">
              {l.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={learningApi.attachmentUrl(a.id)}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-muted/60"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <Download className="size-4 text-primary" aria-hidden="true" />
                      {a.title}
                    </span>
                    <span className="text-xs text-muted-foreground ltr-nums">{formatBytes(a.size_bytes)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {l.is_enrolled && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4">
            <Button variant={completed ? 'outline' : 'default'} onClick={toggleComplete} loading={completion.isPending}>
              {completed ? <RotateCcw /> : <CheckCircle2 />}
              {completed ? 'إلغاء تحديد الإكمال' : 'تحديد كمكتمل'}
            </Button>
            <div className="flex gap-2">
              {l.prev_lesson_id && (
                <Button variant="ghost" asChild>
                  <Link to={`/dashboard/lessons/${l.prev_lesson_id}`}>
                    <ArrowRight />
                    السابق
                  </Link>
                </Button>
              )}
              {l.next_lesson_id && (
                <Button variant="secondary" asChild>
                  <Link to={`/dashboard/lessons/${l.next_lesson_id}`}>
                    التالي
                    <ArrowLeft />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </article>

      {outline && (
        <aside aria-label="محتوى الدورة" className="hidden xl:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-2xl border bg-card p-4">{outline}</div>
        </aside>
      )}
    </div>
  )
}
