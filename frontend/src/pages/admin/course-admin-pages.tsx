import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, BookOpen, ExternalLink, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { adminApi, adminResource } from '@/api/admin'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { ErrorState, PageLoader } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/features/auth/use-auth'
import type { FieldDef } from '@/features/admin/form-values'
import { ResourceForm } from '@/features/admin/resource-form'
import { ResourcePage } from '@/features/admin/resource-page'
import { useCategoryOptions, useInstructorOptions } from '@/features/admin/use-lookups'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { publishStatusOptions, type AdminCourse, type AdminCourseRow, type AdminLesson, type AdminPlan, type AdminSection } from '@/types/admin'
import { formatAccess, formatClock, formatDate, formatPrice } from '@/utils/format'

const levelOptions = [
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدم' },
  { value: 'all_levels', label: 'جميع المستويات' },
]

const lessonTypeOptions = [
  { value: 'video', label: 'فيديو' },
  { value: 'text', label: 'درس مقروء' },
  { value: 'file', label: 'ملف' },
  { value: 'quiz', label: 'اختبار قصير' },
]

function StatusBadge({ status }: { status: { value: string; label: string } }) {
  return <Badge variant={status.value === 'published' ? 'success' : status.value === 'draft' ? 'accent' : 'secondary'}>{status.label}</Badge>
}

export function AdminCoursesPage() {
  const navigate = useNavigate()
  const categories = useCategoryOptions()
  const { hasRole } = useCurrentUser()

  return (
    <ResourcePage<AdminCourseRow>
      resource="courses"
      title="الدورات"
      description={hasRole('admin') ? 'كل دورات المنصة: البيانات والأسعار والمحتوى.' : 'دوراتك: البيانات والأسعار والمحتوى.'}
      singular="دورة"
      emptyIcon={BookOpen}
      filters={[
        { name: 'search', label: 'بحث', type: 'search', placeholder: 'ابحث بعنوان الدورة' },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
      ]}
      fields={[
        { name: 'title', label: 'عنوان الدورة', type: 'text', required: true, wide: true },
        { name: 'category_id', label: 'التصنيف', type: 'select', numeric: true, options: categories, required: true },
        { name: 'level', label: 'المستوى', type: 'select', options: levelOptions },
      ]}
      editHref={(c) => `/admin/courses/${c.id}`}
      canDelete={() => hasRole('admin')}
      onCreated={(c) => navigate(`/admin/courses/${c.id}`)}
      columns={[
        {
          header: 'الدورة',
          cell: (c) => (
            <Link to={`/admin/courses/${c.id}`} className="font-medium hover:text-primary">
              {c.title}
            </Link>
          ),
        },
        { header: 'التصنيف', cell: (c) => c.category?.name ?? '—', className: 'hidden lg:table-cell' },
        { header: 'المدرّب', cell: (c) => c.instructor?.name ?? '—', className: 'hidden md:table-cell' },
        { header: 'الدروس', cell: (c) => c.lessons_count },
        { header: 'الطلاب', cell: (c) => c.students_count, className: 'hidden sm:table-cell' },
        { header: 'الحالة', cell: (c) => <StatusBadge status={c.status} /> },
      ]}
    />
  )
}

// ---- Editor -------------------------------------------------------------------

