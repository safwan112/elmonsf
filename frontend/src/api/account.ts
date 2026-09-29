import type { ApiResource } from '@/types/api'
import type { User } from '@/types/user'
import { api } from './client'

export interface UpdateProfilePayload {
  name?: string
  phone?: string | null
  locale?: 'ar' | 'en'
}

export interface UserSession {
  id: string
  ip_address: string | null
  browser: string | null
  platform: string | null
  is_mobile: boolean
  is_current: boolean
  last_active_at: string
}

type Message = { message: string }

export const accountApi = {
  updateProfile: (payload: UpdateProfilePayload) => api.patch<ApiResource<User>>('/user/profile', payload),

  updateEmail: (payload: { email: string; current_password: string }) =>
    api.patch<ApiResource<User>>('/user/email', payload),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('avatar', file)
    return api.post<ApiResource<User>>('/user/avatar', form)
  },

  deleteAvatar: () => api.delete<ApiResource<User>>('/user/avatar'),

  updatePassword: (payload: { current_password: string; password: string; password_confirmation: string }) =>
    api.put<Message>('/user/password', payload),

  sessions: () => api.get<{ data: UserSession[]; meta: { supported: boolean } }>('/user/sessions'),

  revokeSession: (id: string) => api.delete<Message>(`/user/sessions/${encodeURIComponent(id)}`),

  revokeOtherSessions: (password: string) =>
    api.post<Message & { data: { revoked: number } }>('/user/sessions/revoke-others', { password }),
}
