import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, makeUser } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, emptyPage, http, HttpResponse, server, signInAs } from '@/test/server'
import type { AdminCategory, AdminCourse } from '@/types/admin'

const category = (overrides: Partial<AdminCategory> = {}): AdminCategory => ({
  id: 1,
  parent_id: null,
  name: 'القدرات',
  slug: 'qudurat',
  description: null,
  icon: null,
  sort_order: 0,
  is_active: true,
  seo_title: null,
  seo_description: null,
  courses_count: 2,
  products_count: 0,
  children_count: 0,
  ...overrides,
})

const course: AdminCourse = {
  id: 5,
  title: 'تأسيس الكمي',
  slug: 'تأسيس-الكمي',
  status: { value: 'draft', label: 'مسودة' },
  is_featured: false,
  cover_url: null,
  category: { id: 1, name: 'القدرات' },
  instructor: null,
  lessons_count: 1,
  students_count: 0,
  published_at: null,
  updated_at: '2026-09-29T10:00:00+00:00',
  category_id: 1,
  instructor_id: null,
  subtitle: null,
  description: null,
  level: 'beginner',
  language: 'ar',
  outcomes: [],
  requirements: [],
  seo_title: null,
  seo_description: null,
  tags: [],
  plans: [],
  sections: [
    {
      id: 20,
      title: 'البداية',
      sort_order: 0,
      lessons: [
        {
          id: 30,
          section_id: 20,
          title: 'مقدمة',
          type: 'video',
          content: null,
          video_provider: null,
          video_ref: null,
          duration_seconds: 300,
          is_preview: true,
          is_published: true,
          sort_order: 0,
          attachments: [],
        },
      ],
    },
  ],
}

