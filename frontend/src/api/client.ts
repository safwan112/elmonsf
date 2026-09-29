import axios, { type AxiosRequestConfig } from 'axios'
import { apiBaseUrl, config } from '@/lib/config'
import { ApiError } from './errors'

/**
 * Centralized API client.
 *
 * Authentication uses Laravel Sanctum's cookie-based SPA flow:
 *  - the session cookie is httpOnly (never readable by JS),
 *  - Laravel issues an XSRF-TOKEN cookie which Axios echoes back as the
 *    X-XSRF-TOKEN header on mutating requests.
 */
export const http = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  withXSRFToken: true,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
    'Accept-Language': config.locale,
    'X-Requested-With': 'XMLHttpRequest',
  },
})

let csrfRequest: Promise<void> | null = null

/** Fetch the XSRF cookie (deduplicated across concurrent callers). */
export function ensureCsrfCookie(force = false): Promise<void> {
  if (!force && csrfRequest) return csrfRequest

  csrfRequest = axios
    .get(`${config.apiOrigin}/sanctum/csrf-cookie`, { withCredentials: true })
    .then(() => undefined)
    .catch((error: unknown) => {
      csrfRequest = null
      throw ApiError.from(error)
    })

  return csrfRequest
}

const MUTATING = new Set(['post', 'put', 'patch', 'delete'])

http.interceptors.request.use(async (request) => {
  if (MUTATING.has((request.method ?? 'get').toLowerCase())) {
    await ensureCsrfCookie()
  }
  return request
})

type RetriableConfig = AxiosRequestConfig & { _csrfRetried?: boolean }

const unauthenticatedListeners = new Set<() => void>()

/** Subscribe to "session expired / signed out elsewhere" events. */
export function onUnauthenticated(listener: () => void): () => void {
  unauthenticatedListeners.add(listener)
  return () => unauthenticatedListeners.delete(listener)
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = ApiError.from(error)
    const original = (error?.config ?? {}) as RetriableConfig

    // CSRF token expired (e.g. after a long idle period): refresh once and retry.
    if (apiError.status === 419 && !original._csrfRetried) {
      original._csrfRetried = true
      await ensureCsrfCookie(true)
      return http.request(original)
    }

    if (apiError.isUnauthenticated) {
      unauthenticatedListeners.forEach((listener) => listener())
    }

    return Promise.reject(apiError)
  },
)

/** Small typed helpers that unwrap Axios responses. */
export const api = {
  get: <T>(url: string, cfg?: AxiosRequestConfig) => http.get<T>(url, cfg).then((r) => r.data),
  post: <T>(url: string, body?: unknown, cfg?: AxiosRequestConfig) => http.post<T>(url, body, cfg).then((r) => r.data),
  put: <T>(url: string, body?: unknown, cfg?: AxiosRequestConfig) => http.put<T>(url, body, cfg).then((r) => r.data),
  patch: <T>(url: string, body?: unknown, cfg?: AxiosRequestConfig) =>
    http.patch<T>(url, body, cfg).then((r) => r.data),
  delete: <T>(url: string, cfg?: AxiosRequestConfig) => http.delete<T>(url, cfg).then((r) => r.data),
}
