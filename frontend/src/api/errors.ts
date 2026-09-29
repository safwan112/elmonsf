import { AxiosError } from 'axios'
import type { ApiErrorBody } from '@/types/api'

const NETWORK_MESSAGE = 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت ثم حاول مجدداً.'
const GENERIC_MESSAGE = 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.'

/**
 * Normalized API error. Every failed request made through the API client
 * rejects with this type, so UI code never has to inspect Axios internals.
 */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string[]>

  constructor(message: string, status: number, code: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
  }

  get isValidation() {
    return this.status === 422
  }

  get isUnauthenticated() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isNetwork() {
    return this.status === 0
  }

  /** First message for a field, if any. */
  field(name: string): string | undefined {
    return this.fieldErrors[name]?.[0]
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error

    if (error instanceof AxiosError) {
      if (!error.response) {
        return new ApiError(NETWORK_MESSAGE, 0, 'network_error')
      }

      const body = error.response.data as Partial<ApiErrorBody> | undefined
      const status = error.response.status

      return new ApiError(
        typeof body?.message === 'string' && body.message ? body.message : GENERIC_MESSAGE,
        status,
        typeof body?.code === 'string' ? body.code : `http_${status}`,
        body?.errors ?? {},
      )
    }

    return new ApiError(GENERIC_MESSAGE, -1, 'unknown_error')
  }
}

export function errorMessage(error: unknown): string {
  return ApiError.from(error).message
}
