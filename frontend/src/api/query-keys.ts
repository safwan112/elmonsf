import type { AdminUserFilters } from './admin'
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
  admin: {
    overview: ['admin', 'overview'] as const,
    users: (filters: AdminUserFilters) => ['admin', 'users', filters] as const,
    user: (id: number) => ['admin', 'users', 'detail', id] as const,
  },
}
