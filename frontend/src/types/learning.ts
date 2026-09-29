import type { CourseSummary, EnumValue, LessonType } from './catalog'

export interface CourseProgressSummary {
  completed: number
  total: number
  percent: number
  last_lesson_id: number | null
}

export interface PlayerLesson {
  id: number
  title: string
  type: EnumValue<LessonType>
  duration_seconds: number
  is_completed: boolean
}

export interface PlayerSection {
  id: number
  title: string
  lessons: PlayerLesson[]
}

export interface CoursePlayer {
  course: CourseSummary
  enrollment: { expires_at: string | null; is_active: boolean } | null
  progress: CourseProgressSummary
  next_lesson_id: number | null
  curriculum: PlayerSection[]
  exams: { id: number; title: string; duration_minutes: number | null; questions_count: number }[]
}

export interface LessonDetail {
  id: number
  title: string
  type: EnumValue<LessonType>
  duration_seconds: number
  content_html: string | null
  video_embed_url: string | null
  attachments: { id: number; title: string; mime_type: string | null; size_bytes: number }[]
  course: { id: number; title: string; slug: string }
  section: { id: number; title: string }
  is_enrolled: boolean
  prev_lesson_id: number | null
  next_lesson_id: number | null
  progress: { completed_at: string | null; position_seconds: number }
}

export interface LessonProgressResult {
  lesson_id: number
  completed_at: string | null
  position_seconds: number
  course_progress: CourseProgressSummary
}

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired'

export interface ExamStats {
  attempts_used: number
  attempts_left: number | null
  best_percent: number | null
  passed: boolean
  in_progress_attempt_id: number | null
}

export interface ExamSummary {
  id: number
  title: string
  duration_minutes: number | null
  pass_percent: number
  questions_count: number
  max_attempts: number | null
  course: { id: number; title: string; slug: string } | null
  is_free: boolean
  stats: ExamStats
}

export interface ExamDetail extends ExamSummary {
  description_html: string | null
  attempts: {
    id: number
    status: EnumValue<AttemptStatus>
    started_at: string
    submitted_at: string | null
    percent: number | null
    passed: boolean | null
  }[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface AttemptQuestion {
  id: number
  number: number
  points: number
  body_html: string
  difficulty: EnumValue<Difficulty>
  options: { id: number; body: string }[]
  answer: { option_id: number | null; is_flagged: boolean }
  // Present after submitting when the exam allows reviewing answers.
  is_correct?: boolean
  correct_option_id?: number | null
  explanation_html?: string | null
}

export interface Attempt {
  id: number
  status: EnumValue<AttemptStatus>
  exam: { id: number; title: string; duration_minutes: number | null; pass_percent: number; show_answers: boolean }
  started_at: string
  deadline_at: string | null
  remaining_seconds: number | null
  submitted_at: string | null
  answered_count: number
  questions_count: number
  result: { score_points: number; max_points: number; percent: number; passed: boolean; correct_count: number } | null
  questions: AttemptQuestion[]
}

export interface QuestionBankSummary {
  id: number
  title: string
  category: { id: number; name: string } | null
  questions_count: number
  is_free: boolean
  is_unlocked: boolean
  unlock: {
    course: { id: number; title: string; slug: string } | null
    product: { id: number; title: string; slug: string } | null
  } | null
  stats: { answered: number; correct: number }
}

export interface QuestionBankDetail extends QuestionBankSummary {
  description_html: string | null
  topics: { name: string; questions_count: number }[]
}

export interface PracticeFeedback {
  selected_option_id: number | null
  is_correct: boolean
  correct_option_id: number | null
  explanation_html: string | null
  attempts?: number
}

export interface PracticeQuestion {
  id: number
  body_html: string
  difficulty: EnumValue<Difficulty>
  topic: string | null
  options: { id: number; body: string }[]
  practice: PracticeFeedback | null
}

export interface PracticeFilters {
  topic?: string
  difficulty?: Difficulty
  status?: 'all' | 'unanswered' | 'incorrect' | 'correct'
  page?: number
}
