import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountApi, type UpdateProfilePayload } from '@/api/account'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/api/query-keys'
import type { ApiResource } from '@/types/api'
import type { User } from '@/types/user'

/** Keep the cached current user in sync with a mutation's returned user. */
function useSetMe() {
  const queryClient = useQueryClient()
  return (res: ApiResource<User>) => queryClient.setQueryData<User | null>(queryKeys.auth.me, res.data)
}

export function useUpdateProfile() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => accountApi.updateProfile(payload),
    meta: { silentError: true },
    onSuccess: setMe,
  })
}

export function useUpdateEmail() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: accountApi.updateEmail,
    meta: { silentError: true },
    onSuccess: setMe,
  })
}

export function useUploadAvatar() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: (file: File) => accountApi.uploadAvatar(file),
    onSuccess: setMe,
  })
}

export function useDeleteAvatar() {
  const setMe = useSetMe()
  return useMutation({
    mutationFn: accountApi.deleteAvatar,
    onSuccess: setMe,
  })
}

export function useUpdatePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: accountApi.updatePassword,
    meta: { silentError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.account.sessions }),
  })
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.account.sessions,
    queryFn: accountApi.sessions,
  })
}

export function useRevokeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => accountApi.revokeSession(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.account.sessions }),
  })
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (password: string) => accountApi.revokeOtherSessions(password),
    meta: { silentError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.account.sessions }),
  })
}

export function useResendVerification() {
  return useMutation({ mutationFn: authApi.resendVerification })
}
