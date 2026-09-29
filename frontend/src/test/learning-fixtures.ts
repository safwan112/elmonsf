import type { Attempt, CoursePlayer, ExamDetail, LessonDetail, PracticeQuestion, QuestionBankDetail, QuestionBankSummary } from '@/types/learning'
import { courseSummary } from './catalog-fixtures'

const video = { value: 'video' as const, label: 'فيديو' }

export function coursePlayer(overrides: Partial<CoursePlayer> = {}): CoursePlayer {
  return {
    course: courseSummary(),
    enrollment: { expires_at: '2026-12-19T10:00:00+00:00', is_active: true },
    progress: { completed: 1, total: 3, percent: 33, last_lesson_id: 102 },
    next_lesson_id: 102,
    curriculum: [
      {
        id: 1,
        title: 'البداية',
        lessons: [
          { id: 101, title: 'مقدمة الدورة', type: video, duration_seconds: 300, is_completed: true },
          { id: 102, title: 'النسبة والتناسب', type: video, duration_seconds: 600, is_completed: false },
        ],
      },
      { id: 2, title: 'الجبر', lessons: [{ id: 103, title: 'المعادلات', type: video, duration_seconds: 540, is_completed: false }] },
    ],
    exams: [{ id: 7, title: 'اختبار محاكٍ', duration_minutes: 15, questions_count: 10 }],
    ...overrides,
  }
}

export function lessonDetail(overrides: Partial<LessonDetail> = {}): LessonDetail {
  return {
    id: 102,
    title: 'النسبة والتناسب',
    type: video,
    duration_seconds: 600,
    content_html: '<p>ملخص درس التناسب</p>',
    video_embed_url: null,
    attachments: [{ id: 5, title: 'ورقة عمل', mime_type: 'application/pdf', size_bytes: 20480 }],
    course: { id: 1, title: 'تأسيس القسم الكمي', slug: 'تأسيس-الكمي' },
    section: { id: 1, title: 'البداية' },
    is_enrolled: true,
    prev_lesson_id: 101,
    next_lesson_id: 103,
    progress: { completed_at: null, position_seconds: 0 },
    ...overrides,
  }
}

export function examDetail(overrides: Partial<ExamDetail> = {}): ExamDetail {
  return {
    id: 7,
    title: 'اختبار محاكٍ',
    duration_minutes: 15,
    pass_percent: 60,
    questions_count: 2,
    max_attempts: 3,
    course: { id: 1, title: 'تأسيس القسم الكمي', slug: 'تأسيس-الكمي' },
    is_free: false,
    description_html: '<p>محاكاة للقسم الكمي</p>',
    stats: { attempts_used: 0, attempts_left: 3, best_percent: null, passed: false, in_progress_attempt_id: null },
    attempts: [],
    ...overrides,
  }
}

const easy = { value: 'easy' as const, label: 'سهل' }

export function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: 55,
    status: { value: 'in_progress', label: 'قيد الحل' },
    exam: { id: 7, title: 'اختبار محاكٍ', duration_minutes: 15, pass_percent: 60, show_answers: true },
    started_at: '2026-09-29T10:00:00+00:00',
    deadline_at: '2026-09-29T10:15:00+00:00',
    remaining_seconds: 900,
    submitted_at: null,
    answered_count: 0,
    questions_count: 2,
    result: null,
    questions: [
      {
        id: 1,
        number: 1,
        points: 1,
        body_html: '<p>ما قيمة س إذا كان 3س + 7 = 22؟</p>',
        difficulty: easy,
        options: [
          { id: 11, body: '3' },
          { id: 12, body: '5' },
        ],
        answer: { option_id: null, is_flagged: false },
      },
      {
        id: 2,
        number: 2,
        points: 1,
        body_html: '<p>ما 25٪ من 360؟</p>',
        difficulty: easy,
        options: [
          { id: 21, body: '90' },
          { id: 22, body: '72' },
        ],
        answer: { option_id: null, is_flagged: false },
      },
    ],
    ...overrides,
  }
}

/** The same attempt, submitted: 1 of 2 correct. */
export function gradedAttempt(): Attempt {
  const base = attempt()
  return {
    ...base,
    status: { value: 'submitted', label: 'مُسلَّم' },
    remaining_seconds: null,
    submitted_at: '2026-09-29T10:05:00+00:00',
    answered_count: 2,
    result: { score_points: 1, max_points: 2, percent: 50, passed: false, correct_count: 1 },
    questions: [
      { ...base.questions[0]!, answer: { option_id: 12, is_flagged: false }, is_correct: true, correct_option_id: 12, explanation_html: '<p>3س = 15</p>' },
      { ...base.questions[1]!, answer: { option_id: 22, is_flagged: false }, is_correct: false, correct_option_id: 21, explanation_html: '<p>الربع = 90</p>' },
    ],
  }
}

export function bankSummary(overrides: Partial<QuestionBankSummary> = {}): QuestionBankSummary {
  return {
    id: 3,
    title: 'بنك مجاني',
    category: { id: 1, name: 'القدرات' },
    questions_count: 7,
    is_free: true,
    is_unlocked: true,
    unlock: null,
    stats: { answered: 2, correct: 1 },
    ...overrides,
  }
}

export function bankDetail(overrides: Partial<QuestionBankDetail> = {}): QuestionBankDetail {
  return {
    ...bankSummary(),
    description_html: null,
    topics: [
      { name: 'الجبر', questions_count: 3 },
      { name: 'الهندسة', questions_count: 4 },
    ],
    ...overrides,
  }
}

export function practiceQuestion(overrides: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return {
    id: 31,
    body_html: '<p>قلم : كتابة</p>',
    difficulty: easy,
    topic: 'التناظر اللفظي',
    options: [
      { id: 311, body: 'مقص : قص' },
      { id: 312, body: 'ورقة : شجرة' },
    ],
    practice: null,
    ...overrides,
  }
}
