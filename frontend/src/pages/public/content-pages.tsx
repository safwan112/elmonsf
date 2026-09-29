import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Clock, Mail, MessageCircleQuestion, Phone, Send } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { z } from 'zod'
import { contentApi } from '@/api/catalog'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { PageHero } from '@/components/common/page-hero'
import { RichText } from '@/components/common/rich-text'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { FormField } from '@/components/forms/form-field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { phone } from '@/features/auth/schemas'
import { useCurrentUser } from '@/features/auth/use-auth'
import { useCmsPage, useFaqs, useSiteSettings } from '@/features/catalog/use-catalog'
import { FaqList } from '@/features/content/faq-list'
import { faqJsonLd } from '@/lib/json-ld'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { formatDate } from '@/utils/format'

/** CMS page by slug (from the route param, or fixed for /about, /terms…). */
export function CmsPage({ slug: fixedSlug }: { slug?: string }) {
  const params = useParams()
  const slug = fixedSlug ?? params.slug ?? ''
  const page = useCmsPage(slug)

  if (page.isPending) return <PageLoader />
  if (page.isError) {
    if (page.error.isNotFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState error={page.error} onRetry={() => void page.refetch()} />
      </div>
    )
  }

  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: page.data.title }]

  return (
    <>
      <Seo title={page.data.seo.title} description={page.data.seo.description ?? undefined} jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title={page.data.title} description={page.data.updated_at ? `آخر تحديث: ${formatDate(page.data.updated_at)}` : undefined} />
      <div className="container-page max-w-3xl py-10">
        <RichText html={page.data.body_html} />
      </div>
    </>
  )
}

const GROUPS: Record<string, string> = { general: 'أسئلة عامة', payments: 'الدفع والاشتراك', learning: 'التعلّم والاختبارات' }

export function FaqPage() {
  const faqs = useFaqs()
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'الأسئلة الشائعة' }]
  const groups = Object.entries(
    (faqs.data ?? []).reduce<Record<string, NonNullable<typeof faqs.data>>>((acc, f) => {
      ;(acc[f.group] ??= []).push(f)
      return acc
    }, {}),
  )

  return (
    <>
      <Seo
        title="الأسئلة الشائعة"
        description="إجابات عن أكثر الأسئلة تكراراً حول الاشتراك والدفع والدورات والاختبارات."
        jsonLd={faqs.data ? [faqJsonLd(faqs.data), breadcrumbJsonLd(crumbs)] : breadcrumbJsonLd(crumbs)}
      />
      <PageHero crumbs={crumbs} title="الأسئلة الشائعة" description="لم تجد إجابتك؟ راسلنا وسنرد عليك قريباً." />
      <div className="container-page grid max-w-3xl gap-10 py-10">
        {faqs.isError ? (
          <ErrorState error={faqs.error} onRetry={() => void faqs.refetch()} />
        ) : faqs.isPending ? (
          <Skeleton className="h-80 rounded-2xl" />
        ) : groups.length === 0 ? (
          <EmptyState icon={MessageCircleQuestion} title="لا توجد أسئلة منشورة بعد" />
        ) : (
          groups.map(([group, items]) => (
            <section key={group} aria-labelledby={`faq-${group}`}>
              <h2 id={`faq-${group}`} className="mb-4 text-xl font-bold">
                {GROUPS[group] ?? group}
              </h2>
              <FaqList faqs={items} />
            </section>
          ))
        )}
        <div className="rounded-2xl border bg-card p-6 text-center">
          <p className="mb-3 font-semibold">ما زال لديك سؤال؟</p>
          <Button asChild>
            <Link to="/contact">تواصل معنا</Link>
          </Button>
        </div>
      </div>
    </>
  )
}

const contactSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جداً').max(100),
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('أدخل بريداً إلكترونياً صحيحاً'),
  phone,
  subject: z.string().trim().min(3, 'اكتب موضوعاً أوضح').max(150),
  message: z.string().trim().min(10, 'اكتب رسالتك (10 أحرف على الأقل)').max(5000),
  website: z.string().optional(),
})
type ContactValues = z.infer<typeof contactSchema>

