import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { User } from '@/types/user'

export const API = '*/api/v1'

const unauthenticated = () =>
  HttpResponse.json({ message: 'يجب تسجيل الدخول أولاً.', code: 'unauthenticated' }, { status: 401 })

export const emptyPage = {
  data: [],
  meta: { current_page: 1, from: null, last_page: 1, per_page: 12, to: null, total: 0, path: '' },
  links: { first: null, last: null, prev: null, next: null },
}

/**
 * Default handlers: a signed-out visitor and an empty public catalog.
 * Tests override per case with server.use(...).
 */
export const server = setupServer(
  http.get('*/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/user`, unauthenticated),
  http.get(`${API}/categories`, () => HttpResponse.json({ data: [] })),
  http.get(`${API}/courses`, () => HttpResponse.json(emptyPage)),
  http.get(`${API}/products`, () => HttpResponse.json(emptyPage)),
  http.get(`${API}/posts`, () => HttpResponse.json(emptyPage)),
  http.get(`${API}/testimonials`, () => HttpResponse.json({ data: [] })),
  http.get(`${API}/faqs`, () => HttpResponse.json({ data: [] })),
  http.get(`${API}/settings`, () => HttpResponse.json({ data: {} })),
)

/** Make GET /user return this user (i.e. "signed in as"). */
export function signInAs(user: User) {
  server.use(http.get(`${API}/user`, () => HttpResponse.json({ data: user })))
}

export { http, HttpResponse }
