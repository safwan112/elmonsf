import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { adminApi, type AdminUserFilters } from '@/api/admin'
import { queryKeys } from '@/api/query-keys'

export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: adminApi.overview,
  })
}

export function useAdminUsers(filters: AdminUserFilters) {
  return useQuery({
    queryKey: queryKeys.admin.users(filters),
    queryFn: () => adminApi.users(filters),
    placeholderData: keepPreviousData,
  })
}
