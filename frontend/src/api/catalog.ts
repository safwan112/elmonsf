import type { ApiResource, Paginated } from '@/types/api'
import type {
  Category,
  CmsPage,
  CourseDetail,
  CourseLevel,
  CourseSummary,
  Faq,
  Instructor,
  LessonPreview,
  Post,
  PostSummary,
  Product,
  ProductType,
  SearchResults,
  SiteSettings,
  Testimonial,
} from '@/types/catalog'
import { api } from './client'

export type CourseSort = 'relevance' | 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc'
export type ProductSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc'

export interface CourseFilters {
  search?: string
  category?: string
  instructor?: string
  level?: CourseLevel
  min_price?: number
  max_price?: number
  featured?: boolean
  sort?: CourseSort
  page?: number
  per_page?: number
}

export interface ProductFilters {
  search?: string
  category?: string
  type?: ProductType
  featured?: boolean
  sort?: ProductSort
  page?: number
  per_page?: number
}

export interface PostFilters {
  search?: string
  tag?: string
  page?: number
  per_page?: number
}

/** Drop empty values and encode booleans as 1/0 for Laravel. */
function params<T extends object>(filters: T) {
  return Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
      .map(([k, v]) => [k, v === true ? 1 : v]),
  )
}

const slugPath = (slug: string) => encodeURIComponent(slug)

export const catalogApi = {
  categories: () => api.get<{ data: Category[] }>('/categories').then((r) => r.data),
  category: (slug: string) => api.get<ApiResource<Category>>(`/categories/${slugPath(slug)}`).then((r) => r.data),

  courses: (filters: CourseFilters) => api.get<Paginated<CourseSummary>>('/courses', { params: params(filters) }),
  course: (slug: string) =>
    api.get<ApiResource<CourseDetail> & { related: CourseSummary[] }>(`/courses/${slugPath(slug)}`),
  lessonPreview: (slug: string, lessonId: number) =>
    api.get<ApiResource<LessonPreview>>(`/courses/${slugPath(slug)}/lessons/${lessonId}/preview`).then((r) => r.data),

  products: (filters: ProductFilters) => api.get<Paginated<Product>>('/products', { params: params(filters) }),
  product: (slug: string) => api.get<ApiResource<Product> & { related: Product[] }>(`/products/${slugPath(slug)}`),

  instructors: () => api.get<{ data: Instructor[] }>('/instructors').then((r) => r.data),
  instructor: (slug: string) =>
    api.get<ApiResource<Instructor> & { courses: CourseSummary[] }>(`/instructors/${slugPath(slug)}`),

  search: (q: string) =>
    api.get<{ data: SearchResults; meta: { query: string; total: number } }>('/search', { params: { q } }),
}

export const contentApi = {
  posts: (filters: PostFilters) => api.get<Paginated<PostSummary>>('/posts', { params: params(filters) }),
  post: (slug: string) => api.get<ApiResource<Post> & { more: PostSummary[] }>(`/posts/${slugPath(slug)}`),
  page: (slug: string) => api.get<ApiResource<CmsPage>>(`/pages/${slugPath(slug)}`).then((r) => r.data),
  faqs: (group?: string) => api.get<{ data: Faq[] }>('/faqs', { params: params({ group }) }).then((r) => r.data),
  testimonials: () => api.get<{ data: Testimonial[] }>('/testimonials').then((r) => r.data),
  settings: () => api.get<{ data: SiteSettings }>('/settings').then((r) => r.data),

  contact: (payload: { name: string; email: string; phone?: string; subject: string; message: string; website?: string }) =>
    api.post<{ message: string }>('/contact', payload),
  subscribe: (email: string) => api.post<{ message: string }>('/newsletter/subscribe', { email }),
}
