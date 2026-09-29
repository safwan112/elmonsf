import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, ClipboardList, Library, ListChecks, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { adminApi, adminResource } from '@/api/admin'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { ErrorState, PageLoader } from '@/components/common/states'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import type { FieldDef } from '@/features/admin/form-values'
import { ResourceForm } from '@/features/admin/resource-form'
import { ResourcePage } from '@/features/admin/resource-page'
import { useBankOptions, useCategoryOptions, useCourseOptions, useProductOptions } from '@/features/admin/use-lookups'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { publishStatusOptions, type AdminExam, type AdminQuestion, type AdminQuestionBank } from '@/types/admin'

const difficultyOptions = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
]

/** First line of a Markdown question body, for tables. */
const preview = (body: string) => body.split('\n')[0]!.replace(/[#*_>`]/g, '').slice(0, 120)

function gatingFields(courses: { value: string; label: string }[], products: { value: string; label: string }[]): FieldDef[] {
  return [
    { name: 'course_id', label: 'مرتبط بدورة', type: 'select', numeric: true, options: courses, placeholder: 'لا — مجاني أو عبر منتج', hint: 'يصل إليه المشتركون في الدورة.' },
    { name: 'product_id', label: 'مرتبط بمنتج', type: 'select', numeric: true, options: products, placeholder: 'لا', hint: 'يصل إليه من اشترى المنتج. بدون دورة أو منتج يكون مجانياً.' },
  ]
}

export function AdminQuestionBanksPage() {
  const categories = useCategoryOptions()
  const courses = useCourseOptions()
  const products = useProductOptions()

  return (
    <ResourcePage<AdminQuestionBank>
      resource="question-banks"
      title="بنوك الأسئلة"
      description="مجموعات أسئلة التدريب، مجانية أو مرتبطة بدورة أو منتج."
      singular="بنك أسئلة"
      emptyIcon={Library}
      wide
      fields={[
        { name: 'title', label: 'العنوان', type: 'text', required: true, wide: true },
        { name: 'category_id', label: 'التصنيف', type: 'select', numeric: true, options: categories },
        { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
        ...gatingFields(courses, products),
        { name: 'description', label: 'الوصف', type: 'markdown', rows: 4 },
        { name: 'is_active', label: 'مفعّل', type: 'switch' },
      ]}
      rowActions={(b) => (
        <Button asChild variant="ghost" size="sm">
          <Link to={`/admin/questions?bank_id=${b.id}`}>الأسئلة</Link>
        </Button>
      )}
      columns={[
        { header: 'البنك', cell: (b) => <span className="font-medium">{b.title}</span> },
        { header: 'الأسئلة', cell: (b) => b.questions_count },
        {
          header: 'الوصول',
          cell: (b) => (b.product ? `منتج: ${b.product.title}` : b.course ? `دورة: ${b.course.title}` : <Badge variant="accent">مجاني</Badge>),
          className: 'hidden md:table-cell',
        },
        { header: 'الحالة', cell: (b) => <Badge variant={b.is_active ? 'success' : 'secondary'}>{b.is_active ? 'مفعّل' : 'معطّل'}</Badge> },
      ]}
    />
  )
}

export function AdminQuestionsPage() {
  const banks = useBankOptions()

  return (
    <ResourcePage<AdminQuestion>
      resource="questions"
      title="الأسئلة"
      description="أسئلة الاختيار من متعدد مع الإجابة الصحيحة والشرح."
      singular="سؤال"
      emptyIcon={ListChecks}
      wide
      filters={[
        { name: 'search', label: 'بحث', type: 'search', placeholder: 'ابحث في نص السؤال' },
        { name: 'bank_id', label: 'البنك', type: 'select', options: banks },
        { name: 'difficulty', label: 'الصعوبة', type: 'select', options: difficultyOptions },
      ]}
      fields={[
        { name: 'question_bank_id', label: 'البنك', type: 'select', numeric: true, options: banks, required: true },
        { name: 'difficulty', label: 'الصعوبة', type: 'select', options: difficultyOptions },
        { name: 'topic', label: 'الموضوع', type: 'text' },
        { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
        { name: 'body', label: 'نص السؤال', type: 'markdown', rows: 4, required: true },
        { name: 'options', label: 'الخيارات', type: 'options' },
        { name: 'explanation', label: 'الشرح (يظهر بعد الإجابة)', type: 'markdown', rows: 3 },
        { name: 'is_active', label: 'مفعّل', type: 'switch' },
      ]}
      toSource={(q) => ({ ...q, difficulty: q.difficulty.value })}
      columns={[
        { header: 'السؤال', cell: (q) => <span className="line-clamp-2 max-w-md">{preview(q.body)}</span> },
        { header: 'البنك', cell: (q) => q.bank?.title ?? '—', className: 'hidden lg:table-cell' },
        { header: 'الموضوع', cell: (q) => q.topic ?? '—', className: 'hidden md:table-cell' },
        { header: 'الصعوبة', cell: (q) => q.difficulty.label },
        { header: 'الحالة', cell: (q) => <Badge variant={q.is_active ? 'success' : 'secondary'}>{q.is_active ? 'مفعّل' : 'معطّل'}</Badge> },
      ]}
    />
  )
}

function examFields(courses: { value: string; label: string }[], products: { value: string; label: string }[]): FieldDef[] {
  return [
    { name: 'title', label: 'العنوان', type: 'text', required: true, wide: true },
    { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
    { name: 'duration_minutes', label: 'المدة (دقائق)', type: 'number', min: 1, hint: 'اتركها فارغة لاختبار بدون توقيت.' },
    { name: 'pass_percent', label: 'درجة النجاح (%)', type: 'number', min: 0, max: 100, omitEmpty: true },
    { name: 'max_attempts', label: 'عدد المحاولات', type: 'number', min: 1, hint: 'فارغ = غير محدود.' },
    ...gatingFields(courses, products),
    { name: 'description', label: 'الوصف', type: 'markdown', rows: 4 },
    { name: 'shuffle_questions', label: 'ترتيب عشوائي للأسئلة', type: 'switch' },
    { name: 'shuffle_options', label: 'ترتيب عشوائي للخيارات', type: 'switch' },
    { name: 'show_answers', label: 'إظهار الإجابات والشرح بعد التسليم', type: 'switch' },
  ]
}

export function AdminExamsPage() {
  const courses = useCourseOptions()
  const products = useProductOptions()
  const navigate = useNavigate()

  return (
    <ResourcePage<AdminExam>
      resource="exams"
      title="الاختبارات"
      description="اختبارات محاكية بتوقيت وتصحيح تلقائي."
      singular="اختبار"
      emptyIcon={ClipboardList}
      wide
      fields={examFields(courses, products)}
      editHref={(e) => `/admin/exams/${e.id}`}
      onCreated={(e) => navigate(`/admin/exams/${e.id}`)}
      columns={[
        { header: 'الاختبار', cell: (e) => <Link to={`/admin/exams/${e.id}`} className="font-medium hover:text-primary">{e.title}</Link> },
        { header: 'الأسئلة', cell: (e) => e.questions_count },
        { header: 'المدة', cell: (e) => (e.duration_minutes ? `${e.duration_minutes} د` : '—'), className: 'hidden md:table-cell' },
        { header: 'المحاولات', cell: (e) => e.attempts_count, className: 'hidden md:table-cell' },
        { header: 'الحالة', cell: (e) => <Badge variant={e.status.value === 'published' ? 'success' : 'secondary'}>{e.status.label}</Badge> },
      ]}
    />
  )
}

export function AdminExamEditorPage() {
  const id = Number(useParams().id)
  const queryClient = useQueryClient()
  const courses = useCourseOptions()
  const products = useProductOptions()
  const exam = useQuery({ queryKey: queryKeys.admin.resource('exams', 'detail', id), queryFn: () => adminResource<AdminExam>('exams').show(id) })

  if (exam.isPending) return <PageLoader />
  if (exam.isError) {
    return (
      <DashboardSection>
        <ErrorState error={exam.error} onRetry={() => void exam.refetch()} />
      </DashboardSection>
    )
  }
  const e = exam.data
  const refresh = () => void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('exams') })

  return (
    <DashboardSection>
      <Seo title={`تحرير: ${e.title}`} noIndex />
      <PageHeader
        title={e.title}
        description={`${e.questions_count} سؤال · ${e.attempts_count} محاولة`}
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/exams">كل الاختبارات</Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="content-start">
          <CardHeader>
            <CardTitle>الإعدادات</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceForm
              key={`${e.id}-${e.status.value}-${e.questions_count}`}
              fields={examFields(courses, products)}
              source={{ ...e, status: e.status.value } as unknown as Record<string, unknown>}
              onSubmit={async (body) => {
                await adminResource<AdminExam>('exams').update(e.id, body)
                toast.success('تم الحفظ')
                refresh()
              }}
            />
          </CardContent>
        </Card>
        <ExamQuestionsEditor exam={e} onSaved={refresh} />
      </div>
    </DashboardSection>
  )
}

function ExamQuestionsEditor({ exam, onSaved }: { exam: AdminExam; onSaved: () => void }) {
  const [selected, setSelected] = useState(() => (exam.questions ?? []).map((q) => ({ id: q.id, body: q.body, points: q.points })))
  const [bankId, setBankId] = useState('')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search.trim())
  const [saving, setSaving] = useState(false)
  const banks = useBankOptions()
  const locked = exam.attempts_count > 0

  const params = { bank_id: bankId || undefined, search: debounced || undefined, per_page: 20 }
  const candidates = useQuery({
    queryKey: queryKeys.admin.resource('questions', 'picker', params),
    queryFn: () => adminResource<AdminQuestion>('questions').list(params),
    enabled: !locked,
  })
  const chosen = new Set(selected.map((q) => q.id))

  const save = async () => {
    setSaving(true)
    try {
      await adminApi.syncExamQuestions(exam.id, selected.map((q) => ({ id: q.id, points: q.points })))
      toast.success('تم حفظ أسئلة الاختبار')
      onSaved()
    } catch (err) {
      toast.error(ApiError.from(err).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="content-start">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>أسئلة الاختبار ({selected.length})</CardTitle>
        {!locked && (
          <Button size="sm" onClick={() => void save()} loading={saving}>
            حفظ الأسئلة
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-4">
        {locked && (
          <Alert>
            <AlertDescription>لدى هذا الاختبار محاولات، لذلك لا يمكن تغيير أسئلته. أنشئ اختباراً جديداً لتعديل المحتوى.</AlertDescription>
          </Alert>
        )}
        <ol className="grid gap-1.5">
          {selected.map((q, i) => (
            <li key={q.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground ltr-nums">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate">{preview(q.body)}</span>
              <Input
                type="number"
                min={1}
                max={100}
                value={q.points}
                disabled={locked}
                aria-label={`درجة السؤال ${i + 1}`}
                className="h-8 w-16"
                dir="ltr"
                onChange={(ev) => setSelected((list) => list.map((x) => (x.id === q.id ? { ...x, points: Math.max(1, Number(ev.target.value) || 1) } : x)))}
              />
              {!locked && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`نقل السؤال ${i + 1} للأعلى`}
                    disabled={i === 0}
                    onClick={() => setSelected((list) => {
                      const next = [...list]
                      ;[next[i - 1], next[i]] = [next[i]!, next[i - 1]!]
                      return next
                    })}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`نقل السؤال ${i + 1} للأسفل`}
                    disabled={i === selected.length - 1}
                    onClick={() => setSelected((list) => {
                      const next = [...list]
                      ;[next[i + 1], next[i]] = [next[i]!, next[i + 1]!]
                      return next
                    })}
                  >
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`إزالة السؤال ${i + 1}`} onClick={() => setSelected((list) => list.filter((x) => x.id !== q.id))}>
                    <Trash2 />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ol>

        {!locked && (
          <section aria-labelledby="picker-title" className="grid gap-3 border-t pt-4">
            <h3 id="picker-title" className="text-sm font-bold">
              إضافة أسئلة
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <NativeSelect aria-label="البنك" value={bankId} onChange={(ev) => setBankId(ev.target.value)}>
                <option value="">كل البنوك</option>
                {banks.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </NativeSelect>
              <Input type="search" aria-label="بحث في الأسئلة" placeholder="بحث في الأسئلة" value={search} onChange={(ev) => setSearch(ev.target.value)} />
            </div>
            <ul className="grid max-h-80 gap-1.5 overflow-y-auto">
              {(candidates.data?.data ?? []).map((q) => (
                <li key={q.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{preview(q.body)}</span>
                  <Badge variant="secondary">{q.difficulty.label}</Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`إضافة: ${preview(q.body)}`}
                    disabled={chosen.has(q.id)}
                    onClick={() => setSelected((list) => [...list, { id: q.id, body: q.body, points: 1 }])}
                  >
                    <Plus />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  )
}
