import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Send, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminResource } from '@/api/admin'
import { api } from '@/api/client'
import { ApiError } from '@/api/errors'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { FormField } from '@/components/forms/form-field'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { useCourseOptions } from '@/features/admin/use-lookups'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DashboardSection } from '@/layouts/dashboard-shell'
import type { Broadcast } from '@/types/notifications'
import { formatDateTime } from '@/utils/format'

type Audience = Broadcast['audience']['value']

const STATUS: Record<Broadcast['status'], { label: string; variant: 'success' | 'accent' | 'destructive' | 'secondary' }> = {
  queued: { label: 'في الانتظار', variant: 'secondary' },
  sending: { label: 'جارٍ الإرسال', variant: 'accent' },
  sent: { label: 'أُرسل', variant: 'success' },
  failed: { label: 'فشل', variant: 'destructive' },
}

export function AdminBroadcastsPage() {
  const queryClient = useQueryClient()
  const courses = useCourseOptions()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [audience, setAudience] = useState<Audience>('students')
  const [courseId, setCourseId] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const audienceKey = useDebouncedValue(`${audience}:${courseId}`, 300)
  const preview = useQuery({
    queryKey: queryKeys.admin.resource('broadcasts', 'preview', audienceKey),
    queryFn: () =>
      api
        .post<{ data: { recipients: number; email_recipients: number } }>('/admin/broadcasts/preview', {
          audience,
          course_id: audience === 'course' ? Number(courseId) || null : null,
        })
        .then((r) => r.data),
    enabled: audience !== 'course' || courseId !== '',
  })

  const history = useQuery({
    queryKey: queryKeys.admin.resource('broadcasts', 'list'),
    queryFn: () => adminResource<Broadcast>('broadcasts').list(),
    // Keep polling while something is still being delivered.
    refetchInterval: (q) => (q.state.data?.data.some((b) => b.status === 'queued' || b.status === 'sending') ? 3000 : false),
  })

  const send = useMutation({
    mutationFn: () =>
      api.post<{ message?: string }>('/admin/broadcasts', {
        title,
        body,
        url: url.trim() || null,
        audience,
        course_id: audience === 'course' ? Number(courseId) || null : null,
        send_email: sendEmail,
      }),
    onSuccess: (res) => {
      toast.success(res.message ?? 'تم الإرسال')
      setTitle('')
      setBody('')
      setUrl('')
      setErrors({})
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource('broadcasts') })
    },
    onError: (err) => {
      const error = ApiError.from(err)
      setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0] ?? ''])))
      if (!error.isValidation) toast.error(error.message)
    },
    meta: { silentError: true },
  })

  return (
    <DashboardSection>
      <Seo title="الإشعارات العامة" noIndex />
      <PageHeader title="الإشعارات العامة" description="أرسل إعلاناً داخل المنصة (واختيارياً على البريد) إلى فئة من المستخدمين." />
      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>إشعار جديد</CardTitle>
            <CardDescription>يظهر في جرس الإشعارات فوراً، ويُرسل البريد لمن لم يوقف رسائل الإعلانات.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              noValidate
              className="grid gap-5"
              onSubmit={(e) => {
                e.preventDefault()
                if (!title.trim() || !body.trim()) {
                  setErrors({ ...(title.trim() ? {} : { title: 'العنوان مطلوب' }), ...(body.trim() ? {} : { body: 'النص مطلوب' }) })
                  return
                }
                send.mutate()
              }}
            >
              <FormField label="العنوان *" error={errors.title}>
                <Input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="النص *" error={errors.body}>
                <Textarea rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
              </FormField>
              <FormField label="رابط داخلي (اختياري)" error={errors.url} hint="مسار داخل المنصة يبدأ بـ / مثل ‎/courses">
                <Input dir="ltr" value={url} placeholder="/courses" onChange={(e) => setUrl(e.target.value)} />
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="الفئة المستهدفة" error={errors.audience}>
                  <NativeSelect value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                    <option value="students">كل الطلاب</option>
                    <option value="instructors">كل المدرّبين</option>
                    <option value="all">كل المستخدمين</option>
                    <option value="course">المشتركون في دورة</option>
                  </NativeSelect>
                </FormField>
                {audience === 'course' && (
                  <FormField label="الدورة" error={errors.course_id}>
                    <NativeSelect value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                      <option value="">اختر الدورة</option>
                      {courses.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </FormField>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox id="send-email" checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
                <Label htmlFor="send-email" className="font-normal">
                  إرسال نسخة على البريد الإلكتروني أيضاً
                </Label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">
                <span className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                  {preview.data
                    ? `سيصل إلى ${preview.data.recipients} مستخدم${sendEmail ? ` (${preview.data.email_recipients} عبر البريد)` : ''}`
                    : audience === 'course' && !courseId
                      ? 'اختر الدورة لمعرفة عدد المستلمين'
                      : 'جارٍ حساب المستلمين…'}
                </span>
                <Button type="submit" loading={send.isPending} disabled={preview.data?.recipients === 0}>
                  <Send />
                  إرسال
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="content-start">
          <CardHeader>
            <CardTitle>السجل</CardTitle>
          </CardHeader>
          <CardContent>
            {(history.data?.data ?? []).length === 0 ? (
              <EmptyState icon={Megaphone} title="لم تُرسل إشعارات بعد" />
            ) : (
              <ul className="grid gap-3">
                {history.data!.data.map((b) => (
                  <li key={b.id} className="grid gap-1 rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{b.title}</span>
                      <Badge variant={STATUS[b.status].variant}>{STATUS[b.status].label}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {b.audience.label}
                      {b.course ? `: ${b.course.title}` : ''} · {b.recipients_count} مستلم{b.send_email ? ' · بريد' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(b.sent_at ?? b.created_at)}</span>
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