export function AdminCourseEditorPage() {
  const id = Number(useParams().id)
  const course = useQuery({ queryKey: queryKeys.admin.course(id), queryFn: () => adminApi.course(id) })

  if (course.isPending) return <PageLoader />
  if (course.isError) {
    return (
      <DashboardSection>
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </DashboardSection>
    )
  }

  const c = course.data
  return (
    <DashboardSection>
      <Seo title={`تحرير: ${c.title}`} noIndex />
      <PageHeader
        title={c.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} />
            {c.published_at && <span>نُشرت في {formatDate(c.published_at)}</span>}
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/courses">كل الدورات</Link>
            </Button>
            {c.status.value === 'published' && (
              <Button asChild variant="ghost">
                <a href={`/courses/${encodeURIComponent(c.slug)}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  عرض في الموقع
                </a>
              </Button>
            )}
          </>
        }
      />
      <Tabs defaultValue="details" dir="rtl">
        <TabsList>
          <TabsTrigger value="details">البيانات</TabsTrigger>
          <TabsTrigger value="plans">الأسعار ({c.plans.length})</TabsTrigger>
          <TabsTrigger value="curriculum">المحتوى ({c.lessons_count})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-5">
          <CourseDetailsForm course={c} />
        </TabsContent>
        <TabsContent value="plans" className="mt-5">
          <PlansEditor course={c} />
        </TabsContent>
        <TabsContent value="curriculum" className="mt-5">
          <CurriculumEditor course={c} />
        </TabsContent>
      </Tabs>
    </DashboardSection>
  )
}

function useRefreshCourse(id: number) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.course(id) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('courses', 'list') })
  }
}

function CourseDetailsForm({ course }: { course: AdminCourse }) {
  const categories = useCategoryOptions()
  const { hasRole } = useCurrentUser()
  const isAdmin = hasRole('admin')
  const instructors = useInstructorOptions(isAdmin)
  const refresh = useRefreshCourse(course.id)

  const fields: FieldDef[] = [
    { name: 'title', label: 'العنوان', type: 'text', required: true },
    { name: 'slug', label: 'الرابط المختصر', type: 'text', dir: 'ltr' },
    { name: 'subtitle', label: 'العنوان الفرعي', type: 'text', wide: true },
    { name: 'category_id', label: 'التصنيف', type: 'select', numeric: true, options: categories, required: true },
    ...(isAdmin ? [{ name: 'instructor_id', label: 'المدرّب', type: 'select' as const, numeric: true, options: instructors }] : []),
    { name: 'level', label: 'المستوى', type: 'select', options: levelOptions },
    { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
    { name: 'published_at', label: 'تاريخ النشر', type: 'datetime', hint: 'اتركه فارغاً للنشر فوراً، أو حدّد موعداً مستقبلياً للجدولة.' },
    { name: 'is_featured', label: 'مميّزة في الصفحة الرئيسية', type: 'switch' },
    { name: 'cover_media_id', label: 'صورة الغلاف', type: 'image', previewKey: 'cover_url' },
    { name: 'description', label: 'الوصف', type: 'markdown', rows: 12 },
    { name: 'outcomes', label: 'ماذا سيتعلم الطالب؟', type: 'lines' },
    { name: 'requirements', label: 'المتطلبات', type: 'lines', rows: 3 },
    { name: 'tags', label: 'الوسوم', type: 'tags', wide: true },
    { name: 'seo_title', label: 'عنوان SEO', type: 'text' },
    { name: 'seo_description', label: 'وصف SEO', type: 'text' },
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <ResourceForm
          key={course.updated_at}
          fields={fields}
          source={{ ...course, status: course.status.value } as unknown as Record<string, unknown>}
          submitLabel="حفظ البيانات"
          onSubmit={async (body) => {
            const res = await adminResource<AdminCourse>('courses').update(course.id, body)
            toast.success(res.message ?? 'تم الحفظ')
            refresh()
          }}
        />
      </CardContent>
    </Card>
  )
}

function FormDialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

const planFields: FieldDef[] = [
  { name: 'name', label: 'اسم الخطة', type: 'text', required: true },
  { name: 'duration_days', label: 'مدة الوصول (أيام)', type: 'number', min: 1, hint: 'اتركها فارغة لوصول دائم.' },
  { name: 'price', label: 'السعر', type: 'money', min: 0, required: true },
  { name: 'compare_at_price', label: 'السعر قبل الخصم', type: 'money', min: 0 },
  { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
  { name: 'is_default', label: 'الخطة الافتراضية', type: 'switch' },
  { name: 'is_active', label: 'متاحة للشراء', type: 'switch' },
]

function PlansEditor({ course }: { course: AdminCourse }) {
  const [editing, setEditing] = useState<AdminPlan | 'new' | null>(null)
  const refresh = useRefreshCourse(course.id)
  const remove = useMutation({
    mutationFn: (planId: number) => adminApi.deletePlan(planId),
    onSuccess: (res) => {
      toast.success(res.message ?? 'تم الحذف')
      refresh()
    },
  })
  const plan = editing !== 'new' ? editing : null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>خطط الاشتراك</CardTitle>
        <Button size="sm" onClick={() => setEditing('new')}>
          <Plus />
          إضافة خطة
        </Button>
      </CardHeader>
      <CardContent>
        {course.plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد خطط بعد. أضف خطة ليتمكن الطلاب من الاشتراك.</p>
        ) : (
          <ul className="divide-y">
            {course.plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="grid gap-0.5">
                  <span className="flex items-center gap-2 font-semibold">
                    {p.name}
                    {p.is_default && <Badge>افتراضية</Badge>}
                    {!p.is_active && <Badge variant="secondary">غير متاحة</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">وصول {formatAccess(p.duration_days)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatPrice({ amount: p.price, currency: p.currency })}</span>
                  <Button variant="ghost" size="icon-sm" aria-label={`تعديل ${p.name}`} onClick={() => setEditing(p)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`حذف ${p.name}`} onClick={() => remove.mutate(p.id)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <FormDialog open={editing !== null} onClose={() => setEditing(null)} title={plan ? 'تعديل الخطة' : 'إضافة خطة'}>
        <ResourceForm
          fields={planFields}
          source={plan ? (plan as unknown as Record<string, unknown>) : { is_active: true }}
          onCancel={() => setEditing(null)}
          onSubmit={async (body) => {
            await (plan ? adminApi.updatePlan(plan.id, body) : adminApi.createPlan(course.id, body))
            toast.success('تم الحفظ')
            setEditing(null)
            refresh()
          }}
        />
      </FormDialog>
    </Card>
  )
}

const lessonFields: FieldDef[] = [
  { name: 'title', label: 'عنوان الدرس', type: 'text', required: true, wide: true },
  { name: 'type', label: 'النوع', type: 'select', options: lessonTypeOptions, required: true },
  { name: 'duration_seconds', label: 'المدة (ثوانٍ)', type: 'number', min: 0, omitEmpty: true },
  {
    name: 'video_provider',
    label: 'مزوّد الفيديو',
    type: 'select',
    options: [
      { value: 'youtube', label: 'YouTube' },
      { value: 'vimeo', label: 'Vimeo' },
      { value: 'bunny', label: 'Bunny Stream' },
    ],
  },
  { name: 'video_ref', label: 'معرّف الفيديو', type: 'text', dir: 'ltr', hint: 'المعرّف فقط، مثل dQw4w9WgXcQ.' },
  { name: 'content', label: 'محتوى الدرس', type: 'markdown' },
  { name: 'is_preview', label: 'معاينة مجانية', type: 'switch' },
  { name: 'is_published', label: 'منشور', type: 'switch' },
]

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= next.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

function CurriculumEditor({ course }: { course: AdminCourse }) {
  const refresh = useRefreshCourse(course.id)
  const [newSection, setNewSection] = useState('')
  const [lessonDialog, setLessonDialog] = useState<{ section: AdminSection; lesson: AdminLesson | null } | null>(null)
  const [sectionDialog, setSectionDialog] = useState<AdminSection | null>(null)

  const run = async (action: () => Promise<unknown>, success = 'تم الحفظ') => {
    try {
      await action()
      toast.success(success)
      refresh()
    } catch (err) {
      toast.error(ApiError.from(err).message)
    }
  }

  return (
    <div className="grid gap-4">
      {course.sections.map((section, s) => (
        <Card key={section.id}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              <span className="text-muted-foreground ltr-nums">{s + 1}. </span>
              {section.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`نقل ${section.title} للأعلى`}
                disabled={s === 0}
                onClick={() => void run(() => adminApi.reorderSections(course.id, move(course.sections, s, -1).map((x) => x.id)), 'تم تحديث الترتيب')}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`نقل ${section.title} للأسفل`}
                disabled={s === course.sections.length - 1}
                onClick={() => void run(() => adminApi.reorderSections(course.id, move(course.sections, s, 1).map((x) => x.id)), 'تم تحديث الترتيب')}
              >
                <ArrowDown />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`تعديل ${section.title}`} onClick={() => setSectionDialog(section)}>
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`حذف ${section.title}`}
                onClick={() => window.confirm('حذف القسم وجميع دروسه؟') && void run(() => adminApi.deleteSection(section.id), 'تم الحذف')}
              >
                <Trash2 />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-2">
            {section.lessons.length === 0 && <p className="text-sm text-muted-foreground">لا توجد دروس في هذا القسم.</p>}
            <ul className="grid gap-1.5">
              {section.lessons.map((lesson, l) => (
                <li key={lesson.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-medium">{lesson.title}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {lessonTypeOptions.find((o) => o.value === lesson.type)?.label}
                    <span className="ltr-nums">{formatClock(lesson.duration_seconds)}</span>
                    {lesson.is_preview && <Badge variant="accent">معاينة</Badge>}
                    {!lesson.is_published && <Badge variant="secondary">مخفي</Badge>}
                    {lesson.attachments.length > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Paperclip className="size-3" aria-hidden="true" />
                        {lesson.attachments.length}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`نقل ${lesson.title} للأعلى`}
                      disabled={l === 0}
                      onClick={() => void run(() => adminApi.reorderLessons(section.id, move(section.lessons, l, -1).map((x) => x.id)), 'تم تحديث الترتيب')}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`نقل ${lesson.title} للأسفل`}
                      disabled={l === section.lessons.length - 1}
                      onClick={() => void run(() => adminApi.reorderLessons(section.id, move(section.lessons, l, 1).map((x) => x.id)), 'تم تحديث الترتيب')}
                    >
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`تعديل ${lesson.title}`} onClick={() => setLessonDialog({ section, lesson })}>
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`حذف ${lesson.title}`}
                      onClick={() => window.confirm('حذف الدرس؟') && void run(() => adminApi.deleteLesson(lesson.id), 'تم الحذف')}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" className="justify-self-start" onClick={() => setLessonDialog({ section, lesson: null })}>
              <Plus />
              إضافة درس
            </Button>
          </CardContent>
        </Card>
      ))}

      <form
        className="flex flex-wrap gap-2 rounded-xl border border-dashed p-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!newSection.trim()) return
          void run(() => adminApi.createSection(course.id, newSection.trim()), 'تمت إضافة القسم').then(() => setNewSection(''))
        }}
      >
        <Input value={newSection} onChange={(e) => setNewSection(e.target.value)} placeholder="عنوان القسم الجديد" aria-label="عنوان القسم الجديد" className="max-w-md" />
        <Button type="submit" variant="secondary">
          <Plus />
          إضافة قسم
        </Button>
      </form>

      <FormDialog open={sectionDialog !== null} onClose={() => setSectionDialog(null)} title="تعديل القسم">
        {sectionDialog && (
          <ResourceForm
            fields={[{ name: 'title', label: 'عنوان القسم', type: 'text', required: true, wide: true }]}
            source={{ title: sectionDialog.title }}
            onCancel={() => setSectionDialog(null)}
            onSubmit={async (body) => {
              await adminApi.updateSection(sectionDialog.id, String(body.title))
              setSectionDialog(null)
              refresh()
            }}
          />
        )}
      </FormDialog>

      <FormDialog open={lessonDialog !== null} onClose={() => setLessonDialog(null)} title={lessonDialog?.lesson ? 'تعديل الدرس' : 'إضافة درس'}>
        {lessonDialog && (
          <div className="grid gap-6">
            <ResourceForm
              fields={lessonFields}
              source={lessonDialog.lesson ? (lessonDialog.lesson as unknown as Record<string, unknown>) : { type: 'video', is_published: true }}
              onCancel={() => setLessonDialog(null)}
              onSubmit={async (body) => {
                await (lessonDialog.lesson ? adminApi.updateLesson(lessonDialog.lesson.id, body) : adminApi.createLesson(lessonDialog.section.id, body))
                toast.success('تم حفظ الدرس')
                setLessonDialog(null)
                refresh()
              }}
            />
            {lessonDialog.lesson && <AttachmentsEditor lesson={lessonDialog.lesson} onChange={refresh} />}
          </div>
        )}
      </FormDialog>
    </div>
  )
}

function AttachmentsEditor({ lesson, onChange }: { lesson: AdminLesson; onChange: () => void }) {
  const [items, setItems] = useState(lesson.attachments)
  const [uploading, setUploading] = useState(false)

  return (
    <section aria-labelledby="attachments-title" className="grid gap-3 border-t pt-5">
      <h3 id="attachments-title" className="font-bold">
        مرفقات الدرس
      </h3>
      <ul className="grid gap-1.5">
        {items.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
              {a.title}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`حذف ${a.title}`}
              onClick={async () => {
                await adminApi.deleteAttachment(a.id)
                setItems((list) => list.filter((x) => x.id !== a.id))
                onChange()
              }}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Input
        type="file"
        aria-label="رفع مرفق"
        disabled={uploading}
        accept=".pdf,.zip,.docx,.pptx,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          setUploading(true)
          try {
            const res = (await adminApi.uploadAttachment(lesson.id, file)) as { data: AdminLesson['attachments'][number] }
            setItems((list) => [...list, res.data])
            toast.success('تم رفع المرفق')
            onChange()
          } catch (err) {
            toast.error(ApiError.from(err).message)
          } finally {
            setUploading(false)
            e.target.value = ''
          }
        }}
      />
      <p className="text-xs text-muted-foreground">PDF أو ملفات Office أو صور حتى 50 ميجابايت. تُحفظ المرفقات بشكل خاص ولا يصل إليها إلا المشتركون.</p>
    </section>
  )
}
