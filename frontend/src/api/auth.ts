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

export interface ResetPasswordPayload {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export interface VerifyEmailParams {
  id: string
  hash: string
  expires: string
  signature: string
}

export interface OtpSentResponse {
  message: string
  data: { resend_after: number; length: number }
}

type Message = { message: string }

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

  logout: () => api.post<Message>('/auth/logout'),

  forgotPassword: (email: string) => api.post<Message>('/auth/forgot-password', { email }),

  resetPassword: (payload: ResetPasswordPayload) => api.post<Message>('/auth/reset-password', payload),

  verifyEmail: ({ id, hash, expires, signature }: VerifyEmailParams) =>
    api.post<Message & { data: { verified: boolean } }>(
      `/auth/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}`,
      undefined,
      { params: { expires, signature } },
    ),

  resendVerification: () => api.post<Message>('/auth/email/verification-notification'),

  sendOtp: (email: string) => api.post<OtpSentResponse>('/auth/otp/send', { email }),

  verifyOtp: (payload: { email: string; code: string; remember?: boolean }) =>
    api.post<ApiResource<User>>('/auth/otp/verify', payload),
}
