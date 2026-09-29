import { useQuery } from '@tanstack/react-query'
import { adminResource } from '@/api/admin'
import { catalogApi } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'
import { useCurrentUser } from '@/features/auth/use-auth'
import type { AdminCourseRow, AdminInstructor, AdminProduct, AdminQuestionBank } from '@/types/admin'
import type { SelectOption } from './form-values'

const STALE = 60_000

/** Categories as "Parent" / "— Child" options (public list: all roles can read it). */
export function useCategoryOptions(): SelectOption[] {
  const query = useQuery({ queryKey: queryKeys.catalog.categories, queryFn: catalogApi.categories, staleTime: STALE })
  return (query.data ?? []).flatMap((c) => [
    { value: String(c.id), label: c.name },
    ...(c.children ?? []).map((child) => ({ value: String(child.id), label: `— ${child.name}` })),
  ])
}

export function useInstructorOptions(enabled = true): SelectOption[] {
  const query = useQuery({
    queryKey: queryKeys.admin.resource('instructors', 'options'),
    queryFn: () => adminResource<AdminInstructor>('instructors').list(),
    staleTime: STALE,
    enabled,
  })
  return (query.data?.data ?? []).map((i) => ({ value: String(i.id), label: i.name }))
}

export function useCourseOptions(): SelectOption[] {
  const { hasRole } = useCurrentUser()
  const query = useQuery({
    queryKey: queryKeys.admin.resource('courses', 'options'),
    queryFn: () => adminResource<AdminCourseRow>('courses').list({ per_page: 100 }),
    staleTime: STALE,
    enabled: hasRole('admin', 'instructor'),
  })
  return (query.data?.data ?? []).map((c) => ({ value: String(c.id), label: c.title }))
}

export function useProductOptions(): SelectOption[] {
  const query = useQuery({
    queryKey: queryKeys.admin.resource('products', 'options'),
    queryFn: () => adminResource<AdminProduct>('products').list({ per_page: 100 }),
    staleTime: STALE,
  })
  return (query.data?.data ?? []).map((p) => ({ value: String(p.id), label: p.title }))
}

export function useBankOptions(): SelectOption[] {
  const query = useQuery({
    queryKey: queryKeys.admin.resource('question-banks', 'options'),
    queryFn: () => adminResource<AdminQuestionBank>('question-banks').list(),
    staleTime: STALE,
  })
  return (query.data?.data ?? []).map((b) => ({ value: String(b.id), label: b.title }))
}
