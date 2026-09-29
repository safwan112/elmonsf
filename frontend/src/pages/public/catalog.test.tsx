import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { courseDetail, courseSummary, page, product } from '@/test/catalog-fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server } from '@/test/server'

describe('courses catalog', () => {
  it('lists courses with price, level and counts', async () => {
    server.use(http.get(`${API}/courses`, () => HttpResponse.json(page([courseSummary()]))))
    renderApp('/courses')

    const card = (await screen.findByRole('link', { name: 'تأسيس القسم الكمي' })).closest('article')!
    expect(within(card).getByText('مبتدئ')).toBeInTheDocument()
    expect(within(card).getByText('20 درساً')).toBeInTheDocument()
    expect(within(card).getByText(/199/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 دورة')
  })

  it('applies level filters and sorting through the URL and API', async () => {
    const seen: URLSearchParams[] = []
    server.use(
      http.get(`${API}/courses`, ({ request }) => {
        seen.push(new URL(request.url).searchParams)
        return HttpResponse.json(page([courseSummary()]))
      }),
    )
    const { user, router } = renderApp('/courses')
    await screen.findByRole('link', { name: 'تأسيس القسم الكمي' })

    // Desktop sidebar (the mobile sheet renders a second copy only when open).
    await user.click(screen.getAllByLabelText('متقدم')[0]!)
    await waitFor(() => expect(router.state.location.search).toContain('level=advanced'))
    await waitFor(() => expect(seen.at(-1)?.get('level')).toBe('advanced'))

    await user.selectOptions(screen.getByLabelText('ترتيب النتائج'), 'price_asc')
    await waitFor(() => expect(seen.at(-1)?.get('sort')).toBe('price_asc'))
  })

  it('shows an empty state that can clear filters', async () => {
    server.use(http.get(`${API}/courses`, () => HttpResponse.json(page([]))))
    const { user, router } = renderApp('/courses?level=advanced')

    expect(await screen.findByText('لا توجد دورات مطابقة')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'مسح التصفية' }).at(-1)!)
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })
})

