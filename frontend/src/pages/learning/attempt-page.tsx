import { ArrowLeft, ArrowRight, Award, CheckCircle2, Flag, RotateCcw, Send, Timer, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/errors'
import { RichText } from '@/components/common/rich-text'
import { Seo } from '@/components/common/seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LearningError } from '@/features/learning/locked-state'
import { useCountdown } from '@/features/learning/use-countdown'
import { useAttempt, useSaveAnswer, useSubmitAttempt } from '@/features/learning/use-learning'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { cn } from '@/lib/utils'
import type { Attempt, AttemptQuestion } from '@/types/learning'
import { formatClock } from '@/utils/format'

export function AttemptPage() {
  const params = useParams()
  const attemptId = Number(params.attemptId)
  const attempt = useAttempt(attemptId)

  if (attempt.isPending) {
    return (
      <DashboardSection className="max-w-4xl">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </DashboardSection>
    )
  }
  if (attempt.isError) {
    return (
      <DashboardSection className="max-w-4xl">
        <LearningError error={attempt.error} onRetry={() => void attempt.refetch()} />
      </DashboardSection>
    )
  }

  return attempt.data.status.value === 'in_progress' ? (
    <AttemptRunner key={attempt.data.id} attempt={attempt.data} onClosed={() => void attempt.refetch()} />
  ) : (
    <AttemptResult attempt={attempt.data} />
  )
}

// ---------------------------------------------------------------------------
// Taking the exam
// ---------------------------------------------------------------------------

function AttemptRunner({ attempt, onClosed }: { attempt: Attempt; onClosed: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, attempt.questions.findIndex((q) => q.answer.option_id === null)))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const save = useSaveAnswer(attempt.id)
  const submit = useSubmitAttempt(attempt.id)
  const secondsLeft = useCountdown(attempt.remaining_seconds)
  const autoSubmitted = useRef(false)

  const question = attempt.questions[index] ?? attempt.questions[0]!
  const unanswered = attempt.questions.filter((q) => q.answer.option_id === null).length
  const flagged = attempt.questions.filter((q) => q.answer.is_flagged).length

  const doSubmit = () =>
    submit.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        window.scrollTo({ top: 0 })
      },
      onError: (err) => toast.error(err.message),
    })

  // Time is up: submit what was saved (the server enforces the deadline too).
  useEffect(() => {
    if (secondsLeft === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true
      toast.info('انتهى الوقت، جارٍ تسليم إجاباتك…')
      submit.mutate(undefined, { onError: () => onClosed() })
    }
  }, [secondsLeft, submit, onClosed])

  const onSave = (body: { option_id?: number | null; flagged?: boolean }) =>
    save.mutate(
      { question_id: question.id, ...body },
      {
        onError: (err) => {
          if (ApiError.from(err).code === 'attempt_closed') {
            toast.info(err.message)
            onClosed()
          } else {
            toast.error(`لم يُحفظ آخر تعديل: ${err.message}`)
          }
        },
      },
    )

  const lowTime = secondsLeft !== null && secondsLeft <= 60

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-5">
      <Seo title={attempt.exam.title} noIndex />
      <header className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card/95 p-4 shadow-soft backdrop-blur">
        <div className="grid min-w-0 gap-1">
          <h1 className="truncate text-lg font-bold">{attempt.exam.title}</h1>
          <p className="text-xs text-muted-foreground ltr-nums">
            أجبت عن {attempt.answered_count} من {attempt.questions_count}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {secondsLeft !== null && (
            <span
              role="timer"
              aria-live={lowTime ? 'assertive' : 'off'}
              aria-label={`الوقت المتبقي ${formatClock(secondsLeft)}`}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-base font-bold ltr-nums',
                lowTime ? 'bg-destructive/10 text-destructive' : 'bg-muted',
              )}
            >
              <Timer className="size-4" aria-hidden="true" />
              {formatClock(secondsLeft)}
            </span>
          )}
          <Button onClick={() => setConfirmOpen(true)}>
            <Send />
            تسليم
          </Button>
        </div>
        <Progress
          value={(attempt.answered_count / Math.max(1, attempt.questions_count)) * 100}
          label="نسبة الأسئلة المجاب عنها"
          className="h-1.5 basis-full"
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_15rem]">
        <section className="grid content-start gap-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="question-title">
          <div className="flex items-center justify-between gap-2">
            <h2 id="question-title" className="text-sm font-semibold text-muted-foreground">
              السؤال {question.number} من {attempt.questions_count}
            </h2>
            <Button
              variant={question.answer.is_flagged ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={question.answer.is_flagged}
              onClick={() => onSave({ flagged: !question.answer.is_flagged })}
            >
              <Flag className={cn(question.answer.is_flagged && 'fill-current text-accent-foreground')} />
              {question.answer.is_flagged ? 'مميّز للمراجعة' : 'تمييز للمراجعة'}
            </Button>
          </div>

          <div className="grid gap-4">
            <div id={`q-body-${question.id}`} className="text-lg leading-8 font-semibold">
              <RichText html={question.body_html} className="[&_p]:m-0" />
            </div>
            <div role="radiogroup" aria-labelledby={`q-body-${question.id}`} className="grid gap-2.5">
              {question.options.map((option, i) => {
                const checked = question.answer.option_id === option.id
                return (
                  <label
                    key={option.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-colors hover:border-primary/40',
                      checked && 'border-primary bg-primary-soft',
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${question.id}`}
                      value={option.id}
                      checked={checked}
                      onChange={() => onSave({ option_id: option.id })}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {['أ', 'ب', 'ج', 'د', 'هـ', 'و'][i] ?? i + 1}
                    </span>
                    <span className="leading-7">{option.body}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button variant="ghost" size="sm" disabled={question.answer.option_id === null} onClick={() => onSave({ option_id: null })}>
              مسح الإجابة
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
                <ArrowRight />
                السابق
              </Button>
              {index < attempt.questions.length - 1 ? (
                <Button onClick={() => setIndex((i) => i + 1)}>
                  التالي
                  <ArrowLeft />
                </Button>
              ) : (
                <Button onClick={() => setConfirmOpen(true)}>
                  <Send />
                  إنهاء وتسليم
                </Button>
              )}
            </div>
          </div>
        </section>

        <nav aria-label="أسئلة الاختبار" className="content-start rounded-2xl border bg-card p-4">
          <h2 className="mb-3 text-sm font-bold">التنقل بين الأسئلة</h2>
          <ol className="grid grid-cols-6 gap-2 lg:grid-cols-5">
            {attempt.questions.map((q, i) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index ? 'step' : undefined}
                  aria-label={`السؤال ${q.number}${q.answer.option_id !== null ? '، تمت الإجابة' : ''}${q.answer.is_flagged ? '، مميّز' : ''}`}
                  className={cn(
                    'relative flex aspect-square w-full items-center justify-center rounded-lg border text-sm font-semibold ltr-nums transition-colors',
                    q.answer.option_id !== null ? 'border-primary/30 bg-primary-soft text-primary' : 'hover:bg-muted',
                    i === index && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
                  )}
                >
                  {q.number}
                  {q.answer.is_flagged && <span className="absolute -end-1 -top-1 size-2.5 rounded-full bg-accent" aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ol>
          <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="size-3 rounded bg-primary-soft ring-1 ring-primary/30" aria-hidden="true" /> تمت الإجابة
            </li>
            <li className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" /> مميّز للمراجعة
            </li>
          </ul>
        </nav>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تسليم الاختبار؟</DialogTitle>
            <DialogDescription>لن تتمكن من تعديل إجاباتك بعد التسليم.</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1 text-sm">
            <li>
              أسئلة بلا إجابة: <strong className="ltr-nums">{unanswered}</strong>
            </li>
            <li>
              أسئلة مميّزة للمراجعة: <strong className="ltr-nums">{flagged}</strong>
            </li>
          </ul>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">متابعة الحل</Button>
            </DialogClose>
            <Button onClick={doSubmit} loading={submit.isPending}>
              تأكيد التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result and review
// ---------------------------------------------------------------------------

function AttemptResult({ attempt }: { attempt: Attempt }) {
  const [wrongOnly, setWrongOnly] = useState(false)
  const result = attempt.result!
  const reviewable = attempt.exam.show_answers
  const questions = wrongOnly ? attempt.questions.filter((q) => !q.is_correct) : attempt.questions

  return (
    <DashboardSection className="max-w-4xl">
      <Seo title={`نتيجة ${attempt.exam.title}`} noIndex />
      <section
        className={cn(
          'grid gap-4 rounded-2xl border p-6 text-center shadow-soft',
          result.passed ? 'border-success/30 bg-success/5' : 'bg-card',
        )}
        aria-labelledby="result-title"
      >
        <span
          className={cn(
            'mx-auto flex size-16 items-center justify-center rounded-2xl',
            result.passed ? 'bg-success/12 text-success' : 'bg-muted text-muted-foreground',
          )}
        >
          <Award className="size-9" aria-hidden="true" />
        </span>
        <h1 id="result-title" className="text-xl font-bold">
          {attempt.exam.title}
        </h1>
        <p className="text-5xl font-extrabold ltr-nums">{result.percent}%</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant={result.passed ? 'success' : 'destructive'}>{result.passed ? 'ناجح' : 'لم تجتز الاختبار'}</Badge>
          {attempt.status.value === 'expired' && <Badge variant="accent">{attempt.status.label}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {result.correct_count} إجابة صحيحة من {attempt.questions_count} · درجة النجاح {attempt.exam.pass_percent}%
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to={`/dashboard/exams/${attempt.exam.id}`}>
              <RotateCcw />
              العودة إلى الاختبار
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard/exams">كل الاختبارات</Link>
          </Button>
        </div>
      </section>

      {reviewable ? (
        <section aria-labelledby="review-title" className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="review-title" className="text-lg font-bold">
              مراجعة الإجابات
            </h2>
            <Button variant="outline" size="sm" aria-pressed={wrongOnly} onClick={() => setWrongOnly((v) => !v)}>
              {wrongOnly ? 'عرض كل الأسئلة' : 'الأخطاء فقط'}
            </Button>
          </div>
          {questions.length === 0 ? (
            <p className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">لا توجد أخطاء. عمل رائع!</p>
          ) : (
            <ol className="grid gap-4">
              {questions.map((q) => (
                <ReviewQuestion key={q.id} question={q} />
              ))}
            </ol>
          )}
        </section>
      ) : (
        <p className="rounded-xl border bg-card p-5 text-center text-sm text-muted-foreground">لا يتيح هذا الاختبار مراجعة الإجابات الصحيحة.</p>
      )}
    </DashboardSection>
  )
}

function ReviewQuestion({ question }: { question: AttemptQuestion }) {
  const selected = question.answer.option_id

  return (
    <li className="grid gap-3 rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted-foreground">السؤال {question.number}</span>
        {question.is_correct ? (
          <Badge variant="success">
            <CheckCircle2 className="size-3.5" aria-hidden="true" /> صحيحة
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="size-3.5" aria-hidden="true" /> {selected === null ? 'بلا إجابة' : 'خاطئة'}
          </Badge>
        )}
      </div>
      <RichText html={question.body_html} className="font-semibold" />
      <ul className="grid gap-2">
        {question.options.map((o) => {
          const isCorrect = o.id === question.correct_option_id
          const isSelected = o.id === selected
          return (
            <li
              key={o.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                isCorrect && 'border-success/40 bg-success/8',
                isSelected && !isCorrect && 'border-destructive/40 bg-destructive/8',
              )}
            >
              {isCorrect ? (
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="الإجابة الصحيحة" />
              ) : isSelected ? (
                <XCircle className="size-4 shrink-0 text-destructive" aria-label="إجابتك" />
              ) : (
                <span className="size-4 shrink-0" aria-hidden="true" />
              )}
              <span>{o.body}</span>
              {isSelected && <span className="ms-auto text-xs text-muted-foreground">إجابتك</span>}
            </li>
          )
        })}
      </ul>
      {question.explanation_html && (
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="mb-1 font-semibold">الشرح</p>
          <RichText html={question.explanation_html} />
        </div>
      )}
    </li>
  )
}
