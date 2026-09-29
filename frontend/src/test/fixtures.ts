import type { User } from '@/types/user'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    name: 'ريم الشهري',
    email: 'reem@example.com',
    phone: null,
    avatar_url: null,
    locale: 'ar',
    status: 'active',
    roles: ['student'],
    email_verified: true,
    email_verified_at: '2026-01-01T00:00:00+00:00',
    last_login_at: null,
    created_at: '2026-01-01T00:00:00+00:00',
    ...overrides,
  }
}

export const student = makeUser()
export const admin = makeUser({ id: 2, name: 'مدير المنصة', email: 'admin@example.com', roles: ['admin', 'student'] })
