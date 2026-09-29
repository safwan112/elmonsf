import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeUser, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server, signInAs } from '@/test/server'

describe('forgot password', () => {
  it('shows a neutral confirmation after requesting a link', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/forgot-password`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ message: 'ok' })
      }),
    )
    const { user } = renderApp('/forgot-password')

    await user.type(await screen.findByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.click(screen.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }))

    expect(await screen.findByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeInTheDocument()
    expect(screen.getByText('reem@example.com')).toBeInTheDocument()
    expect(body).toEqual({ email: 'reem@example.com' })
  })

  it('is reachable from the login page', async () => {
    const { user, router } = renderApp('/login')
    await user.click(await screen.findByRole('link', { name: 'نسيت كلمة المرور؟' }))
    expect(router.state.location.pathname).toBe('/forgot-password')
  })
})

describe('reset password', () => {
  it('asks for a new link when the URL is incomplete', async () => {
    renderApp('/reset-password')
    expect(await screen.findByText('رابط إعادة التعيين غير مكتمل')).toBeInTheDocument()
  })

  it('submits token, email and the new password, then goes to login', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/reset-password`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ message: 'تمت إعادة تعيين كلمة المرور.' })
      }),
    )
    const { user, router } = renderApp('/reset-password?token=abc123&email=reem%40example.com')

    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'NewSecret123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'NewSecret123')
    await user.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(body).toEqual({
      token: 'abc123',
      email: 'reem@example.com',
      password: 'NewSecret123',
      password_confirmation: 'NewSecret123',
    })
  })

  it('explains an expired token', async () => {
    server.use(
      http.post(`${API}/auth/reset-password`, () =>
        HttpResponse.json(
          {
            message: 'البيانات المدخلة غير صحيحة.',
            code: 'validation_failed',
            errors: { email: ['رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية.'] },
          },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/reset-password?token=old&email=reem%40example.com')

    await user.type(await screen.findByLabelText('كلمة المرور الجديدة'), 'NewSecret123')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور'), 'NewSecret123')
    await user.click(screen.getByRole('button', { name: 'حفظ كلمة المرور' }))

    expect(await screen.findByText(/غير صالح أو منتهي الصلاحية/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'اطلب رابطاً جديداً' })).toBeInTheDocument()
  })
})

describe('verify email', () => {
  const link = '/verify-email?id=7&hash=abc&expires=1999999999&signature=sig'

  it('verifies with the link parameters', async () => {
    let url = ''
    server.use(
      http.post(`${API}/auth/email/verify/:id/:hash`, ({ request }) => {
        url = request.url
        return HttpResponse.json({ message: 'تم تأكيد بريدك الإلكتروني بنجاح.', data: { verified: true } })
      }),
    )
    renderApp(link)

    expect(await screen.findByRole('heading', { name: 'تم تأكيد بريدك الإلكتروني' })).toBeInTheDocument()
    expect(url).toContain('/auth/email/verify/7/abc?expires=1999999999&signature=sig')
  })

  it('shows the server reason when the link is invalid', async () => {
    server.use(
      http.post(`${API}/auth/email/verify/:id/:hash`, () =>
        HttpResponse.json(
          { message: 'رابط التأكيد غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً.', code: 'invalid_signature' },
          { status: 403 },
        ),
      ),
    )
    renderApp(link)

    expect(await screen.findByRole('heading', { name: 'تعذّر تأكيد البريد الإلكتروني' })).toBeInTheDocument()
    expect(screen.getByText(/اطلب رابطاً جديداً/)).toBeInTheDocument()
  })
})

describe('otp login', () => {
  it('signs in with an emailed code', async () => {
    const requests: unknown[] = []
    server.use(
      http.post(`${API}/auth/otp/send`, async ({ request }) => {
        requests.push(await request.json())
        return HttpResponse.json({ message: 'sent', data: { resend_after: 60, length: 6 } })
      }),
      http.post(`${API}/auth/otp/verify`, async ({ request }) => {
        requests.push(await request.json())
        return HttpResponse.json({ data: student })
      }),
    )
    const { user, router } = renderApp('/login')

    await user.click(await screen.findByRole('tab', { name: 'برمز تحقق' }))
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز الدخول' }))

    const codeInput = await screen.findByLabelText('رمز الدخول')
    await waitFor(() => expect(codeInput).toHaveFocus())
    // Arabic-Indic digits are normalised as the user types.
    await user.type(codeInput, '١٢٣٤٥٦')
    expect(codeInput).toHaveValue('123456')
    expect(screen.getByRole('button', { name: /إعادة الإرسال بعد/ })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'تأكيد وتسجيل الدخول' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
    expect(requests).toEqual([{ email: 'reem@example.com' }, { email: 'reem@example.com', code: '123456', remember: true }])
  })

  it('shows a wrong-code error on the field', async () => {
    server.use(
      http.post(`${API}/auth/otp/send`, () => HttpResponse.json({ message: 'sent', data: { resend_after: 60, length: 6 } })),
      http.post(`${API}/auth/otp/verify`, () =>
        HttpResponse.json(
          { message: 'x', code: 'validation_failed', errors: { code: ['الرمز غير صحيح أو منتهي الصلاحية.'] } },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/login')

    await user.click(await screen.findByRole('tab', { name: 'برمز تحقق' }))
    await user.type(screen.getByLabelText('البريد الإلكتروني'), 'reem@example.com')
    await user.click(screen.getByRole('button', { name: 'إرسال رمز الدخول' }))
    await user.type(await screen.findByLabelText('رمز الدخول'), '000000')
    await user.click(screen.getByRole('button', { name: 'تأكيد وتسجيل الدخول' }))

    expect(await screen.findByText('الرمز غير صحيح أو منتهي الصلاحية.')).toBeInTheDocument()
  })
})

describe('verification banner', () => {
  it('prompts unverified users and resends the link', async () => {
    signInAs(makeUser({ email_verified: false, email_verified_at: null }))
    let resent = false
    server.use(
      http.post(`${API}/auth/email/verification-notification`, () => {
        resent = true
        return HttpResponse.json({ message: 'أرسلنا رابط تأكيد جديداً إلى بريدك الإلكتروني.' }, { status: 202 })
      }),
    )
    const { user } = renderApp('/dashboard')

    expect(await screen.findByText(/لم تؤكد بريدك الإلكتروني بعد/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إعادة إرسال الرابط' }))

    expect(await screen.findByRole('button', { name: 'تم الإرسال' })).toBeDisabled()
    expect(resent).toBe(true)
  })

  it('is hidden for verified users', async () => {
    signInAs(student)
    renderApp('/dashboard')
    await screen.findByRole('heading', { name: /أهلاً/ })
    expect(screen.queryByText(/لم تؤكد بريدك الإلكتروني بعد/)).not.toBeInTheDocument()
  })
})
