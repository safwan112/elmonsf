import { FileText, ListChecks, Lock, PlayCircle, Video } from 'lucide-react'
import { useState } from 'react'
import { RichText } from '@/components/common/rich-text'
import { ErrorState, Spinner } from '@/components/common/states'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { CurriculumSection, LessonType } from '@/types/catalog'
import { formatClock, formatDuration, lessonsLabel } from '@/utils/format'
import { useLessonPreview } from './use-catalog'

const TYPE_ICONS: Record<LessonType, typeof Video> = {
  video: Video,
  text: FileText,
  file: FileText,
  quiz: ListChecks,
}

function PreviewDialog({ slug, lessonId, onClose }: { slug: string; lessonId: number | null; onClose: () => void }) {
  const preview = useLessonPreview(slug, lessonId)

  return (
    <Dialog open={lessonId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{preview.data?.title ?? 'معاينة الدرس'}</DialogTitle>
          <DialogDescription>معاينة مجانية من محتوى الدورة.</DialogDescription>
        </DialogHeader>
        {preview.isPending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : preview.isError ? (
          <ErrorState error={preview.error} onRetry={() => void preview.refetch()} />
        ) : (
          <div className="grid gap-4">
            {preview.data.video_embed_url && (
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <iframe
                  src={preview.data.video_embed_url}
                  title={preview.data.title}
                  className="size-full"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  referrerPolicy="strict-origin-when-cross-origin"
                  sandbox="allow-scripts allow-same-origin allow-presentation"
                  loading="lazy"
                />
              </div>
            )}
            <RichText html={preview.data.content_html} />
            {!preview.data.video_embed_url && !preview.data.content_html && (
              <p className="text-sm text-muted-foreground">لا يتوفر محتوى للمعاينة لهذا الدرس.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function Curriculum({ slug, sections }: { slug: string; sections: CurriculumSection[] }) {
  const [previewId, setPreviewId] = useState<number | null>(null)
  const first = sections[0]

  return (
    <>
      <Accordion type="multiple" defaultValue={first ? [String(first.id)] : []} className="rounded-xl border bg-card px-4 sm:px-5">
        {sections.map((section, index) => (
          <AccordionItem key={section.id} value={String(section.id)}>
            <AccordionTrigger>
              <span className="flex flex-col gap-0.5">
                <span>
                  <span className="text-muted-foreground">{index + 1}. </span>
                  {section.title}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {lessonsLabel(section.lessons_count)} · {formatDuration(section.duration_seconds)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="grid gap-1">
                {section.lessons.map((lesson) => {
                  const Icon = TYPE_ICONS[lesson.type.value] ?? Video
                  return (
                    <li key={lesson.id} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={lesson.type.label} />
                      <span className="flex-1 text-sm">{lesson.title}</span>
                      {lesson.is_preview ? (
                        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setPreviewId(lesson.id)}>
                          <PlayCircle />
                          معاينة
                        </Button>
                      ) : (
                        <Lock className="size-3.5 text-muted-foreground/70" aria-label="متاح للمشتركين" />
                      )}
                      <span className="w-12 text-end text-xs text-muted-foreground tabular-nums" dir="ltr">
                        {formatClock(lesson.duration_seconds)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <PreviewDialog slug={slug} lessonId={previewId} onClose={() => setPreviewId(null)} />
    </>
  )
}
