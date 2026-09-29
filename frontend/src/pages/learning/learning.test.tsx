import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { student } from '@/test/fixtures'
import {
  attempt,
  bankDetail,
  bankSummary,
  coursePlayer,
  examDetail,
  gradedAttempt,
  lessonDetail,
  practiceQuestion,
} from '@/test/learning-fixtures'
import { renderApp } from '@/test/render'
import { API, emptyPage, http, HttpResponse, server, signInAs } from '@/test/server'

const locked = () =>
  HttpResponse.json({ message: 'هذا المحتوى متاح للمشتركين فقط. اشترك للوصول إليه.', code: 'content_locked' }, { status: 403 })

describe('course player and lessons', () => {
  it('shows progress, the curriculum and a resume link', async () => {
    signInAs(student)
    server.use(http.get(`${API}/learning/courses/1`, () => HttpResponse.json({ data: coursePlayer() })))
    renderApp('/dashboard/courses/1')

    expect(await screen.findByRole('heading', { level: 1, name: 'تأسيس القسم الكمي' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'نسبة إكمال الدورة' })).toHaveAttribute('aria-valuenow', '33')
    expect(screen.getByRole('link', { name: /متابعة التعلّم/ })).toHaveAttribute('href', '/dashboard/lessons/102')
    expect(screen.getByRole('link', { name: /المعادلات/ })).toHaveAttribute('href', '/dashboard/lessons/103')
    expect(screen.getByLabelText('مكتمل')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /اختبار محاكٍ/ })).toHaveAttribute('href', '/dashboard/exams/7')
  })

  it('offers a subscription path when the course is locked', async () => {
    signInAs(student)
    server.use(http.get(`${API}/learning/courses/1`, locked))
    renderApp('/dashboard/courses/1')

    expect(await screen.findByText('هذا المحتوى للمشتركين')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تصفّح الدورات' })).toBeInTheDocument()
  })

  it('renders a lesson and marks it complete', async () => {
    signInAs(student)
    const posted: unknown[] = []
    server.use(
      http.get(`${API}/learning/lessons/102`, () => HttpResponse.json({ data: lessonDetail() })),
      http.get(`${API}/learning/courses/1`, () => HttpResponse.json({ data: coursePlayer() })),
      http.post(`${API}/learning/lessons/102/progress`, async ({ request }) => {
        posted.push(await request.json())
        return HttpResponse.json({
          message: 'أحسنت! تم تسجيل إكمال الدرس.',
          data: {
            lesson_id: 102,
            completed_at: '2026-09-29T10:00:00+00:00',
            position_seconds: 0,
            course_progress: { completed: 2, total: 3, percent: 66, last_lesson_id: 102 },
          },
        })
      }),
    )
    const { user } = renderApp('/dashboard/lessons/102')

    expect(await screen.findByRole('heading', { level: 1, name: 'النسبة والتناسب' })).toBeInTheDocument()
    expect(screen.getByText('ملخص درس التناسب')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ورقة عمل/ })).toHaveAttribute('href', '/api/v1/learning/attachments/5')
    expect(screen.getByRole('link', { name: /التالي/ })).toHaveAttribute('href', '/dashboard/lessons/103')

    await user.click(screen.getByRole('button', { name: 'تحديد كمكتمل' }))
    expect(await screen.findByRole('button', { name: 'إلغاء تحديد الإكمال' })).toBeInTheDocument()
    expect(posted).toEqual([{ completed: true }])
  })
})

