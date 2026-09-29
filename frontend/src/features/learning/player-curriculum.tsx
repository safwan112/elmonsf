import { CheckCircle2, Circle } from 'lucide-react'
import { createElement } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import type { PlayerSection } from '@/types/learning'
import { formatClock } from '@/utils/format'
import { LESSON_ICONS } from './lesson-icons'

/** Curriculum with completion marks; the current lesson is highlighted. */
export function PlayerCurriculum({
  sections,
  currentLessonId,
  onNavigate,
}: {
  sections: PlayerSection[]
  currentLessonId?: number
  onNavigate?: () => void
}) {
  return (
    <ol className="grid gap-5">
      {sections.map((section, s) => {
        const done = section.lessons.filter((l) => l.is_completed).length
        return (
          <li key={section.id}>
            <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
              <h3 className="text-sm font-bold">
                <span className="text-muted-foreground ltr-nums">{s + 1}. </span>
                {section.title}
              </h3>
              <span className="shrink-0 text-xs text-muted-foreground ltr-nums">
                {done}/{section.lessons.length}
              </span>
            </div>
            <ul className="grid gap-1">
              {section.lessons.map((lesson) => {
                const current = lesson.id === currentLessonId
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/dashboard/lessons/${lesson.id}`}
                      onClick={onNavigate}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted',
                        current && 'bg-primary-soft font-semibold text-primary hover:bg-primary-soft',
                      )}
                    >
                      {lesson.is_completed ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="مكتمل" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1 leading-6">{lesson.title}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {createElement(LESSON_ICONS[lesson.type.value], { className: 'size-3.5', 'aria-hidden': true })}
                        <span className="ltr-nums">{formatClock(lesson.duration_seconds)}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        )
      })}
    </ol>
  )
}
