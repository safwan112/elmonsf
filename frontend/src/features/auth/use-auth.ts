import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type LoginPayload, type RegisterPayload } from '@/api/auth'
import { queryKeys } from '@/api/query-keys'
import type { ApiResource } from '@/types/api'
import type { Role, User } from '@/types/user'

/**
 * The signed-in user (null when signed out). This is UX state only —
 * the API enforces every permission independently.
 */
export function useCurrentUser() {
  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    retry: false,
  })

  const user = query.data ?? null

  return {
    user,
    isLoading: query.isPending,
    isAuthenticated: user !== null,
    hasRole: (...roles: Role[]) => user !== null && roles.some((role) => user.roles.includes(role)),
    error: query.error,
  }
}

function useSignedIn() {
  const queryClient = useQueryClient()
  return (res: ApiResource<User>) => {
    queryClient.setQueryData<User | null>(queryKeys.auth.me, res.data)
  }
}

export function useLogin() {
  const onSignedIn = useSignedIn()
  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    meta: { silentError: true },
    onSuccess: onSignedIn,
  })
}

export function useRegister() {
  const onSignedIn = useSignedIn()
  return useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    meta: { silentError: true },
    onSuccess: onSignedIn,
  })
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (email: string) => authApi.sendOtp(email),
    meta: { silentError: true },
  })
}

export function useVerifyOtp() {
  const onSignedIn = useSignedIn()
  return useMutation({
    mutationFn: authApi.verifyOtp,
    meta: { silentError: true },
    onSuccess: onSignedIn,
  })
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    meta: { silentError: true },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
    meta: { silentError: true },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      // Drop every cached private query, then mark the user as signed out.
      queryClient.clear()
      queryClient.setQueryData<User | null>(queryKeys.auth.me, null)
    },
  })
}

/** Default landing page after sign-in, by role. */
export function homePathFor(user: User): string {
  if (user.roles.includes('admin')) return '/admin'
  return '/dashboard'
}