describe('admin CRUD screens', () => {
  it('creates a category and maps server validation errors onto fields', async () => {
    signInAs(admin)
    const posted: Record<string, unknown>[] = []
    server.use(
      http.get(`${API}/admin/categories`, () => HttpResponse.json({ data: [category()] })),
      http.post(`${API}/admin/categories`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        posted.push(body)
        if (body.icon === '<svg>') {
          return HttpResponse.json(
            { message: 'البيانات المدخلة غير صحيحة.', code: 'validation_failed', errors: { icon: ['صيغة الأيقونة غير صحيحة.'] } },
            { status: 422 },
          )
        }
        return HttpResponse.json({ data: category({ id: 2, name: String(body.name) }) }, { status: 201 })
      }),
    )
    const { user } = renderApp('/admin/categories')

    expect(await screen.findByText('القدرات')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /إضافة تصنيف/ }))
    const dialog = await screen.findByRole('dialog', { name: 'إضافة تصنيف' })

    await user.click(within(dialog).getByRole('button', { name: 'إضافة' }))
    expect(await within(dialog).findByText('هذا الحقل مطلوب')).toBeInTheDocument()
    expect(posted).toHaveLength(0)

    await user.type(within(dialog).getByLabelText('الاسم *'), 'التحصيلي')
    await user.type(within(dialog).getByLabelText('الأيقونة'), '<svg>')
    await user.click(within(dialog).getByRole('button', { name: 'إضافة' }))
    expect(await within(dialog).findByText('صيغة الأيقونة غير صحيحة.')).toBeInTheDocument()

    await user.clear(within(dialog).getByLabelText('الأيقونة'))
    await user.click(within(dialog).getByRole('button', { name: 'إضافة' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(posted.at(-1)).toMatchObject({ name: 'التحصيلي', icon: null, is_active: false, parent_id: null })
  })

  it('edits course pricing in SAR and adds sections', async () => {
    signInAs(admin)
    const calls: [string, unknown][] = []
    server.use(
      http.get(`${API}/admin/courses/5`, () => HttpResponse.json({ data: course })),
      http.get(`${API}/admin/instructors`, () => HttpResponse.json({ data: [] })),
      http.post(`${API}/admin/courses/5/plans`, async ({ request }) => {
        calls.push(['plan', await request.json()])
        return HttpResponse.json({ data: {} }, { status: 201 })
      }),
      http.post(`${API}/admin/courses/5/sections`, async ({ request }) => {
        calls.push(['section', await request.json()])
        return HttpResponse.json({ data: {} }, { status: 201 })
      }),
    )
    const { user } = renderApp('/admin/courses/5')

    expect(await screen.findByRole('heading', { level: 1, name: 'تأسيس الكمي' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /الأسعار/ }))
    await user.click(screen.getByRole('button', { name: /إضافة خطة/ }))
    const dialog = await screen.findByRole('dialog', { name: 'إضافة خطة' })
    await user.type(within(dialog).getByLabelText('اسم الخطة *'), '3 أشهر')
    await user.type(within(dialog).getByLabelText('مدة الوصول (أيام)'), '90')
    await user.type(within(dialog).getByLabelText('السعر * (ر.س)'), '199.5')
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(calls[0]).toEqual(['plan', expect.objectContaining({ name: '3 أشهر', duration_days: 90, price: 199.5, is_active: true })]))

    await user.click(screen.getByRole('tab', { name: /المحتوى/ }))
    expect(screen.getByText('مقدمة')).toBeInTheDocument()
    await user.type(screen.getByLabelText('عنوان القسم الجديد'), 'الجبر')
    await user.click(screen.getByRole('button', { name: /إضافة قسم/ }))
    await waitFor(() => expect(calls).toContainEqual(['section', { title: 'الجبر' }]))
  })

  it('sends question options with exactly the chosen correct answer', async () => {
    signInAs(admin)
    let posted: Record<string, unknown> | null = null
    server.use(
      http.get(`${API}/admin/questions`, () => HttpResponse.json(emptyPage)),
      http.get(`${API}/admin/question-banks`, () => HttpResponse.json({ data: [{ id: 3, title: 'بنك الكمي' }] })),
      http.post(`${API}/admin/questions`, async ({ request }) => {
        posted = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ data: { id: 1 } }, { status: 201 })
      }),
    )
    const { user } = renderApp('/admin/questions')

    await user.click(await screen.findByRole('button', { name: /إضافة سؤال/ }))
    const dialog = await screen.findByRole('dialog', { name: 'إضافة سؤال' })
    await user.selectOptions(within(dialog).getByLabelText('البنك *'), '3')
    await user.type(within(dialog).getByLabelText('نص السؤال *'), 'كم 2+2؟')
    await user.type(within(dialog).getByLabelText('نص الخيار 1'), '3')
    await user.type(within(dialog).getByLabelText('نص الخيار 2'), '4')
    await user.click(within(dialog).getByLabelText('الخيار 2 هو الإجابة الصحيحة'))
    await user.click(within(dialog).getByRole('button', { name: 'حذف الخيار 4' }))
    await user.click(within(dialog).getByRole('button', { name: 'إضافة' }))

    await waitFor(() => expect(posted).not.toBeNull())
    expect(posted!.question_bank_id).toBe(3)
    // Empty options are dropped; only option 2 is correct.
    expect(posted!.options).toEqual([
      { body: '3', is_correct: false },
      { body: '4', is_correct: true },
    ])
  })

  it('moderates reviews', async () => {
    signInAs(admin)
    let patched: unknown = null
    server.use(
      http.get(`${API}/admin/reviews`, () =>
        HttpResponse.json({
          ...emptyPage,
          data: [
            {
              id: 7,
              rating: 4,
              comment: 'مفيدة',
              status: { value: 'pending', label: 'بانتظار المراجعة' },
              user: { id: 2, name: 'ريم', email: 'r@example.com' },
              course: { id: 5, title: 'تأسيس الكمي', slug: 'x' },
              created_at: null,
              moderated_at: null,
            },
          ],
          meta: { ...emptyPage.meta, total: 1 },
        }),
      ),
      http.patch(`${API}/admin/reviews/7`, async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ data: {} })
      }),
    )
    const { user } = renderApp('/admin/reviews')

    await user.click(await screen.findByRole('button', { name: 'نشر مراجعة 7' }))
    await waitFor(() => expect(patched).toEqual({ status: 'approved' }))
  })

  it('saves settings with social links nested', async () => {
    signInAs(admin)
    let saved: Record<string, unknown> | null = null
    const settings = {
      site_name: 'ذروة', tagline: null, announcement: null, contact_email: null, contact_phone: null, whatsapp: null,
      working_hours: null, social: { x: null }, legal_name: null, vat_number: null, address: null,
    }
    server.use(
      http.get(`${API}/admin/settings`, () => HttpResponse.json({ data: settings })),
      http.put(`${API}/admin/settings`, async ({ request }) => {
        saved = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ data: settings, message: 'تم حفظ الإعدادات.' })
      }),
    )
    const { user } = renderApp('/admin/settings')

    await user.type(await screen.findByLabelText('رابط x'), 'https://x.com/example')
    await user.click(screen.getByRole('button', { name: 'حفظ البيانات العامة' }))
    await waitFor(() => expect(saved).not.toBeNull())
    expect(saved!.site_name).toBe('ذروة')
    expect(saved!.social).toMatchObject({ x: 'https://x.com/example', instagram: null })
    expect(saved).not.toHaveProperty('social_x')
  })

  it('suspends another user from the users list', async () => {
    signInAs(admin)
    let patched: unknown = null
    const target = makeUser({ id: 50, name: 'طالب مشاغب', email: 'bad@example.com' })
    server.use(
      http.get(`${API}/admin/users`, () => HttpResponse.json({ ...emptyPage, data: [target, admin], meta: { ...emptyPage.meta, total: 2 } })),
      http.patch(`${API}/admin/users/50`, async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ data: { ...target, status: 'suspended' }, message: 'تم تحديث المستخدم.' })
      }),
    )
    const { user } = renderApp('/admin/users')

    await user.click(await screen.findByRole('button', { name: 'إدارة طالب مشاغب' }))
    // No self-management button for the signed-in admin.
    expect(screen.queryByRole('button', { name: `إدارة ${admin.name}` })).not.toBeInTheDocument()
    const dialog = await screen.findByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText('حالة الحساب'), 'suspended')
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }))
    await waitFor(() => expect(patched).toEqual({ status: 'suspended', roles: ['student'] }))
  })
})
