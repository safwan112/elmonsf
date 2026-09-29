import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, makeUser, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server } from '@/test/server'

describe('login page', () => {
  it('validates required fields before calling the API', async () => {
    let called = false
    server.use(
      http.post(`${API}/auth/login`, () => {
        called = true
        return HttpResponse.json({ data: student })
      }),
    )
    const { user } = renderApp('/login')

    await user.click(await screen.findByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('البريد الإلكتروني مطلوب')).toBeInTheDocument()
    expect(screen.getByText('كلمة المرور مطلوبة')).toBeInTheDocument()
    expect(screen.getByLabelText('البريد الإلكتروني')).toHaveAttribute('aria-invalid', 'true')
    expect(called).toBe(false)
  })

  it('shows server-side credential errors on the email field', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          {
            message: 'البيانات المدخلة غير صحيحة.',
            code: 'validation_failed',
            errors: { email: ['البريد الإلكتروني أو كلمة المرور غير صحيحة.'] },
          },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/login')

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong-pass1')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    expect(await screen.findByText('البريد الإلكتروني أو كلمة المرور غير صحيحة.')).toBeInTheDocument()
  })

  it('signs in, sends credentials and returns to the requested page', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: student })
      }),
    )
    const { user, router } = renderApp('/login?redirect=%2Fdashboard')

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(body).toEqual({ email: 'reem@example.com', password: 'Secret123', remember: true })
  })

  it('sends admins to the admin area by default', async () => {
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json({ data: admin })),
      http.get(`${API}/admin/overview`, () =>
        HttpResponse.json({
          data: { users: { total: 1, active: 1, new_last_30_days: 1, by_role: { admin: 1, instructor: 0, student: 1 } } },
        }),
      ),
    )
    const { user, router } = renderApp('/login')

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'admin@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('ignores unsafe external redirect targets', async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.json({ data: student })))
    const { user, router } = renderApp('/login?redirect=%2F%2Fevil.example')

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'تسجيل الدخول' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })
})

describe('register page', () => {
  it('checks that passwords match', async () => {
    const { user } = renderApp('/register')

    await user.type(await screen.findByLabelText('الاسم الكامل'), 'ريم الشهري')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Secret999')
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))

    expect(await screen.findByText('كلمتا المرور غير متطابقتين')).toBeInTheDocument()
  })

  it('maps server validation errors onto fields', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          { message: 'البيانات المدخلة غير صحيحة.', code: 'validation_failed', errors: { email: ['البريد الإلكتروني مستخدم من قبل.'] } },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/register')

    await user.type(await screen.findByLabelText('الاسم الكامل'), 'ريم الشهري')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))

    expect(await screen.findByText('البريد الإلكتروني مستخدم من قبل.')).toBeInTheDocument()
  })

  it('creates the account and opens the student dashboard', async () => {
    const created = makeUser({ id: 9, name: 'سلمان القحطاني', email: 'salman@example.com' })
    server.use(http.post(`${API}/auth/register`, () => HttpResponse.json({ data: created }, { status: 201 })))
    const { user, router } = renderApp('/register')

    await user.type(await screen.findByLabelText('الاسم الكامل'), 'سلمان القحطاني')
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'salman@example.com')
    await user.type(screen.getByLabelText('كلمة المرور'), 'Secret123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'Secret123')
    await user.click(screen.getByRole('button', { name: 'إنشاء الحساب' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(await screen.findByRole('heading', { name: /أهلاً سلمان/ })).toBeInTheDocument()
  })
})
