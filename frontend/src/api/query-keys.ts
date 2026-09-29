import type { AdminUserFilters } from './admin'
import type { PracticeFilters } from '@/types/learning'
import type { CourseFilters, PostFilters, ProductFilters } from './catalog'

/** Central registry of TanStack Query keys. */
export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  account: {
    sessions: ['account', 'sessions'] as const,
  },
  catalog: {
    categories: ['catalog', 'categories'] as const,
    category: (slug: string) => ['catalog', 'categories', slug] as const,
    courses: (filters: CourseFilters) => ['catalog', 'courses', filters] as const,
    course: (slug: string) => ['catalog', 'course', slug] as const,
    lessonPreview: (slug: string, id: number) => ['catalog', 'course', slug, 'preview', id] as const,
    products: (filters: ProductFilters) => ['catalog', 'products', filters] as const,
    product: (slug: string) => ['catalog', 'product', slug] as const,
    instructors: ['catalog', 'instructors'] as const,
    instructor: (slug: string) => ['catalog', 'instructors', slug] as const,
    search: (q: string) => ['catalog', 'search', q] as const,
  },
  content: {
    posts: (filters: PostFilters) => ['content', 'posts', filters] as const,
    post: (slug: string) => ['content', 'post', slug] as const,
    page: (slug: string) => ['content', 'page', slug] as const,
    faqs: (group?: string) => ['content', 'faqs', group ?? 'all'] as const,
    testimonials: ['content', 'testimonials'] as const,
    settings: ['content', 'settings'] as const,
  },
  commerce: {
    cart: ['commerce', 'cart'] as const,
    orders: (page: number) => ['commerce', 'orders', page] as const,
    order: (number: string) => ['commerce', 'order', number] as const,
    invoices: ['commerce', 'invoices'] as const,
    invoice: (number: string) => ['commerce', 'invoice', number] as const,
    enrollments: ['commerce', 'enrollments'] as const,
  },
  learning: {
    player: (courseId: number) => ['learning', 'player', courseId] as const,
    lesson: (lessonId: number) => ['learning', 'lesson', lessonId] as const,
    exams: ['learning', 'exams'] as const,
    exam: (examId: number) => ['learning', 'exams', examId] as const,
    attempt: (attemptId: number) => ['learning', 'attempt', attemptId] as const,
    // Kept disjoint: refreshing a bank's stats must not refetch (and reset)
    // the practice page the student is working on.
    banks: ['learning', 'banks'] as const,
    bank: (bankId: number) => ['learning', 'bank', bankId] as const,
    bankQuestions: (bankId: number, filters: PracticeFilters) => ['learning', 'bank-questions', bankId, filters] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
    /** Any admin resource list/detail: ['admin', resource, ...]. */
    resource: (resource: string, ...rest: unknown[]) => ['admin', resource, ...rest] as const,
    course: (id: number) => ['admin', 'courses', 'detail', id] as const,
    order: (number: string) => ['admin', 'orders', 'detail', number] as const,
    settings: ['admin', 'settings'] as const,
  },
}
