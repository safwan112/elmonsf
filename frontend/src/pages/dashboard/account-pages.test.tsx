import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { accountApi, type UserSession } from '@/api/account'
import { makeUser, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server, signInAs } from '@/test/server'

describe('profile page', () => {
  it('saves personal details and refreshes the cached user', async () => {
    signInAs(student)
    let body: unknown
    server.use(
      http.patch(`${API}/user/profile`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ data: { ...student, name: 'ريم عبدالله' }, message: 'تم حفظ بياناتك.' })
      }),
    )
    const { user } = renderApp('/dashboard/profile')

    const name = await screen.findByLabelText('الاسم الكامل')
    expect(name).toHaveValue(student.name)
    const save = screen.getByRole('button', { name: 'حفظ التغييرات' })
    expect(save).toBeDisabled()

    await user.clear(name)
    await user.type(name, 'ريم عبدالله')
    await user.click(save)

    await waitFor(() => expect(body).toEqual({ name: 'ريم عبدالله', phone: null, locale: 'ar' }))
    // The header/account menu reads the updated user from the cache.
    await waitFor(() => expect(screen.getByLabelText('الاسم الكامل')).toHaveValue('ريم عبدالله'))
  })

  it('shows server validation errors for the phone number', async () => {
    signInAs(student)
    server.use(
      http.patch(`${API}/user/profile`, () =>
        HttpResponse.json(
          { message: 'x', code: 'validation_failed', errors: { phone: ['رقم الجوال مستخدم من قبل.'] } },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/dashboard/profile')

    await user.type(await screen.findByLabelText('رقم الجوال'), '+966500000001')
    await user.click(screen.getByRole('button', { name: 'حفظ التغييرات' }))

    expect(await screen.findByText('رقم الجوال مستخدم من قبل.')).toBeInTheDocument()
  })

  it('requires the current password to change email', async () => {
    signInAs(student)
    const { user } = renderApp('/dashboard/profile')

    await user.type(await screen.findByLabelText('البريد الجديد'), 'new@example.com')
    await user.click(screen.getByRole('button', { name: 'تغيير البريد' }))

    expect(await screen.findByText('أدخل كلمة المرور الحالية')).toBeInTheDocument()
  })

  it('rejects unsupported avatar files before uploading', async () => {
    signInAs(student)
    let uploaded = false
    server.use(
      http.post(`${API}/user/avatar`, () => {
        uploaded = true
        return HttpResponse.json({ data: student })
      }),
    )
    renderApp('/dashboard/profile')

    // Dispatch `change` directly (as a browser would after the file picker).
    const input = await screen.findByLabelText('اختيار صورة شخصية')
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })] } })

    expect(await screen.findByText('اختر صورة بصيغة JPG أو PNG أو WebP.')).toBeInTheDocument()
    expect(uploaded).toBe(false)
  })

  it('uploads a valid avatar', async () => {
    // jsdom under Vitest cannot serialise File bodies over XHR, so the API
    // call is stubbed here; the real multipart upload is covered by E2E.
    signInAs(student)
    const upload = vi
      .spyOn(accountApi, 'uploadAvatar')
      .mockResolvedValue({ data: { ...student, avatar_url: 'http://x/avatar.webp' }, message: 'تم تحديث الصورة الشخصية.' })
    renderApp('/dashboard/profile')

    const file = new File(['img'], 'me.png', { type: 'image/png' })
    fireEvent.change(await screen.findByLabelText('اختيار صورة شخصية'), { target: { files: [file] } })

    expect(await screen.findByRole('button', { name: 'تغيير الصورة' })).toBeInTheDocument()
    expect(upload).toHaveBeenCalledWith(file)
  })
})

const sessions: UserSession[] = [
  { id: 'a'.repeat(64), ip_address: '10.0.0.1', browser: 'Chrome', platform: 'Windows', is_mobile: false, is_current: true, last_active_at: new Date().toISOString() },
  { id: 'b'.repeat(64), ip_address: '10.0.0.2', browser: 'Safari', platform: 'iOS', is_mobile: true, is_current: false, last_active_at: new Date(Date.now() - 3 * 3600_000).toISOString() },
]

