import type { EnumValue, MoneyValue } from './catalog'
import type { Order } from './commerce'
import type { Role } from './user'

export type PublishStatusValue = 'draft' | 'published' | 'archived'

export interface AdminOverview {
  users: { total: number; active: number; new_last_30_days: number; by_role: Record<Role, number> }
  sales?: {
    currency: string
    revenue_total: number
    revenue_last_30_days: number
    paid_orders_last_30_days: number
    pending_orders: number
    daily: { date: string; revenue: number; orders: number }[]
    top_courses: { course_id: number; title: string; sales: number; revenue: number }[]
  }
  learning?: { active_enrollments: number }
  attention?: { pending_reviews: number; new_messages: number; payments_needing_review: number }
}

export interface MediaUpload {
  id: number
  url: string
  width: number | null
  height: number | null
  size_bytes: number
  alt: string | null
}

export interface AdminCategory {
  id: number
  parent_id: number | null
  name: string
  slug: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  seo_title: string | null
  seo_description: string | null
  courses_count: number
  products_count: number
  children_count: number
}

export interface AdminInstructor {
  id: number
  name: string
  slug: string
  headline: string | null
  bio: string | null
  avatar_url: string | null
  is_active: boolean
  sort_order: number
  courses_count: number
  user: { id: number; name: string; email: string } | null
}

export interface AdminPlan {
  id: number
  name: string
  duration_days: number | null
  price: number
  compare_at_price: number | null
  currency: string
  is_active: boolean
  is_default: boolean
  sort_order: number
}

export interface AdminLesson {
  id: number
  section_id: number
  title: string
  type: 'video' | 'text' | 'file' | 'quiz'
  content: string | null
  video_provider: 'youtube' | 'vimeo' | 'bunny' | null
  video_ref: string | null
  duration_seconds: number
  is_preview: boolean
  is_published: boolean
  sort_order: number
  attachments: { id: number; title: string; size_bytes: number; mime_type: string | null }[]
}

export interface AdminSection {
  id: number
  title: string
  sort_order: number
  lessons: AdminLesson[]
}

export interface AdminCourseRow {
  id: number
  title: string
  slug: string
  status: EnumValue<PublishStatusValue>
  is_featured: boolean
  cover_url: string | null
  category: { id: number; name: string } | null
  instructor: { id: number; name: string } | null
  lessons_count: number
  students_count: number
  published_at: string | null
  updated_at: string | null
}

export interface AdminCourse extends AdminCourseRow {
  category_id: number
  instructor_id: number | null
  subtitle: string | null
  description: string | null
  level: string
  language: string
  outcomes: string[]
  requirements: string[]
  seo_title: string | null
  seo_description: string | null
  tags: string[]
  plans: AdminPlan[]
  sections: AdminSection[]
}

export interface AdminProduct {
  id: number
  title: string
  slug: string
  type: EnumValue<'ebook' | 'question_bank' | 'bundle' | 'other'>
  category_id: number | null
  category: { id: number; name: string } | null
  subtitle: string | null
  description: string | null
  price: number
  compare_at_price: number | null
  currency: string
  status: EnumValue<PublishStatusValue>
  published_at: string | null
  is_featured: boolean
  cover_url: string | null
  has_file: boolean
  seo_title: string | null
  seo_description: string | null
  updated_at: string | null
}

export interface AdminCoupon {
  id: number
  code: string
  description: string | null
  type: 'percent' | 'fixed'
  value: number
  max_discount: number | null
  min_subtotal: number | null
  applies_to: 'all' | 'courses' | 'products'
  starts_at: string | null
  expires_at: string | null
  usage_limit: number | null
  usage_limit_per_user: number | null
  used_count: number
  redemptions_count: number
  is_active: boolean
}

export interface AdminQuestionBank {
  id: number
  title: string
  description: string | null
  category_id: number | null
  course_id: number | null
  product_id: number | null
  category: { id: number; name: string } | null
  course: { id: number; title: string } | null
  product: { id: number; title: string } | null
  is_active: boolean
  sort_order: number
  questions_count: number
}