describe('exams', () => {
  it('starts an attempt, autosaves answers and flags, then shows the graded review', async () => {
    signInAs(student)
    const saved: unknown[] = []
    let submitted = false
    server.use(
      http.get(`${API}/exams/7`, () => HttpResponse.json({ data: examDetail() })),
      http.post(`${API}/exams/7/attempts`, () => HttpResponse.json({ data: attempt() }, { status: 201 })),
      http.get(`${API}/attempts/55`, () => HttpResponse.json({ data: submitted ? gradedAttempt() : attempt() })),
      http.put(`${API}/attempts/55/answers`, async ({ request }) => {
        const body = (await request.json()) as { question_id: number; option_id?: number; flagged?: boolean }
        saved.push(body)
        return HttpResponse.json({ data: { question_id: body.question_id, option_id: body.option_id ?? null, is_flagged: !!body.flagged } })
      }),
      http.post(`${API}/attempts/55/submit`, () => {
        submitted = true
        return HttpResponse.json({ data: gradedAttempt(), message: 'تم تسليم الاختبار.' })
      }),
    )
    const { user, router } = renderApp('/dashboard/exams/7')

    await user.click(await screen.findByRole('button', { name: /ابدأ الاختبار/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/exams/7/attempts/55'))
    expect(await screen.findByText('السؤال 1 من 2')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent(/1[45]:[0-9]{2}/)

    await user.click(screen.getByRole('radio', { name: /5/ }))
    await waitFor(() => expect(saved).toContainEqual({ question_id: 1, option_id: 12 }))
    expect(screen.getByText('أجبت عن 1 من 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'تمييز للمراجعة' }))
    await waitFor(() => expect(saved).toContainEqual({ question_id: 1, flagged: true }))
    expect(screen.getByRole('button', { name: 'السؤال 1، تمت الإجابة، مميّز' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /التالي/ }))
    expect(screen.getByText('السؤال 2 من 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /إنهاء وتسليم/ }))
    const dialog = await screen.findByRole('dialog', { name: 'تسليم الاختبار؟' })
    expect(within(dialog).getByText(/أسئلة بلا إجابة/)).toHaveTextContent('1')
    expect(within(dialog).getByText(/مميّزة للمراجعة/)).toHaveTextContent('1')
    await user.click(within(dialog).getByRole('button', { name: 'تأكيد التسليم' }))

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(screen.getByText('لم تجتز الاختبار')).toBeInTheDocument()
    expect(screen.getByText('الربع = 90')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'الأخطاء فقط' }))
    expect(screen.queryByText('3س = 15')).not.toBeInTheDocument()
  })

  it('submits automatically when the time is up', async () => {
    signInAs(student)
    let submitted = false
    server.use(
      http.get(`${API}/attempts/55`, () => HttpResponse.json({ data: attempt({ remaining_seconds: 0 }) })),
      http.post(`${API}/attempts/55/submit`, () => {
        submitted = true
        return HttpResponse.json({ data: gradedAttempt() })
      }),
    )
    renderApp('/dashboard/exams/7/attempts/55')

    expect(await screen.findByText('50%')).toBeInTheDocument()
    expect(submitted).toBe(true)
  })

  it('lists available exams with best results', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/exams`, () =>
        HttpResponse.json({
          data: [examDetail({ stats: { attempts_used: 1, attempts_left: 2, best_percent: 80, passed: true, in_progress_attempt_id: null } })],
        }),
      ),
    )
    renderApp('/dashboard/exams')

    expect(await screen.findByRole('link', { name: 'اختبار محاكٍ' })).toHaveAttribute('href', '/dashboard/exams/7')
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('ناجح')).toBeInTheDocument()
  })
})

describe('question bank', () => {
  it('shows unlocked banks with progress and locked ones with a purchase link', async () => {
    signInAs(student)
    server.use(
      http.get(`${API}/question-banks`, () =>
        HttpResponse.json({
          data: [
            bankSummary(),
            bankSummary({
              id: 4,
              title: 'بنك الكمي',
              is_free: false,
              is_unlocked: false,
              unlock: { course: null, product: { id: 9, title: 'بنك أسئلة الكمي', slug: 'بنك-الكمي' } },
              stats: { answered: 0, correct: 0 },
            }),
          ],
        }),
      ),
    )
    renderApp('/dashboard/question-bank')

    expect(await screen.findByRole('link', { name: /متابعة التدريب/ })).toHaveAttribute('href', '/dashboard/question-bank/3')
    expect(screen.getByRole('link', { name: /اشترِ بنك أسئلة الكمي/ })).toHaveAttribute(
      'href',
      `/products/${encodeURIComponent('بنك-الكمي')}`,
    )
  })

  it('checks a practice answer and shows the explanation', async () => {
    signInAs(student)
    const seen: URLSearchParams[] = []
    server.use(
      http.get(`${API}/question-banks/3`, () => HttpResponse.json({ data: bankDetail() })),
      http.get(`${API}/question-banks/3/questions`, ({ request }) => {
        seen.push(new URL(request.url).searchParams)
        return HttpResponse.json({ ...emptyPage, data: [practiceQuestion()], meta: { ...emptyPage.meta, from: 1, to: 1, total: 1 } })
      }),
      http.post(`${API}/question-banks/3/questions/31/answer`, () =>
        HttpResponse.json({
          data: {
            question_id: 31,
            selected_option_id: 312,
            is_correct: false,
            correct_option_id: 311,
            explanation_html: '<p>أداة ووظيفتها</p>',
          },
        }),
      ),
    )
    const { user } = renderApp('/dashboard/question-bank/3')

    await user.click(await screen.findByRole('button', { name: 'ورقة : شجرة' }))
    expect(await screen.findByText('أداة ووظيفتها')).toBeInTheDocument()
    expect(screen.getByText('إجابة خاطئة')).toBeInTheDocument()
    expect(screen.getByLabelText('الإجابة الصحيحة')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('الحالة'), 'incorrect')
    await waitFor(() => expect(seen.at(-1)?.get('status')).toBe('incorrect'))
  })
})
