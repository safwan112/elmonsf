import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { Cart } from '@/types/commerce'
import type { User } from '@/types/user'

export const API = '*/api/v1'

const unauthenticated = () =>
  HttpResponse.json({ message: 'يجب تسجيل الدخول أولاً.', code: 'unauthenticated' }, { status: 401 })

export const emptyPage = {
  data: [],
  meta: { current_page: 1, from: null, last_page: 1, per_page: 12, to: null, total: 0, path: '' },
  links: { first: null, last: null, prev: null, next: null },
}

const zero = { amount: 0, amount_minor: 0, currency: 'SAR' }
export const emptyCart: Cart = {
  items: [],
  count: 0,
  subtotal: zero,
  discount: zero,
  tax: zero,
  total: zero,
  vat_rate: 15,
  coupon: null,
  notices: [],
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
  http.get(`${API}/cart`, () => HttpResponse.json({ data: emptyCart })),
  http.get(`${API}/enrollments`, () => HttpResponse.json({ data: [] })),
)

/** Make GET /user return this user (i.e. "signed in as"). */
export function signInAs(user: User) {
  server.use(http.get(`${API}/user`, () => HttpResponse.json({ data: user })))
}

export { http, HttpResponse }