export function ContactPage() {
  const { user } = useCurrentUser()
  const settings = useSiteSettings()
  const [sent, setSent] = useState<string | null>(null)
  const send = useMutation({ mutationFn: contentApi.contact, meta: { silentError: true } })
  const form = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    values: { name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', subject: '', message: '', website: '' },
    resetOptions: { keepDirtyValues: true },
  })
  const { errors } = form.formState
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'تواصل معنا' }]
  const s = settings.data

  const onSubmit = form.handleSubmit((values) => {
    send.mutate(
      { ...values, phone: values.phone || undefined },
      {
        onSuccess: (res) => {
          setSent(res.message)
          form.reset({ ...values, subject: '', message: '' })
        },
        onError: (error) => {
          const message = applyServerErrors(error, form.setError, ['name', 'email', 'phone', 'subject', 'message'])
          if (message) form.setError('root', { message })
        },
      },
    )
  })

  return (
    <>
      <Seo title="تواصل معنا" description="راسل فريق الدعم لأي استفسار عن الدورات أو الاشتراك أو الدفع." jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title="تواصل معنا" description="يسعدنا الرد على استفساراتك. نرد عادةً خلال يوم عمل." />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={onSubmit} noValidate className="grid gap-5 rounded-2xl border bg-card p-6">
          {sent && (
            <Alert variant="success">
              <Send />
              <AlertTitle>تم الإرسال</AlertTitle>
              <AlertDescription>{sent}</AlertDescription>
            </Alert>
          )}
          {errors.root?.message && (
            <Alert variant="destructive">
              <AlertDescription>{errors.root.message}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="الاسم" error={errors.name?.message}>
              <Input autoComplete="name" {...form.register('name')} />
            </FormField>
            <FormField label="البريد الإلكتروني" error={errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </FormField>
            <FormField label="رقم الجوال (اختياري)" error={errors.phone?.message}>
              <Input type="tel" autoComplete="tel" {...form.register('phone')} />
            </FormField>
            <FormField label="الموضوع" error={errors.subject?.message}>
              <Input {...form.register('subject')} />
            </FormField>
          </div>
          <FormField label="الرسالة" error={errors.message?.message}>
            <textarea
              rows={6}
              className="w-full rounded-lg border border-input bg-card px-3.5 py-2.5 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 aria-invalid:border-destructive md:text-sm"
              {...form.register('message')}
            />
          </FormField>
          {/* Honeypot: hidden from people and assistive tech. */}
          <div aria-hidden="true" className="absolute -start-[9999px] h-0 overflow-hidden">
            <label>
              لا تملأ هذا الحقل
              <input tabIndex={-1} autoComplete="off" {...form.register('website')} />
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={send.isPending}>
              <Send />
              إرسال الرسالة
            </Button>
          </div>
        </form>

        <aside className="grid content-start gap-4">
          {settings.isPending ? (
            <Skeleton className="h-40 rounded-2xl" />
          ) : (
            <div className="grid gap-4 rounded-2xl border bg-card p-6 text-sm">
              {s?.contact_email && (
                <a href={`mailto:${s.contact_email}`} className="flex items-center gap-3 hover:text-primary">
                  <Mail className="size-5 text-primary" aria-hidden="true" />
                  <span className="ltr-nums">{s.contact_email}</span>
                </a>
              )}
              {s?.contact_phone && (
                <a href={`tel:${s.contact_phone}`} className="flex items-center gap-3 hover:text-primary">
                  <Phone className="size-5 text-primary" aria-hidden="true" />
                  <span className="ltr-nums">{s.contact_phone}</span>
                </a>
              )}
              {s?.working_hours && (
                <p className="flex items-center gap-3">
                  <Clock className="size-5 text-primary" aria-hidden="true" />
                  {s.working_hours}
                </p>
              )}
            </div>
          )}
          <Link to="/faq" className="rounded-2xl border bg-card p-6 text-sm hover:border-primary">
            <span className="mb-1 block font-bold">الأسئلة الشائعة</span>
            <span className="text-muted-foreground">قد تجد إجابتك فوراً.</span>
          </Link>
        </aside>
      </div>
    </>
  )
}
