import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { catalogApi, contentApi, type CourseFilters, type PostFilters, type ProductFilters } from '@/api/catalog'
import { queryKeys } from '@/api/query-keys'

const LONG = 5 * 60_000

export const useCategories = () =>
  useQuery({ queryKey: queryKeys.catalog.categories, queryFn: catalogApi.categories, staleTime: LONG })

export const useCategory = (slug: string) =>
  useQuery({ queryKey: queryKeys.catalog.category(slug), queryFn: () => catalogApi.category(slug), staleTime: LONG })

export const useCourses = (filters: CourseFilters) =>
  useQuery({
    queryKey: queryKeys.catalog.courses(filters),
    queryFn: () => catalogApi.courses(filters),
    placeholderData: keepPreviousData,
  })

export const useCourse = (slug: string) =>
  useQuery({ queryKey: queryKeys.catalog.course(slug), queryFn: () => catalogApi.course(slug) })

export const useLessonPreview = (slug: string, lessonId: number | null) =>
  useQuery({
    queryKey: queryKeys.catalog.lessonPreview(slug, lessonId ?? 0),
    queryFn: () => catalogApi.lessonPreview(slug, lessonId!),
    enabled: lessonId !== null,
    staleTime: LONG,
  })

export const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: queryKeys.catalog.products(filters),
    queryFn: () => catalogApi.products(filters),
    placeholderData: keepPreviousData,
  })

export const useProduct = (slug: string) =>
  useQuery({ queryKey: queryKeys.catalog.product(slug), queryFn: () => catalogApi.product(slug) })

export const useInstructors = () =>
  useQuery({ queryKey: queryKeys.catalog.instructors, queryFn: catalogApi.instructors, staleTime: LONG })

export const useInstructor = (slug: string) =>
  useQuery({ queryKey: queryKeys.catalog.instructor(slug), queryFn: () => catalogApi.instructor(slug) })

export const useSearch = (q: string) =>
  useQuery({
    queryKey: queryKeys.catalog.search(q),
    queryFn: () => catalogApi.search(q),
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

export const usePosts = (filters: PostFilters) =>
  useQuery({
    queryKey: queryKeys.content.posts(filters),
    queryFn: () => contentApi.posts(filters),
    placeholderData: keepPreviousData,
  })

export const usePost = (slug: string) =>
  useQuery({ queryKey: queryKeys.content.post(slug), queryFn: () => contentApi.post(slug) })

export const useCmsPage = (slug: string) =>
  useQuery({ queryKey: queryKeys.content.page(slug), queryFn: () => contentApi.page(slug), staleTime: LONG })

export const useFaqs = (group?: string) =>
  useQuery({ queryKey: queryKeys.content.faqs(group), queryFn: () => contentApi.faqs(group), staleTime: LONG })

export const useTestimonials = () =>
  useQuery({ queryKey: queryKeys.content.testimonials, queryFn: contentApi.testimonials, staleTime: LONG })

export const useSiteSettings = () =>
  useQuery({ queryKey: queryKeys.content.settings, queryFn: contentApi.settings, staleTime: 30 * 60_000 })
