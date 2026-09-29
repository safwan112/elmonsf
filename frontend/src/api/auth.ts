import type { ApiResource } from '@/types/api'
import type { User } from '@/types/user'
import { api } from './client'
import { ApiError } from './errors'

export interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
}

export const authApi = {
  /** Current user, or null when signed out. */
  async me(): Promise<User | null> {
    try {
      const res = await api.get<ApiResource<User>>('/user')
      return res.data
    } catch (error) {
      if (ApiError.from(error).isUnauthenticated) return null
      throw error
    }
  },

  login: (payload: LoginPayload) => api.post<ApiResource<User>>('/auth/login', payload),

  register: (payload: RegisterPayload) => api.post<ApiResource<User>>('/auth/register', payload),

  logout: () => api.post<{ message: string }>('/auth/logout'),
}
