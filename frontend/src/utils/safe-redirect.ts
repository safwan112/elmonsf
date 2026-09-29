/**
 * Only allow same-app relative paths as post-login redirect targets, to
 * prevent open-redirects such as `?redirect=//evil.example`.
 */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target) return fallback
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return fallback
  if (/^\/(login|register)(\/|\?|$)/.test(target)) return fallback
  return target
}
