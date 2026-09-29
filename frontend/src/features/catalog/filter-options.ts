import type { CourseSort } from '@/api/catalog'
import type { CourseLevel } from '@/types/catalog'

export const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدم' },
  { value: 'all_levels', label: 'جميع المستويات' },
]

export const COURSE_SORTS: { value: CourseSort; label: string }[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'popular', label: 'الأكثر طلاباً' },
  { value: 'rating', label: 'الأعلى تقييماً' },
  { value: 'price_asc', label: 'السعر: من الأقل' },
  { value: 'price_desc', label: 'السعر: من الأعلى' },
]
