import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationsApi } from '@/api/notifications'
import { useCurrentUser } from '@/features/auth/use-auth'

export const notificationKeys = {
  all: ['notifications'] as const,
  unread: ['notifications', 'unread-count'] as const,
  list: (filter: 'all' | 'unread', page: number) => ['notifications', 'list', filter, page] as const,
}

/** Unread badge count; refreshed every minute and when the tab regains focus. */
export function useUnreadCount() {
  const { isAuthenticated } = useCurrentUser()
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: notificationsApi.unreadCount,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}

export function useNotifications(filter: 'all' | 'unread', page = 1, perPage = 20) {
  const { isAuthenticated } = useCurrentUser()
  return useQuery({
    queryKey: notificationKeys.list(filter, page),
    queryFn: () => notificationsApi.list({ filter, page, per_page: perPage }),
    enabled: isAuthenticated,
    placeholderData: keepPreviousData,
  })
}

function useRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: notificationKeys.all })
}

export function useMarkRead() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: notificationsApi.markRead, onSuccess: () => void refresh() })
}

export function useMarkAllRead() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess: () => void refresh() })
}

export function useDeleteNotification() {
  const refresh = useRefresh()
  return useMutation({ mutationFn: notificationsApi.remove, onSuccess: () => void refresh() })
}