describe('security page', () => {
  it('changes the password', async () => {
    signInAs(student)
    let body: unknown
    server.use(
      http.get(`${API}/user/sessions`, () => HttpResponse.json({ data: sessions, meta: { supported: true } })),
      http.put(`${API}/user/password`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ message: 'تم تغيير كلمة المرور، وسُجّل خروجك من الأجهزة الأخرى.' })
      }),
    )
    const { user } = renderApp('/dashboard/security')

    await user.type(await screen.findByLabelText('كلمة المرور الحالية'), 'OldSecret1')
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'NewSecret1')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'NewSecret1')
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }))

    await waitFor(() =>
      expect(body).toEqual({ current_password: 'OldSecret1', password: 'NewSecret1', password_confirmation: 'NewSecret1' }),
    )
    await waitFor(() => expect(screen.getByLabelText('كلمة المرور الحالية')).toHaveValue(''))
  })

  it('shows a wrong current password on the field', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/user/sessions`, () => HttpResponse.json({ data: sessions, meta: { supported: true } })),
      http.put(`${API}/user/password`, () =>
        HttpResponse.json(
          { message: 'x', code: 'validation_failed', errors: { current_password: ['كلمة المرور غير صحيحة.'] } },
          { status: 422 },
        ),
      ),
    )
    const { user } = renderApp('/dashboard/security')

    await user.type(await screen.findByLabelText('كلمة المرور الحالية'), 'nope1234')
    await user.type(screen.getByLabelText('كلمة المرور الجديدة'), 'NewSecret1')
    await user.type(screen.getByLabelText('تأكيد كلمة المرور الجديدة'), 'NewSecret1')
    await user.click(screen.getByRole('button', { name: 'تحديث كلمة المرور' }))

    expect(await screen.findByText('كلمة المرور غير صحيحة.')).toBeInTheDocument()
  })

  it('lists sessions and revokes another device', async () => {
    signInAs(student)
    let current = [...sessions]
    let revoked = ''
    server.use(
      http.get(`${API}/user/sessions`, () => HttpResponse.json({ data: current, meta: { supported: true } })),
      http.delete(`${API}/user/sessions/:id`, ({ params }) => {
        revoked = String(params.id)
        current = current.filter((s) => s.id !== params.id)
        return HttpResponse.json({ message: 'تم تسجيل الخروج من الجهاز.' })
      }),
    )
    const { user } = renderApp('/dashboard/security')

    const list = await screen.findByRole('list', { name: 'الأجهزة المتصلة' })
    expect(within(list).getByText('هذا الجهاز')).toBeInTheDocument()
    expect(within(list).getByText(/Safari على iOS/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تسجيل الخروج من Safari على iOS' }))

    await waitFor(() => expect(screen.queryByText(/Safari على iOS/)).not.toBeInTheDocument())
    expect(revoked).toBe('b'.repeat(64))
  })

  it('confirms the password before signing out other devices', async () => {
    signInAs(makeUser())
    let password = ''
    server.use(
      http.get(`${API}/user/sessions`, () => HttpResponse.json({ data: sessions, meta: { supported: true } })),
      http.post(`${API}/user/sessions/revoke-others`, async ({ request }) => {
        password = ((await request.json()) as { password: string }).password
        return HttpResponse.json({ message: 'تم تسجيل الخروج من جميع الأجهزة الأخرى.', data: { revoked: 1 } })
      }),
    )
    const { user } = renderApp('/dashboard/security')

    await user.click(await screen.findByRole('button', { name: 'تسجيل الخروج من الأجهزة الأخرى' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('كلمة المرور'), 'Secret123')
    await user.click(within(dialog).getByRole('button', { name: 'تسجيل الخروج' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(password).toBe('Secret123')
  })
})
