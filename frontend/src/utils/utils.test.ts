import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { initials } from './format'
import { safeRedirect } from './safe-redirect'

describe('safeRedirect', () => {
  it.each([
    ['/dashboard/courses', '/dashboard/courses'],
    ['/admin?tab=1', '/admin?tab=1'],
  ])('allows internal path %s', (input, expected) => {
    expect(safeRedirect(input, '/fallback')).toBe(expected)
  })

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/login', '/register?x=1'])(
    'rejects %s',
    (input) => {
      expect(safeRedirect(input, '/fallback')).toBe('/fallback')
    },
  )
})

describe('ApiError.from', () => {
  const axiosError = (status: number, data: unknown) =>
    new AxiosError('failed', 'ERR', undefined, undefined, {
      status,
      data,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
    })

  it('reads the backend error envelope', () => {
    const error = ApiError.from(
      axiosError(422, { message: 'البيانات المدخلة غير صحيحة.', code: 'validation_failed', errors: { email: ['خطأ'] } }),
    )
    expect(error.status).toBe(422)
    expect(error.code).toBe('validation_failed')
    expect(error.isValidation).toBe(true)
    expect(error.field('email')).toBe('خطأ')
  })

  it('handles network failures', () => {
    const error = ApiError.from(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect(error.isNetwork).toBe(true)
    expect(error.message).toContain('تعذّر الاتصال')
  })

  it('falls back to a generic message for unexpected payloads', () => {
    const error = ApiError.from(axiosError(500, '<html>'))
    expect(error.status).toBe(500)
    expect(error.message).toBe('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.')
  })
})

describe('initials', () => {
  it('uses the first letters of the first two names', () => {
    expect(initials('ريم عبدالله الشهري')).toBe('ر ع')
    expect(initials('  Sara  ')).toBe('S')
  })
})

describe('arabic formatting', () => {
  it('uses the right plural forms', async () => {
    const { lessonsLabel, formatAccess, formatDuration, formatPrice } = await import('./format')
    expect(lessonsLabel(1)).toBe('درس واحد')
    expect(lessonsLabel(2)).toBe('درسان')
    expect(lessonsLabel(5)).toBe('5 دروس')
    expect(lessonsLabel(20)).toBe('20 درساً')
    expect(lessonsLabel(100)).toBe('100 درس')

    expect(formatAccess(90)).toBe('3 أشهر')
    expect(formatAccess(60)).toBe('شهران')
    expect(formatAccess(365)).toBe('سنة كاملة')
    expect(formatAccess(null)).toBe('وصول دائم')

    expect(formatDuration(600)).toBe('10 دقائق')
    expect(formatDuration(5400)).toBe('ساعة و30 دقيقة')

    expect(formatPrice({ amount: 199, currency: 'SAR' })).toMatch(/199/)
    expect(formatPrice({ amount: 199, currency: 'SAR' })).not.toMatch(/199[.,٫]00/)
    expect(formatPrice({ amount: 19.5, currency: 'SAR' })).toMatch(/19[.,٫]50/)
  })
})
