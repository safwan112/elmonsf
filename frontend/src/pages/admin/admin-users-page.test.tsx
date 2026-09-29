import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { admin, makeUser } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { API, http, HttpResponse, server, signInAs } from '@/test/server'

function page(users: ReturnType<typeof makeUser>[], total = users.length) {
  return {
    data: users,
    meta: { current_page: 1, from: users.length ? 1 : null, last_page: Math.max(1, Math.ceil(total / 15)), per_page: 15, to: users.length || null, total, path: '/api/v1/admin/users' },
    links: { first: null, last: null, prev: null, next: null },
  }
}

describe('admin users page', () => {
  it('lists users with roles and status', async () => {
    signInAs(admin)
    server.use(
      http.get(`${API}/admin/users`, () =>
        HttpResponse.json(
          page([
            makeUser({ id: 10, name: 'خالد المطيري', email: 'khalid@example.com' }),
            makeUser({ id: 11, name: 'هند الدوسري', email: 'hind@example.com', status: 'suspended', roles: ['instructor'] }),
          ]),
        ),
      ),
    )
    renderApp('/admin/users')

    expect(await screen.findByText('خالد المطيري')).toBeInTheDocument()
    expect(screen.getByText('hind@example.com')).toBeInTheDocument()
    expect(within(screen.getByRole('table')).getByText('موقوف')).toBeInTheDocument()
  })

  it('sends filters to the API and shows an empty state when nothing matches', async () => {
    signInAs(admin)
    const seen: string[] = []
    server.use(
      http.get(`${API}/admin/users`, ({ request }) => {
        const url = new URL(request.url)
        seen.push(url.search)
        return HttpResponse.json(url.searchParams.get('role') === 'instructor' ? page([]) : page([makeUser({ id: 10 })]))
      }),
    )
    const { user, router } = renderApp('/admin/users')

    await screen.findByText('reem@example.com')
    await user.selectOptions(screen.getByLabelText('تصفية حسب الدور'), 'instructor')

    expect(await screen.findByText('لا توجد نتائج')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).toContain('role=instructor'))
    expect(seen.some((s) => s.includes('role=instructor'))).toBe(true)
  })
})
