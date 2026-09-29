import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { User } from '@/types/user'

export const API = '*/api/v1'

const unauthenticated = () =>
  HttpResponse.json({ message: 'يجب تسجيل الدخول أولاً.', code: 'unauthenticated' }, { status: 401 })

/** Default handlers: a signed-out visitor. Tests override per case. */
export const server = setupServer(
  http.get('*/sanctum/csrf-cookie', () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/user`, unauthenticated),
)

/** Make GET /user return this user (i.e. "signed in as"). */
export function signInAs(user: User) {
  server.use(http.get(`${API}/user`, () => HttpResponse.json({ data: user })))
}

export { http, HttpResponse }