export interface AdminQuestionOption {
  id?: number
  body: string
  is_correct: boolean
}

export interface AdminQuestion {
  id: number
  question_bank_id: number
  bank: { id: number; title: string } | null
  body: string
  explanation: string | null
  difficulty: EnumValue<'easy' | 'medium' | 'hard'>
  topic: string | null
  is_active: boolean
  sort_order: number
  options: AdminQuestionOption[]
}

export interface AdminExam {
  id: number
  title: string
  description: string | null
  course_id: number | null
  product_id: number | null
  category_id: number | null
  course: { id: number; title: string } | null
  product: { id: number; title: string } | null
  duration_minutes: number | null
  pass_percent: number
  max_attempts: number | null
  shuffle_questions: boolean
  shuffle_options: boolean
  show_answers: boolean
  status: EnumValue<PublishStatusValue>
  published_at: string | null
  sort_order: number
  questions_count: number
  attempts_count: number
  questions?: { id: number; body: string; topic: string | null; difficulty: EnumValue; points: number; is_active: boolean }[]
}

export interface AdminPayment {
  id: number
  provider: string
  status: EnumValue
  amount: MoneyValue
  provider_invoice_id: string | null
  provider_payment_id: string | null
  is_duplicate: boolean
  failure_reason: string | null
  order: { number: string; billing_name: string; billing_email: string } | null
  verified_at: string | null
  paid_at: string | null
  created_at: string | null
}

export interface AdminWebhookEvent {
  id: number
  provider: string
  event_type: string | null
  provider_invoice_id: string | null
  provider_payment_id: string | null
  signature_valid: boolean
  status: 'received' | 'processed' | 'ignored' | 'failed'
  error: string | null
  processed_at: string | null
  created_at: string | null
}

export interface AdminOrder extends Order {
  user?: { id: number; name: string; email: string }
}

export interface AdminReview {
  id: number
  rating: number
  comment: string | null
  status: EnumValue<'pending' | 'approved' | 'rejected'>
  user: { id: number; name: string; email: string } | null
  course: { id: number; title: string; slug: string } | null
  created_at: string | null
  moderated_at: string | null
}

export interface AdminPost {
  id: number
  title: string
  slug: string
  excerpt: string | null
  body: string
  cover_url: string | null
  status: EnumValue<PublishStatusValue>
  published_at: string | null
  reading_minutes: number
  author: { id: number; name: string } | null
  tags: string[]
  seo_title: string | null
  seo_description: string | null
  updated_at: string | null
}

export interface AdminPage {
  id: number
  title: string
  slug: string
  body: string
  status: EnumValue<PublishStatusValue>
  seo_title: string | null
  seo_description: string | null
  updated_at: string | null
}

export interface AdminFaq {
  id: number
  group: string
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

export interface AdminTestimonial {
  id: number
  name: string
  subtitle: string | null
  body: string
  rating: number
  avatar_url: string | null
  sort_order: number
  is_active: boolean
}

export interface AdminMessage {
  id: number
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: 'new' | 'read' | 'replied' | 'archived'
  created_at: string | null
}

export interface AdminSettings {
  site_name: string | null
  tagline: string | null
  announcement: string | null
  contact_email: string | null
  contact_phone: string | null
  whatsapp: string | null
  working_hours: string | null
  social: Partial<Record<'x' | 'instagram' | 'tiktok' | 'youtube' | 'telegram' | 'snapchat', string | null>> | null
  legal_name: string | null
  vat_number: string | null
  address: string | null
}

export interface AdminAuditLog {
  id: number
  action: string
  actor: { id: number; name: string; email: string } | null
  subject_type: string | null
  subject_id: number | null
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, unknown> | null
  created_at: string | null
}

export const publishStatusOptions = [
  { value: 'draft', label: 'مسودة' },
  { value: 'published', label: 'منشور' },
  { value: 'archived', label: 'مؤرشف' },
]
