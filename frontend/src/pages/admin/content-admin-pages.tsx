import { useQueryClient } from '@tanstack/react-query'
import { Check, FileText, Inbox, MessageSquareQuote, Newspaper, Star, X } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'
import { ResourcePage } from '@/features/admin/resource-page'
import {
  publishStatusOptions,
  type AdminFaq,
  type AdminMessage,
  type AdminPage,
  type AdminPost,
  type AdminReview,
  type AdminTestimonial,
} from '@/types/admin'
import { formatDate, formatDateTime } from '@/utils/format'

function StatusBadge({ status }: { status: { value: string; label: string } }) {
  return <Badge variant={status.value === 'published' ? 'success' : status.value === 'draft' ? 'accent' : 'secondary'}>{status.label}</Badge>
}

export function AdminPostsPage() {
  return (
    <ResourcePage<AdminPost>
      resource="posts"
      title="المدونة"
      description="مقالات ونصائح للطلاب، مع الجدولة والوسوم."
      singular="مقال"
      emptyIcon={Newspaper}
      wide
      filters={[
        { name: 'search', label: 'بحث', type: 'search', placeholder: 'ابحث بعنوان المقال' },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
      ]}
      fields={[
        { name: 'title', label: 'العنوان', type: 'text', required: true, wide: true },
        { name: 'slug', label: 'الرابط المختصر', type: 'text', dir: 'ltr' },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
        { name: 'published_at', label: 'تاريخ النشر', type: 'datetime', hint: 'تاريخ مستقبلي = نشر مجدول.' },
        { name: 'tags', label: 'الوسوم', type: 'tags' },
        { name: 'excerpt', label: 'المقتطف', type: 'textarea', rows: 2 },
        { name: 'cover_media_id', label: 'صورة الغلاف', type: 'image', previewKey: 'cover_url' },
        { name: 'body', label: 'المحتوى', type: 'markdown', rows: 14, required: true },
        { name: 'seo_title', label: 'عنوان SEO', type: 'text' },
        { name: 'seo_description', label: 'وصف SEO', type: 'text' },
      ]}
      toSource={(p) => ({ ...p, status: p.status.value })}
      columns={[
        { header: 'العنوان', cell: (p) => <span className="font-medium">{p.title}</span> },
        { header: 'الكاتب', cell: (p) => p.author?.name ?? '—', className: 'hidden md:table-cell' },
        { header: 'النشر', cell: (p) => (p.published_at ? formatDate(p.published_at) : '—'), className: 'hidden sm:table-cell' },
        { header: 'الحالة', cell: (p) => <StatusBadge status={p.status} /> },
      ]}
    />
  )
}

export function AdminPagesPage() {
  return (
    <ResourcePage<AdminPage>
      resource="pages"
      title="الصفحات"
      description="صفحات ثابتة مثل من نحن والشروط وسياسة الخصوصية."
      singular="صفحة"
      emptyIcon={FileText}
      wide
      fields={[
        { name: 'title', label: 'العنوان', type: 'text', required: true },
        { name: 'slug', label: 'الرابط المختصر', type: 'text', dir: 'ltr', hint: 'مثل about أو terms أو privacy أو refund-policy.' },
        { name: 'status', label: 'الحالة', type: 'select', options: publishStatusOptions },
        { name: 'body', label: 'المحتوى', type: 'markdown', rows: 16, required: true },
        { name: 'seo_title', label: 'عنوان SEO', type: 'text' },
        { name: 'seo_description', label: 'وصف SEO', type: 'text' },
      ]}
      toSource={(p) => ({ ...p, status: p.status.value })}
      columns={[
        { header: 'العنوان', cell: (p) => <span className="font-medium">{p.title}</span> },
        { header: 'الرابط', cell: (p) => <span dir="ltr" className="text-xs text-muted-foreground">/{p.slug}</span> },
        { header: 'الحالة', cell: (p) => <StatusBadge status={p.status} /> },
      ]}
    />
  )
}

