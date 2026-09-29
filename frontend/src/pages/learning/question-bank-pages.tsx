import { CheckCircle2, Library, Lock, RotateCcw, Target, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { RichText } from '@/components/common/rich-text'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { LearningError } from '@/features/learning/locked-state'
import { useAnswerPractice, useBankQuestions, useQuestionBank, useQuestionBanks } from '@/features/learning/use-learning'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { cn } from '@/lib/utils'
import type { Difficulty, PracticeFilters, PracticeQuestion, QuestionBankSummary } from '@/types/learning'

function BankCard({ bank }: { bank: QuestionBankSummary }) {
  const accuracy = bank.stats.answered > 0 ? Math.round((bank.stats.correct / bank.stats.answered) * 100) : null
  const unlockTo = bank.unlock?.product
    ? `/products/${encodeURIComponent(bank.unlock.product.slug)}`
    : bank.unlock?.course
      ? `/courses/${encodeURIComponent(bank.unlock.course.slug)}`
      : '/products'

  return (
    <article className={cn('flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-soft', !bank.is_unlocked && 'bg-muted/40')}>
      <div className="flex flex-wrap items-center gap-2">
        {bank.is_free && <Badge variant="accent">مجاني</Badge>}
        {bank.category && <Badge variant="secondary">{bank.category.name}</Badge>}
        {!bank.is_unlocked && (
          <Badge variant="outline">
            <Lock className="size-3" aria-hidden="true" /> مقفل
          </Badge>
        )}
      </div>
      <h2 className="text-lg font-bold">{bank.title}</h2>
      <p className="text-sm text-muted-foreground">{bank.questions_count} سؤال</p>
      {bank.is_unlocked && (
        <div className="grid gap-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="ltr-nums">
              حللت {bank.stats.answered} / {bank.questions_count}
            </span>
            {accuracy !== null && <span className="ltr-nums">دقة {accuracy}%</span>}
          </div>
          <Progress value={(bank.stats.answered / Math.max(1, bank.questions_count)) * 100} label={`تقدّمك في ${bank.title}`} />
        </div>
      )}
      <div className="mt-auto pt-2">
        {bank.is_unlocked ? (
          <Button asChild className="w-full">
            <Link to={`/dashboard/question-bank/${bank.id}`}>
              <Target />
              {bank.stats.answered > 0 ? 'متابعة التدريب' : 'ابدأ التدريب'}
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to={unlockTo}>
              <Lock />
              {bank.unlock?.product ? `اشترِ ${bank.unlock.product.title}` : bank.unlock?.course ? 'اشترك في الدورة' : 'فتح البنك'}
            </Link>
          </Button>
        )}
      </div>
    </article>
  )
}

export function QuestionBanksPage() {
  const banks = useQuestionBanks()

  return (
    <DashboardSection>
      <Seo title="بنك الأسئلة" noIndex />
      <PageHeader title="بنك الأسئلة" description="تدرّب سؤالاً بسؤال مع تصحيح فوري وشرح مختصر لكل إجابة." />
      {banks.isError ? (
        <LearningError error={banks.error} onRetry={() => void banks.refetch()} />
      ) : banks.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : banks.data.length === 0 ? (
        <EmptyState icon={Library} title="لا توجد بنوك أسئلة بعد" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banks.data.map((bank) => (
            <li key={bank.id}>
              <BankCard bank={bank} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}

const STATUS_OPTIONS: { value: NonNullable<PracticeFilters['status']>; label: string }[] = [
  { value: 'all', label: 'كل الأسئلة' },
  { value: 'unanswered', label: 'لم أحلّها' },
  { value: 'incorrect', label: 'أخطائي' },
  { value: 'correct', label: 'أجبتها صح' },
]

function readFilters(params: URLSearchParams): PracticeFilters {
  const status = params.get('status')
  const difficulty = params.get('difficulty')
  return {
    topic: params.get('topic') || undefined,
    difficulty: difficulty === 'easy' || difficulty === 'medium' || difficulty === 'hard' ? difficulty : undefined,
    status: STATUS_OPTIONS.some((o) => o.value === status) ? (status as PracticeFilters['status']) : 'all',
    page: Number(params.get('page')) > 1 ? Number(params.get('page')) : undefined,
  }
}

export function PracticePage() {
  const bankId = Number(useParams().id)
  const [params, setParams] = useSearchParams()
  const filters = readFilters(params)
  const bank = useQuestionBank(bankId)
  const questions = useBankQuestions(bankId, filters)

  const setFilter = (key: keyof PracticeFilters, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  if (bank.isError) {
    return (
      <DashboardSection>
        <LearningError
          error={bank.error}
          onRetry={() => void bank.refetch()}
          action={
            <Button asChild>
              <Link to="/dashboard/question-bank">كل بنوك الأسئلة</Link>
            </Button>
          }
        />
      </DashboardSection>
    )
  }

  return (
    <DashboardSection className="max-w-4xl">
      <Seo title={bank.data?.title ?? 'بنك الأسئلة'} noIndex />
      {bank.isPending ? (
        <Skeleton className="h-20 rounded-2xl" />
      ) : (
        <PageHeader
          title={bank.data.title}
          description={
            <span className="ltr-nums">
              حللت {bank.data.stats.answered} من {bank.data.questions_count} · إجابات صحيحة {bank.data.stats.correct}
            </span>
          }
        />
      )}

      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="practice-status">الحالة</Label>
          <NativeSelect id="practice-status" value={filters.status ?? 'all'} onChange={(e) => setFilter('status', e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="practice-topic">الموضوع</Label>
          <NativeSelect id="practice-topic" value={filters.topic ?? ''} onChange={(e) => setFilter('topic', e.target.value)}>
            <option value="">كل المواضيع</option>
            {bank.data?.topics.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.questions_count})
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="practice-difficulty">الصعوبة</Label>
          <NativeSelect id="practice-difficulty" value={filters.difficulty ?? ''} onChange={(e) => setFilter('difficulty', e.target.value)}>
            <option value="">كل المستويات</option>
            <option value="easy">سهل</option>
            <option value="medium">متوسط</option>
            <option value="hard">صعب</option>
          </NativeSelect>
        </div>
      </div>

      {questions.isError ? (
        <LearningError error={questions.error} onRetry={() => void questions.refetch()} />
      ) : questions.isPending ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : questions.data.data.length === 0 ? (
        <EmptyState icon={Target} title="لا توجد أسئلة مطابقة" description="غيّر عوامل التصفية لعرض أسئلة أخرى." />
      ) : (
        <>
          <ol className={cn('grid gap-4', questions.isPlaceholderData && 'opacity-60')}>
            {questions.data.data.map((q, i) => (
              <PracticeCard
                key={q.id}
                bankId={bankId}
                filters={filters}
                question={q}
                number={(questions.data.meta.from ?? 1) + i}
              />
            ))}
          </ol>
          <Pagination meta={questions.data.meta} onPageChange={(p) => setFilter('page', p > 1 ? String(p) : undefined)} />
        </>
      )}
    </DashboardSection>
  )
}

const DIFFICULTY_VARIANT: Record<Difficulty, 'success' | 'accent' | 'destructive'> = {
  easy: 'success',
  medium: 'accent',
  hard: 'destructive',
}

function PracticeCard({
  bankId,
  filters,
  question,
  number,
}: {
  bankId: number
  filters: PracticeFilters
  question: PracticeQuestion
  number: number
}) {
  const answer = useAnswerPractice(bankId, filters)
  // "Try again" hides the previous feedback locally until a new answer.
  const [retrying, setRetrying] = useState(false)
  const feedback = retrying ? null : question.practice

  const choose = (optionId: number) =>
    answer.mutate(
      { questionId: question.id, optionId },
      { onSuccess: () => setRetrying(false), onError: (err) => toast.error(err.message) },
    )

  return (
    <li className="grid gap-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground ltr-nums">#{number}</span>
        <Badge variant={DIFFICULTY_VARIANT[question.difficulty.value]}>{question.difficulty.label}</Badge>
        {question.topic && <Badge variant="secondary">{question.topic}</Badge>}
        {feedback && (
          <Badge variant={feedback.is_correct ? 'success' : 'destructive'} className="ms-auto">
            {feedback.is_correct ? 'إجابة صحيحة' : 'إجابة خاطئة'}
          </Badge>
        )}
      </div>
      <div id={`pq-${question.id}`} className="font-semibold">
        <RichText html={question.body_html} />
      </div>
      <ul className="grid gap-2" aria-label="الخيارات">
        {question.options.map((o) => {
          const isCorrect = feedback?.correct_option_id === o.id
          const isWrongPick = feedback && feedback.selected_option_id === o.id && !feedback.is_correct
          return (
            <li key={o.id}>
              <button
                type="button"
                disabled={Boolean(feedback) || answer.isPending}
                onClick={() => choose(o.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl border-2 p-3 text-start text-sm transition-colors enabled:hover:border-primary/40 disabled:cursor-default',
                  isCorrect && 'border-success/50 bg-success/8',
                  isWrongPick && 'border-destructive/50 bg-destructive/8',
                )}
              >
                {isCorrect ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-label="الإجابة الصحيحة" />
                ) : isWrongPick ? (
                  <XCircle className="size-4 shrink-0 text-destructive" aria-label="إجابتك" />
                ) : (
                  <span className="size-4 shrink-0 rounded-full border" aria-hidden="true" />
                )}
                {o.body}
              </button>
            </li>
          )
        })}
      </ul>
      {feedback && (
        <div className="grid gap-3" aria-live="polite">
          {feedback.explanation_html && (
            <div className="rounded-lg bg-muted/60 p-3 text-sm">
              <p className="mb-1 font-semibold">الشرح</p>
              <RichText html={feedback.explanation_html} />
            </div>
          )}
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setRetrying(true)}>
            <RotateCcw />
            حاول مجدداً
          </Button>
        </div>
      )}
    </li>
  )
}
