import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { learningApi } from '@/api/learning'
import { queryKeys } from '@/api/query-keys'
import type { Attempt, LessonDetail, PracticeFilters, PracticeQuestion } from '@/types/learning'
import type { Paginated } from '@/types/api'

export const useCoursePlayer = (courseId: number) =>
  useQuery({ queryKey: queryKeys.learning.player(courseId), queryFn: () => learningApi.coursePlayer(courseId), enabled: courseId > 0 })

export const useLesson = (lessonId: number) =>
  useQuery({ queryKey: queryKeys.learning.lesson(lessonId), queryFn: () => learningApi.lesson(lessonId), enabled: lessonId > 0 })

/** Mark a lesson (in)complete; refreshes the player, dashboard and enrollment progress. */
export function useLessonCompletion(lesson: LessonDetail | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (completed: boolean) => learningApi.saveProgress(lesson!.id, { completed }),
    onSuccess: (res) => {
      queryClient.setQueryData<LessonDetail>(queryKeys.learning.lesson(res.data.lesson_id), (old) =>
        old ? { ...old, progress: { ...old.progress, completed_at: res.data.completed_at } } : old,
      )
      if (lesson) void queryClient.invalidateQueries({ queryKey: queryKeys.learning.player(lesson.course.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.commerce.enrollments })
    },
  })
}

export const useExams = () => useQuery({ queryKey: queryKeys.learning.exams, queryFn: learningApi.exams })

export const useExam = (examId: number) =>
  useQuery({ queryKey: queryKeys.learning.exam(examId), queryFn: () => learningApi.exam(examId), enabled: examId > 0 })

export function useStartExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (examId: number) => learningApi.startExam(examId),
    onSuccess: (attempt) => {
      queryClient.setQueryData(queryKeys.learning.attempt(attempt.id), attempt)
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.exams })
    },
  })
}

export const useAttempt = (attemptId: number) =>
  useQuery({ queryKey: queryKeys.learning.attempt(attemptId), queryFn: () => learningApi.attempt(attemptId), enabled: attemptId > 0 })

/**
 * Autosave an answer or flag. The cache is updated optimistically so the
 * exam UI stays instant; failures roll back and surface to the caller.
 */
export function useSaveAnswer(attemptId: number) {
  const queryClient = useQueryClient()
  const key = queryKeys.learning.attempt(attemptId)

  return useMutation({
    mutationFn: (body: { question_id: number; option_id?: number | null; flagged?: boolean }) => learningApi.saveAnswer(attemptId, body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Attempt>(key)
      queryClient.setQueryData<Attempt>(key, (old) => {
        if (!old) return old
        const questions = old.questions.map((q) =>
          q.id !== body.question_id
            ? q
            : {
                ...q,
                answer: {
                  option_id: body.option_id !== undefined ? body.option_id : q.answer.option_id,
                  is_flagged: body.flagged ?? q.answer.is_flagged,
                },
              },
        )
        return { ...old, questions, answered_count: questions.filter((q) => q.answer.option_id !== null).length }
      })
      return { previous }
    },
    onError: (_err, _body, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    meta: { silentError: true },
  })
}

export function useSubmitAttempt(attemptId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => learningApi.submitAttempt(attemptId),
    onSuccess: (attempt) => {
      queryClient.setQueryData(queryKeys.learning.attempt(attemptId), attempt)
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.exams })
    },
  })
}

export const useQuestionBanks = () => useQuery({ queryKey: queryKeys.learning.banks, queryFn: learningApi.banks })

export const useQuestionBank = (bankId: number) =>
  useQuery({ queryKey: queryKeys.learning.bank(bankId), queryFn: () => learningApi.bank(bankId), enabled: bankId > 0 })

export const useBankQuestions = (bankId: number, filters: PracticeFilters) =>
  useQuery({
    queryKey: queryKeys.learning.bankQuestions(bankId, filters),
    queryFn: () => learningApi.bankQuestions(bankId, filters),
    enabled: bankId > 0,
    placeholderData: keepPreviousData,
  })

/** Answer a practice question; the feedback is written into the cached page. */
export function useAnswerPractice(bankId: number, filters: PracticeFilters) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, optionId }: { questionId: number; optionId: number }) =>
      learningApi.answerPractice(bankId, questionId, optionId),
    onSuccess: (feedback) => {
      queryClient.setQueryData<Paginated<PracticeQuestion>>(queryKeys.learning.bankQuestions(bankId, filters), (old) =>
        old
          ? {
              ...old,
              data: old.data.map((q) =>
                q.id === feedback.question_id
                  ? { ...q, practice: { ...feedback, attempts: (q.practice?.attempts ?? 0) + 1 } }
                  : q,
              ),
            }
          : old,
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.bank(bankId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.learning.banks })
    },
  })
}
