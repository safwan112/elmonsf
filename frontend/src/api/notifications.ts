import type { ApiResource, Paginated } from '@/types/api'
import type { AppNotification } from '@/types/notifications'
import { api } from './client'

export const notificationsApi = {
  list: (params: { filter?: 'all' | 'unread'; page?: number; per_page?: number }) =>
    api.get<Paginated<AppNotification> & { unread_count: number }>('/notifications', { params }),
  unreadCount: () => api.get<ApiResource<{ unread_count: number }>>('/notifications/unread-count').then((r) => r.data.unread_count),
  markRead: (id: string) => api.post<ApiResource<AppNotification>>(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/read-all'),
  remove: (id: string) => api.delete(`/notifications/${id}`),
}
