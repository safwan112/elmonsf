const trimSlash = (value: string) => value.replace(/\/+$/, '')

/**
 * Public, build-time configuration. Nothing here is secret: every VITE_*
 * variable ends up in the browser bundle.
 */
export const config = {
  appName: import.meta.env.VITE_APP_NAME || 'ذروة',
  /** API origin; empty means same-origin (dev proxy / reverse proxy). */
  apiOrigin: trimSlash(import.meta.env.VITE_API_URL ?? ''),
  siteUrl: trimSlash(import.meta.env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')),
  locale: 'ar',
  timeZone: 'Asia/Riyadh',
} as const

export const apiBaseUrl = `${config.apiOrigin}/api/v1`
