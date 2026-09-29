import type { ApiResource, Paginated } from '@/types/api'
import type { Role, User, UserStatus } from '@/types/user'
import { api } from './client'

export interface AdminOverview {
  users: {
    total: number
    active: number
    new_last_30_days: number
    by_role: Record<Role, number>
  }
}

export interface AdminUserFilters {
  search?: string
  role?: Role
  status?: UserStatus
  sort?: string
  page?: number
  per_page?: number
}

/** Drop empty values so they are not sent as `?search=`. */
function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>
}

export const adminApi = {
  overview: () => api.get<ApiResource<AdminOverview>>('/admin/overview').then((r) => r.data),

  users: (filters: AdminUserFilters) => api.get<Paginated<User>>('/admin/users', { params: compact(filters) }),

  user: (id: number) => api.get<ApiResource<User>>(`/admin/users/${id}`).then((r) => r.data),
}
