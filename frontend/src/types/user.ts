export const ROLES = ['admin', 'instructor', 'student'] as const
export type Role = (typeof ROLES)[number]

export type UserStatus = 'active' | 'suspended'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  locale: string
  marketing_emails?: boolean
  status: UserStatus
  roles: Role[]
  email_verified: boolean
  email_verified_at: string | null
  last_login_at?: string | null
  created_at: string | null
}

export const roleLabels: Record<Role, string> = {
  admin: 'مدير',
  instructor: 'مدرّب',
  student: 'طالب',
}

export const statusLabels: Record<UserStatus, string> = {
  active: 'نشط',
  suspended: 'موقوف',
}
