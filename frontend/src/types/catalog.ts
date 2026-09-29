export interface MoneyValue {
  amount: number
  amount_minor: number
  currency: string
}

export interface EnumValue<T extends string = string> {
  value: T
  label: string
}

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
export type ProductType = 'ebook' | 'question_bank' | 'bundle' | 'other'
export type LessonType = 'video' | 'text' | 'file' | 'quiz'

export interface CategoryRef {
  id: number
  name: string
  slug: string
}

export interface Category extends CategoryRef {
  description: string | null
  icon: string | null
  parent_id: number | null
  courses_count?: number
  products_count?: number
  children?: Category[]
  parent?: Category | null
  seo: SeoFields
}

export interface SeoFields {
  title: string
  description: string | null
}

export interface InstructorRef {
  name: string
  slug: string
  avatar_url: string | null
}

export interface Instructor extends InstructorRef {
  id: number
  headline: string | null
  courses_count?: number
  bio_html?: string | null
  bio_excerpt?: string | null
}

export interface CoursePlan {
  id: number
  name: string
  duration_days: number | null
  is_default: boolean
  price: MoneyValue
  compare_at_price: MoneyValue | null
  discount_percent: number | null
}

export interface CourseSummary {
  id: number
  slug: string
  title: string
  subtitle: string | null
  cover_url: string | null
  level: EnumValue<CourseLevel>
  is_featured: boolean
  lessons_count: number
  duration_seconds: number
  students_count: number
  rating: { average: number; count: number }
  category?: CategoryRef
  instructor?: InstructorRef | null
  starting_plan?: CoursePlan | null
  published_at: string | null
}

export interface CurriculumLesson {
  id: number
  title: string
  type: EnumValue<LessonType>
  duration_seconds: number
  is_preview: boolean
}

export interface CurriculumSection {
  id: number
  title: string
  lessons_count: number
  duration_seconds: number
  lessons: CurriculumLesson[]
}

export interface CourseDetail extends Omit<CourseSummary, 'instructor'> {
  description_html: string | null
  language: string
  outcomes: string[]
  requirements: string[]
  instructor: Instructor | null
  plans: CoursePlan[]
  curriculum: CurriculumSection[]
  tags: { name: string; slug: string }[]
  seo: SeoFields
  updated_at: string | null
}

export interface LessonPreview {
  id: number
  title: string
  type: EnumValue<LessonType>
  duration_seconds: number
  content_html: string | null
  video_embed_url: string | null
}

export interface Product {
  id: number
  slug: string
  title: string
  subtitle: string | null
  type: EnumValue<ProductType>
  cover_url: string | null
  is_featured: boolean
  price: MoneyValue
  compare_at_price: MoneyValue | null
  discount_percent: number | null
  category?: CategoryRef | null
  description_html?: string | null
  seo?: SeoFields
  published_at: string | null
}

export interface PostSummary {
  id: number
  slug: string
  title: string
  excerpt: string | null
  cover_url: string | null
  reading_minutes: number
  author?: { name: string } | null
  tags?: { name: string; slug: string }[]
  published_at: string | null
  updated_at: string | null
}

export interface Post extends PostSummary {
  body_html: string | null
  seo: SeoFields
}

export interface CmsPage {
  id: number
  slug: string
  title: string
  body_html: string | null
  seo: SeoFields
  updated_at: string | null
}

export interface Faq {
  id: number
  group: string
  question: string
  answer_html: string | null
}

export interface Testimonial {
  id: number
  name: string
  subtitle: string | null
  body: string
  rating: number
  avatar_url: string | null
}

export interface SiteSettings {
  site_name?: string
  tagline?: string
  contact_email?: string | null
  contact_phone?: string | null
  whatsapp?: string | null
  working_hours?: string | null
  social?: Partial<Record<'x' | 'instagram' | 'tiktok' | 'youtube' | 'telegram', string | null>>
}

export interface SearchResults {
  courses: CourseSummary[]
  products: Product[]
  posts: PostSummary[]
}