export function AdminFaqsPage() {
  return (
    <ResourcePage<AdminFaq>
      resource="faqs"
      title="الأسئلة الشائعة"
      singular="سؤال شائع"
      wide
      fields={[
        { name: 'question', label: 'السؤال', type: 'text', required: true, wide: true },
        { name: 'group', label: 'المجموعة', type: 'text', dir: 'ltr', hint: 'مثل general أو payments أو courses.' },
        { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
        { name: 'answer', label: 'الإجابة', type: 'markdown', rows: 5, required: true },
        { name: 'is_active', label: 'ظاهر', type: 'switch' },
      ]}
      columns={[
        { header: 'السؤال', cell: (f) => <span className="font-medium">{f.question}</span> },
        { header: 'المجموعة', cell: (f) => <span dir="ltr">{f.group}</span>, className: 'hidden md:table-cell' },
        { header: 'الحالة', cell: (f) => <Badge variant={f.is_active ? 'success' : 'secondary'}>{f.is_active ? 'ظاهر' : 'مخفي'}</Badge> },
      ]}
    />
  )
}

export function AdminTestimonialsPage() {
  return (
    <ResourcePage<AdminTestimonial>
      resource="testimonials"
      title="آراء الطلاب"
      description="الشهادات المعروضة في الصفحة الرئيسية."
      singular="رأي"
      emptyIcon={MessageSquareQuote}
      wide
      fields={[
        { name: 'name', label: 'الاسم', type: 'text', required: true },
        { name: 'subtitle', label: 'الوصف', type: 'text', hint: 'مثل: حصلت على 96 في القدرات' },
        { name: 'rating', label: 'التقييم (1–5)', type: 'number', min: 1, max: 5, omitEmpty: true },
        { name: 'sort_order', label: 'الترتيب', type: 'number', min: 0 },
        { name: 'avatar_media_id', label: 'الصورة', type: 'image', previewKey: 'avatar_url' },
        { name: 'body', label: 'النص', type: 'textarea', rows: 4, required: true },
        { name: 'is_active', label: 'ظاهر', type: 'switch' },
      ]}
      columns={[
        { header: 'الاسم', cell: (t) => <span className="font-medium">{t.name}</span> },
        { header: 'النص', cell: (t) => <span className="line-clamp-1 max-w-sm text-muted-foreground">{t.body}</span>, className: 'hidden md:table-cell' },
        { header: 'التقييم', cell: (t) => `${t.rating}/5` },
        { header: 'الحالة', cell: (t) => <Badge variant={t.is_active ? 'success' : 'secondary'}>{t.is_active ? 'ظاهر' : 'مخفي'}</Badge> },
      ]}
    />
  )
}

const reviewStatusOptions = [
  { value: 'pending', label: 'بانتظار المراجعة' },
  { value: 'approved', label: 'منشور' },
  { value: 'rejected', label: 'مرفوض' },
]

function ModerateButtons({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient()
  const moderate = async (status: 'approved' | 'rejected') => {
    try {
      await adminApi.moderateReview(review.id, status)
      toast.success(status === 'approved' ? 'تم نشر المراجعة' : 'تم رفض المراجعة')
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('reviews') })
    } catch (err) {
      toast.error(ApiError.from(err).message)
    }
  }
  return (
    <>
      {review.status.value !== 'approved' && (
        <Button variant="ghost" size="icon-sm" className="text-success" aria-label={`نشر مراجعة ${review.id}`} onClick={() => void moderate('approved')}>
          <Check />
        </Button>
      )}
      {review.status.value !== 'rejected' && (
        <Button variant="ghost" size="icon-sm" aria-label={`رفض مراجعة ${review.id}`} onClick={() => void moderate('rejected')}>
          <X />
        </Button>
      )}
    </>
  )
}

export function AdminReviewsPage() {
  return (
    <ResourcePage<AdminReview>
      resource="reviews"
      title="مراجعات الدورات"
      description="تقييمات الطلاب المشتركين؛ لا تظهر في الموقع إلا بعد نشرها."
      singular="مراجعة"
      emptyIcon={Star}
      canCreate={false}
      filters={[{ name: 'status', label: 'الحالة', type: 'select', options: reviewStatusOptions }]}
      rowActions={(r) => <ModerateButtons review={r} />}
      columns={[
        { header: 'الدورة', cell: (r) => <span className="font-medium">{r.course?.title ?? '—'}</span> },
        { header: 'الطالب', cell: (r) => r.user?.name ?? '—', className: 'hidden md:table-cell' },
        { header: 'التقييم', cell: (r) => <span aria-label={`${r.rating} من 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span> },
        { header: 'التعليق', cell: (r) => <span className="line-clamp-2 max-w-sm text-sm">{r.comment ?? '—'}</span>, className: 'hidden lg:table-cell' },
        {
          header: 'الحالة',
          cell: (r) => <Badge variant={r.status.value === 'approved' ? 'success' : r.status.value === 'pending' ? 'accent' : 'secondary'}>{r.status.label}</Badge>,
        },
      ]}
    />
  )
}

const messageStatusOptions = [
  { value: 'new', label: 'جديدة' },
  { value: 'read', label: 'مقروءة' },
  { value: 'replied', label: 'تم الرد' },
  { value: 'archived', label: 'مؤرشفة' },
]

function MessageStatusSelect({ message }: { message: AdminMessage }) {
  const queryClient = useQueryClient()
  return (
    <NativeSelect
      aria-label={`حالة رسالة ${message.name}`}
      value={message.status}
      className="h-9 w-32"
      onChange={async (e) => {
        await adminApi.updateMessage(message.id, e.target.value)
        void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('messages') })
      }}
    >
      {messageStatusOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  )
}

export function AdminMessagesPage() {
  return (
    <ResourcePage<AdminMessage>
      resource="messages"
      title="رسائل التواصل"
      description="الرسائل الواردة من نموذج تواصل معنا."
      singular="رسالة"
      emptyIcon={Inbox}
      canCreate={false}
      canDelete={() => false}
      filters={[{ name: 'status', label: 'الحالة', type: 'select', options: messageStatusOptions }]}
      rowActions={(m) => <MessageStatusSelect message={m} />}
      columns={[
        {
          header: 'المرسل',
          cell: (m) => (
            <div className="grid">
              <span className="font-medium">{m.name}</span>
              <a href={`mailto:${m.email}`} dir="ltr" className="text-xs text-primary hover:underline">
                {m.email}
              </a>
            </div>
          ),
        },
        {
          header: 'الرسالة',
          cell: (m) => (
            <details className="max-w-md">
              <summary className="cursor-pointer font-medium">{m.subject}</summary>
              <p className="mt-2 text-sm whitespace-pre-line text-muted-foreground">{m.message}</p>
            </details>
          ),
        },
        { header: 'التاريخ', cell: (m) => formatDateTime(m.created_at), className: 'hidden md:table-cell' },
      ]}
    />
  )
}
