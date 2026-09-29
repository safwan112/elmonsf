import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, emptyPage, http, HttpResponse, server, signInAs } from '@/test/server'
import type { AppNotification } from '@/types/notifications'

const note = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: '0b4b2a7e-0000-4000-8000-000000000001',
  type: 'order_paid',
  title: 'تم تأكيد طلبك',
  body: 'تم استلام دفعتك للطلب ORD-2026-000001',
  url: '/dashboard/orders/ORD-2026-000001',
  read_at: null,
  created_at: new Date().toISOString(),
  ...overrides,
})

describe('notifications', () => {
  it('shows the unread count in the header bell and opens a notification', async () => {
    signInAs(student)
    let read = false
    server.use(
      http.get(`${API}/notifications/unread-count`, () => HttpResponse.json({ data: { unread_count: read ? 0 : 1 } })),
      http.get(`${API}/notifications`, () =>
        HttpResponse.json({ ...emptyPage, data: [note({ read_at: read ? new Date().toISOString() : null })], unread_count: read ? 0 : 1 }),
      ),
      http.post(`${API}/notifications/:id/read`, () => {
        read = true
        return HttpResponse.json({ data: note({ read_at: new Date().toISOString() }) })
      }),
      http.get(`${API}/orders/ORD-2026-000001`, () => HttpResponse.json({ message: 'x', code: 'not_found' }, { status: 404 })),
    )
    const { user, router } = renderApp('/dashboard')

    const bell = await screen.findByRole('button', { name: 'الإشعارات (1 غير مقروءة)' })
    await user.click(bell)
    await user.click(await screen.findByRole('menuitem', { name: /تم تأكيد طلبك/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/orders/ORD-2026-000001'))
    await waitFor(() => expect(read).toBe(true))
    expect(await screen.findByRole('button', { name: 'الإشعارات' })).toBeInTheDocument()
  })

  it('lists, filters and marks all notifications as read', async () => {
    signInAs(student)
    const seen: string[] = []
    let allRead = false
    server.use(
      http.get(`${API}/notifications`, ({ request }) => {
        seen.push(new URL(request.url).searchParams.get('filter') ?? '')
        return HttpResponse.json({
          ...emptyPage,
          data: [note({ read_at: allRead ? new Date().toISOString() : null }), note({ id: '0b4b2a7e-0000-4000-8000-000000000002', type: 'announcement', title: 'خصم', url: null, read_at: new Date().toISOString() })],
          unread_count: allRead ? 0 : 1,
        })
      }),
      http.post(`${API}/notifications/read-all`, () => {
        allRead = true
        return HttpResponse.json({ data: { unread_count: 0 } })
      }),
    )
    const { user } = renderApp('/dashboard/notifications')

    expect(await screen.findByText('لديك 1 إشعار غير مقروء.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /تم تأكيد طلبك/ })).toHaveAttribute('href', '/dashboard/orders/ORD-2026-000001')
    expect(screen.queryByRole('link', { name: /خصم/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'غير المقروءة' }))
    await waitFor(() => expect(seen).toContain('unread'))

    await user.click(screen.getByRole('button', { name: 'تحديد الكل كمقروء' }))
    expect(await screen.findByText('كل إشعاراتك مقروءة.')).toBeInTheDocument()
  })

  it('lets admins broadcast an announcement to an audience', async () => {
    signInAs(admin)
    let sent: Record<string, unknown> | null = null
    server.use(
      http.get(`${API}/admin/courses`, () => HttpResponse.json(emptyPage)),
      http.get(`${API}/admin/broadcasts`, () => HttpResponse.json(emptyPage)),
      http.post(`${API}/admin/broadcasts/preview`, () => HttpResponse.json({ data: { recipients: 120, email_recipients: 100 } })),
      http.post(`${API}/admin/broadcasts`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ message: 'تمت جدولة الإشعار', data: {} }, { status: 201 })
      }),
    )
    const { user } = renderApp('/admin/notifications')

    expect(await screen.findByText('سيصل إلى 120 مستخدم')).toBeInTheDocument()
    await user.type(screen.getByLabelText('العنوان *'), 'خصم 20%')
    await user.type(screen.getByLabelText('النص *'), 'لفترة محدودة')
    await user.click(screen.getByLabelText('إرسال نسخة على البريد الإلكتروني أيضاً'))
    expect(screen.getByText('سيصل إلى 120 مستخدم (100 عبر البريد)')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'إرسال' }))

    await waitFor(() => expect(sent).toEqual({ title: 'خصم 20%', body: 'لفترة محدودة', url: null, audience: 'students', course_id: null, send_email: true }))
  })

  it('toggles announcement emails from the profile', async () => {
    signInAs(student)
    let patched: unknown = null
    server.use(
      http.patch(`${API}/user/profile`, async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ data: { ...student, marketing_emails: false } })
      }),
      http.get(`${API}/user/sessions`, () => HttpResponse.json({ data: [] })),
    )
    const { user } = renderApp('/dashboard/profile')

    const card = (await screen.findByText('تفضيلات البريد')).closest('[data-slot="card"]') as HTMLElement
    await user.click(within(card).getByRole('checkbox'))
    await waitFor(() => expect(patched).toEqual({ marketing_emails: false }))
  })
})
