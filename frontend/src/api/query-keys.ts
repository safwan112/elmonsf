import type { AdminUserFilters } from './admin'

/** Central registry of TanStack Query keys. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
  },
}
