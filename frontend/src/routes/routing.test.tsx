import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, student } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server, signInAs } from '@/test/server'

const overview = {
  data: { users: { total: 42, active: 40, new_last_30_days: 7, by_role: { admin: 1, instructor: 3, student: 38 } } },
}

describe('routing & guards', () => {
  it('renders the public home page for visitors', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: /القدرات والتحصيلي/ })).toBeInTheDocument()
    expect((await screen.findAllByRole('link', { name: 'تسجيل الدخول' })).length).toBeGreaterThan(0)
  })

  it('redirects guests from the student dashboard to login, keeping the target', async () => {
    const { router } = renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: 'مرحباً بعودتك' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?redirect=%2Fdashboard')
  })

  it('redirects guests away from admin pages', async () => {
    const { router } = renderApp('/admin/users')
    await screen.findByRole('heading', { name: 'مرحباً بعودتك' })
    expect(router.state.location.search).toBe('?redirect=%2Fadmin%2Fusers')
  })

  it('shows the student dashboard to a signed-in student', async () => {
    signInAs(student)
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: /أهلاً ريم/ })).toBeInTheDocument()
    expect(screen.getByText('لا توجد اشتراكات فعّالة بعد')).toBeInTheDocument()
  })

  it('blocks students from the admin area', async () => {
    signInAs(student)
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'لا تملك صلاحية الوصول' })).toBeInTheDocument()
  })

  it('lets admins into the admin area', async () => {
    signInAs(admin)
    server.use(http.get(`${API}/admin/overview`, () => HttpResponse.json(overview)))
    renderApp('/admin')
    expect(await screen.findByRole('heading', { name: 'نظرة عامة' })).toBeInTheDocument()
    expect(await screen.findByText('42')).toBeInTheDocument()
    expect(screen.getByText('38')).toBeInTheDocument()
  })

  it('sends signed-in users away from the login page', async () => {
    signInAs(student)
    const { router } = renderApp('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  })

  it('shows a 404 page for unknown routes', async () => {
    renderApp('/this/does/not/exist')
    expect(await screen.findByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeInTheDocument()
  })

  it('shows an error state with retry when the admin API fails', async () => {
    signInAs(admin)
    server.use(
      http.get(`${API}/admin/overview`, () =>
        HttpResponse.json({ message: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.', code: 'server_error' }, { status: 500 }),
      ),
    )
    renderApp('/admin')
    expect(await screen.findByText('تعذّر تحميل البيانات')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument()
  })
})
