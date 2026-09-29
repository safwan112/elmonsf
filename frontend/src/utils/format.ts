import { config } from '@/lib/config'

const LOCALE = 'ar-SA-u-nu-latn'

const numberFormatter = new Intl.NumberFormat(LOCALE)

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: config.timeZone,
  calendar: 'gregory',
})

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: config.timeZone,
  calendar: 'gregory',
})

const relativeFormatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' })

/** "منذ 5 دقائق" style relative time. */
export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const seconds = Math.round((then - now) / 1000)
  const abs = Math.abs(seconds)
  if (abs < 60) return 'الآن'
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), 'minute')
  if (abs < 86_400) return relativeFormatter.format(Math.round(seconds / 3600), 'hour')
  if (abs < 2_592_000) return relativeFormatter.format(Math.round(seconds / 86_400), 'day')
  return formatDate(iso)
}

/** First letter of the first two words of a name (avatar fallback). */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join(' ')
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}