describe('course page', () => {
  it('renders details, lets the student choose a plan and links to checkout', async () => {
    server.use(http.get(`${API}/courses/:slug`, () => HttpResponse.json({ data: courseDetail(), related: [] })))
    const { user } = renderApp(`/courses/${encodeURIComponent('تأسيس-الكمي')}`)

    expect(await screen.findByRole('heading', { level: 1, name: 'تأسيس القسم الكمي' })).toBeInTheDocument()
    expect(screen.getByText('إتقان الحساب الذهني')).toBeInTheDocument()

    // Default plan (6 months) is preselected.
    const sixMonths = screen.getByRole('radio', { name: /6 أشهر/ })
    expect(sixMonths).toBeChecked()
    const ctas = () => screen.getAllByRole('link', { name: 'اشترك الآن' })
    expect(ctas()[0]).toHaveAttribute('href', '/checkout?plan=12')

    await user.click(screen.getByRole('radio', { name: /3 أشهر/ }))
    ctas().forEach((cta) => expect(cta).toHaveAttribute('href', '/checkout?plan=11'))

    // Course JSON-LD is published for search engines.
    await waitFor(() => expect(document.getElementById('seo-jsonld')?.textContent).toContain('"@type":"Course"'))
  })

  it('opens a free preview lesson', async () => {
    server.use(
      http.get(`${API}/courses/:slug`, () => HttpResponse.json({ data: courseDetail(), related: [] })),
      http.get(`${API}/courses/:slug/lessons/:id/preview`, ({ params }) =>
        HttpResponse.json({
          data: { id: Number(params.id), title: 'مقدمة الوحدة', type: { value: 'text', label: 'درس مقروء' }, duration_seconds: 300, content_html: '<p>محتوى المعاينة</p>', video_embed_url: null },
        }),
      ),
    )
    const { user } = renderApp('/courses/x')

    await user.click(await screen.findByRole('button', { name: 'معاينة' }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('محتوى المعاينة')).toBeInTheDocument()
  })

  it('shows the 404 page for unknown courses', async () => {
    server.use(http.get(`${API}/courses/:slug`, () => HttpResponse.json({ message: 'x', code: 'not_found' }, { status: 404 })))
    renderApp('/courses/missing')
    expect(await screen.findByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeInTheDocument()
  })
})

describe('products', () => {
  it('shows a product with a buy link', async () => {
    server.use(http.get(`${API}/products/:slug`, () => HttpResponse.json({ data: { ...product(), description_html: '<p>تفاصيل</p>', seo: { title: 'بنك', description: null } }, related: [] })))
    renderApp('/products/x')

    expect(await screen.findByRole('heading', { level: 1, name: 'بنك أسئلة الكمي' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'اشترِ الآن' })[0]).toHaveAttribute('href', '/checkout?product=7')
    expect(screen.getAllByText('وفّر 34٪')[0]).toBeInTheDocument()
  })

  it('filters by product type', async () => {
    const seen: string[] = []
    server.use(
      http.get(`${API}/products`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('type') ?? '')
        return HttpResponse.json(page([product()]))
      }),
    )
    const { user } = renderApp('/products')
    await screen.findByRole('link', { name: 'بنك أسئلة الكمي' })

    await user.click(screen.getByRole('button', { name: 'بنوك الأسئلة' }))
    await waitFor(() => expect(seen.at(-1)).toBe('question_bank'))
    expect(screen.getByRole('button', { name: 'بنوك الأسئلة' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('search', () => {
  it('shows grouped results for a query', async () => {
    server.use(
      http.get(`${API}/search`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('q')).toBe('الكمي')
        return HttpResponse.json({ data: { courses: [courseSummary()], products: [product()], posts: [] }, meta: { query: 'الكمي', total: 2 } })
      }),
    )
    renderApp(`/search?q=${encodeURIComponent('الكمي')}`)

    expect(await screen.findByRole('heading', { name: 'الدورات' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'المنتجات' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'المقالات' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2 نتيجة')
  })

  it('prompts for a query when empty', async () => {
    renderApp('/search')
    expect(await screen.findByText('ابدأ البحث')).toBeInTheDocument()
  })
})

describe('content pages', () => {
  it('renders a CMS page from the API', async () => {
    server.use(
      http.get(`${API}/pages/:slug`, ({ params }) =>
        HttpResponse.json({ data: { id: 1, slug: params.slug, title: 'من نحن', body_html: '<h2>رسالتنا</h2>', seo: { title: 'من نحن', description: null }, updated_at: null } }),
      ),
    )
    renderApp('/about')
    expect(await screen.findByRole('heading', { level: 1, name: 'من نحن' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'رسالتنا' })).toBeInTheDocument()
  })

  it('submits the contact form', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post(`${API}/contact`, async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'شكراً لتواصلك!' }, { status: 201 })
      }),
    )
    const { user } = renderApp('/contact')

    await user.type(await screen.findByLabelText('الاسم'), 'سلمى')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'salma@example.com')
    await user.type(screen.getByLabelText('الموضوع'), 'استفسار عن الباقات')
    await user.type(screen.getByLabelText('الرسالة'), 'هل يمكن ترقية الباقة لاحقاً؟')
    await user.click(screen.getByRole('button', { name: 'إرسال الرسالة' }))

    expect(await screen.findByText('شكراً لتواصلك!')).toBeInTheDocument()
    expect(body).toMatchObject({ name: 'سلمى', email: 'salma@example.com', subject: 'استفسار عن الباقات', website: '' })
  })

  it('validates the contact form before sending', async () => {
    const { user } = renderApp('/contact')
    await user.click(await screen.findByRole('button', { name: 'إرسال الرسالة' }))
    expect(await screen.findByText('اكتب رسالتك (10 أحرف على الأقل)')).toBeInTheDocument()
  })
})
