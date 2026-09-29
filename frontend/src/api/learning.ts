import type { ApiResource, Paginated } from '@/types/api'
import type {
  Attempt,
  CoursePlayer,
  ExamDetail,
  ExamSummary,
  LessonDetail,
  LessonProgressResult,
  PracticeFeedback,
  PracticeFilters,
  PracticeQuestion,
  QuestionBankDetail,
  QuestionBankSummary,
} from '@/types/learning'
import { api } from './client'

const data = <T>(r: ApiResource<T>) => r.data

export const learningApi = {
  coursePlayer: (courseId: number) => api.get<ApiResource<CoursePlayer>>(`/learning/courses/${courseId}`).then(data),
  lesson: (lessonId: number) => api.get<ApiResource<LessonDetail>>(`/learning/lessons/${lessonId}`).then(data),
  saveProgress: (lessonId: number, body: { completed?: boolean; position_seconds?: number }) =>
    api.post<ApiResource<LessonProgressResult>>(`/learning/lessons/${lessonId}/progress`, body),
  attachmentUrl: (attachmentId: number) => `/api/v1/learning/attachments/${attachmentId}`,

  exams: () => api.get<ApiResource<ExamSummary[]>>('/exams').then(data),
  exam: (examId: number) => api.get<ApiResource<ExamDetail>>(`/exams/${examId}`).then(data),
  startExam: (examId: number) => api.post<ApiResource<Attempt>>(`/exams/${examId}/attempts`).then(data),
  attempt: (attemptId: number) => api.get<ApiResource<Attempt>>(`/attempts/${attemptId}`).then(data),
  saveAnswer: (attemptId: number, body: { question_id: number; option_id?: number | null; flagged?: boolean }) =>
    api.put<ApiResource<{ question_id: number; option_id: number | null; is_flagged: boolean }>>(`/attempts/${attemptId}/answers`, body).then(data),
  submitAttempt: (attemptId: number) => api.post<ApiResource<Attempt>>(`/attempts/${attemptId}/submit`).then(data),

  banks: () => api.get<ApiResource<QuestionBankSummary[]>>('/question-banks').then(data),
  bank: (bankId: number) => api.get<ApiResource<QuestionBankDetail>>(`/question-banks/${bankId}`).then(data),
  bankQuestions: (bankId: number, filters: PracticeFilters) =>
    api.get<Paginated<PracticeQuestion>>(`/question-banks/${bankId}/questions`, {
      params: { ...filters, status: filters.status === 'all' ? undefined : filters.status },
    }),
  answerPractice: (bankId: number, questionId: number, optionId: number) =>
    api
      .post<ApiResource<PracticeFeedback & { question_id: number }>>(`/question-banks/${bankId}/questions/${questionId}/answer`, {
        option_id: optionId,
      })
      .then(data),
}
