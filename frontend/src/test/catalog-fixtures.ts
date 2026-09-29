import type { CourseDetail, CourseSummary, Product } from '@/types/catalog'

const money = (amount: number) => ({ amount, amount_minor: Math.round(amount * 100), currency: 'SAR' })

export const plan3 = {
  id: 11,
  name: '3 أشهر',
  duration_days: 90,
  is_default: false,
  price: money(199),
  compare_at_price: money(299),
  discount_percent: 33,
}
export const plan6 = { id: 12, name: '6 أشهر', duration_days: 180, is_default: true, price: money(299), compare_at_price: null, discount_percent: null }

export function courseSummary(overrides: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: 1,
    slug: 'تأسيس-الكمي',
    title: 'تأسيس القسم الكمي',
    subtitle: 'ابدأ من الأساس',
    cover_url: null,
    level: { value: 'beginner', label: 'مبتدئ' },
    is_featured: true,
    lessons_count: 20,
    duration_seconds: 15_300,
    students_count: 1840,
    rating: { average: 4.8, count: 312 },
    category: { id: 2, name: 'القسم الكمي', slug: 'qudurat-quant' },
    instructor: { name: 'أ. سارة', slug: 'sara', avatar_url: null },
    starting_plan: plan3,
    published_at: '2026-09-01T00:00:00+00:00',
    ...overrides,
  }
}

export function courseDetail(overrides: Partial<CourseDetail> = {}): CourseDetail {
  const { instructor: _ignored, ...summary } = courseSummary()
  return {
    ...summary,
    description_html: '<h2>عن الدورة</h2><p>وصف الدورة</p>',
    language: 'ar',
    outcomes: ['إتقان الحساب الذهني', 'حل المعادلات'],
    requirements: ['لا يلزم تحضير مسبق'],
    instructor: { id: 5, name: 'أ. سارة', slug: 'sara', avatar_url: null, headline: 'مدرّبة الكمي', bio_html: '<p>نبذة</p>', courses_count: 2 },
    plans: [plan3, plan6],
    curriculum: [
      {
        id: 100,
        title: 'الحساب الذهني',
        lessons_count: 2,
        duration_seconds: 900,
        lessons: [
          { id: 1000, title: 'مقدمة الوحدة', type: { value: 'text', label: 'درس مقروء' }, duration_seconds: 300, is_preview: true },
          { id: 1001, title: 'تدريبات محلولة', type: { value: 'video', label: 'فيديو' }, duration_seconds: 600, is_preview: false },
        ],
      },
    ],
    tags: [],
    seo: { title: 'تأسيس القسم الكمي', description: 'وصف قصير' },
    updated_at: '2026-09-02T00:00:00+00:00',
    ...overrides,
  }
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 7,
    slug: 'بنك-الكمي',
    title: 'بنك أسئلة الكمي',
    subtitle: '1500 سؤال',
    type: { value: 'question_bank', label: 'بنك أسئلة' },
    cover_url: null,
    is_featured: true,
    price: money(79),
    compare_at_price: money(119),
    discount_percent: 34,
    category: null,
    published_at: '2026-09-01T00:00:00+00:00',
    ...overrides,
  }
}

export function page<T>(data: T[], total = data.length) {
  return {
    data,
    meta: { current_page: 1, from: data.length ? 1 : null, last_page: Math.max(1, Math.ceil(total / 12)), per_page: 12, to: data.length || null, total, path: '' },
    links: { first: null, last: null, prev: null, next: null },
  }
}
