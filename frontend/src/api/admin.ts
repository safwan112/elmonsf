import type { ApiResource, Paginated } from '@/types/api'
import type {
  AdminAuditLog,
  AdminCourse,
  AdminLesson,
  AdminOrder,
  AdminOverview,
  AdminPlan,
  AdminSection,
  AdminSettings,
  AdminWebhookEvent,
  MediaUpload,
} from '@/types/admin'
import type { Role, User, UserStatus } from '@/types/user'
import { api } from './client'

export type { AdminOverview } from '@/types/admin'

export interface AdminUserFilters {
  search?: string
  role?: Role
  status?: UserStatus
  sort?: string
  page?: number
  per_page?: number
}

export type ListParams = Record<string, string | number | boolean | undefined | null>
export type Body = Record<string, unknown>
type WithMessage<T> = ApiResource<T> & { message?: string }

/** Drop empty values so they are not sent as `?search=`. */
export function compact<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>
}

/**
 * Standard CRUD calls for an admin resource at `/admin/{path}`. `list`
 * returns either a paginated collection or `{data: T[]}` for small lists.
 */
export function adminResource<T>(path: string) {
  const base = `/admin/${path}`
  return {
    list: (params: ListParams = {}) => api.get<Paginated<T> | { data: T[] }>(base, { params: compact(params) }),
    show: (id: number) => api.get<ApiResource<T>>(`${base}/${id}`).then((r) => r.data),
    create: (body: Body) => api.post<WithMessage<T>>(base, body),
    update: (id: number, body: Body) => api.put<WithMessage<T>>(`${base}/${id}`, body),
    remove: (id: number) => api.delete<{ message?: string; data?: T }>(`${base}/${id}`),
  }
}

export const adminApi = {
  overview: () => api.get<ApiResource<AdminOverview>>('/admin/overview').then((r) => r.data),

  users: (filters: AdminUserFilters) => api.get<Paginated<User>>('/admin/users', { params: compact(filters) }),
  user: (id: number) => api.get<ApiResource<User>>(`/admin/users/${id}`).then((r) => r.data),
  updateUser: (id: number, body: { status?: UserStatus; roles?: Role[] }) => api.patch<WithMessage<User>>(`/admin/users/${id}`, body),

  uploadMedia: (file: File, alt?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (alt) form.append('alt', alt)
    return api.post<ApiResource<MediaUpload>>('/admin/media', form).then((r) => r.data)
  },

  // Course editor
  course: (id: number) => api.get<ApiResource<AdminCourse>>(`/admin/courses/${id}`).then((r) => r.data),
  createPlan: (courseId: number, body: Body) => api.post<ApiResource<AdminPlan>>(`/admin/courses/${courseId}/plans`, body),
  updatePlan: (planId: number, body: Body) => api.put<ApiResource<AdminPlan>>(`/admin/plans/${planId}`, body),
  deletePlan: (planId: number) => api.delete<{ message?: string }>(`/admin/plans/${planId}`),
  createSection: (courseId: number, title: string) => api.post<ApiResource<AdminSection>>(`/admin/courses/${courseId}/sections`, { title }),
  updateSection: (sectionId: number, title: string) => api.put<ApiResource<AdminSection>>(`/admin/sections/${sectionId}`, { title }),
  deleteSection: (sectionId: number) => api.delete<{ message?: string }>(`/admin/sections/${sectionId}`),
  reorderSections: (courseId: number, ids: number[]) => api.put(`/admin/courses/${courseId}/sections/order`, { ids }),
  createLesson: (sectionId: number, body: Body) => api.post<ApiResource<AdminLesson>>(`/admin/sections/${sectionId}/lessons`, body),
  updateLesson: (lessonId: number, body: Body) => api.put<ApiResource<AdminLesson>>(`/admin/lessons/${lessonId}`, body),
  deleteLesson: (lessonId: number) => api.delete<{ message?: string }>(`/admin/lessons/${lessonId}`),
  reorderLessons: (sectionId: number, ids: number[]) => api.put(`/admin/sections/${sectionId}/lessons/order`, { ids }),
  uploadAttachment: (lessonId: number, file: File, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    return api.post(`/admin/lessons/${lessonId}/attachments`, form)
  },
  deleteAttachment: (attachmentId: number) => api.delete(`/admin/attachments/${attachmentId}`),

  uploadProductFile: (productId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/admin/products/${productId}/file`, form)
  },

  syncExamQuestions: (examId: number, questions: { id: number; points: number }[]) =>
    api.put(`/admin/exams/${examId}/questions`, { questions }),

  order: (number: string) => api.get<ApiResource<AdminOrder>>(`/admin/orders/${encodeURIComponent(number)}`).then((r) => r.data),
  refundOrder: (number: string, reason: string) =>
    api.post<WithMessage<AdminOrder>>(`/admin/orders/${encodeURIComponent(number)}/refund`, { reason }),

  webhookEvents: (params: ListParams) => api.get<Paginated<AdminWebhookEvent>>('/admin/payments/webhook-events', { params: compact(params) }),
  moderateReview: (id: number, status: 'approved' | 'rejected' | 'pending') => api.patch(`/admin/reviews/${id}`, { status }),
  updateMessage: (id: number, status: string) => api.patch(`/admin/messages/${id}`, { status }),

  settings: () => api.get<ApiResource<AdminSettings>>('/admin/settings').then((r) => r.data),
  updateSettings: (body: Partial<AdminSettings>) => api.put<WithMessage<AdminSettings>>('/admin/settings', body),

  auditLogs: (params: ListParams) => api.get<Paginated<AdminAuditLog>>('/admin/audit-logs', { params: compact(params) }),
}
