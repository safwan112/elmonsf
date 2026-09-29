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

const pluralRules = new Intl.PluralRules('ar')

export interface ArabicPluralForms {
  /** e.g. "درس واحد" (used alone, without the number). */
  one: string
  /** e.g. "درسان" (used alone, without the number). */
  two: string
  /** 3–10: "دروس" */
  few: string
  /** 11–99: "درساً" */
  many: string
  /** 0, 100+: "درس" */
  other: string
}

/** Arabic counted noun with correct plural form, e.g. 3 → "3 دروس". */
export function pluralAr(count: number, forms: ArabicPluralForms): string {
  const rule = pluralRules.select(count)
  if (rule === 'one') return forms.one
  if (rule === 'two') return forms.two
  const word = rule === 'few' ? forms.few : rule === 'many' ? forms.many : forms.other
  return `${formatNumber(count)} ${word}`
}

export const lessonsLabel = (n: number) =>
  pluralAr(n, { one: 'درس واحد', two: 'درسان', few: 'دروس', many: 'درساً', other: 'درس' })

export const studentsLabel = (n: number) =>
  pluralAr(n, { one: 'طالب واحد', two: 'طالبان', few: 'طلاب', many: 'طالباً', other: 'طالب' })

const hoursLabel = (n: number) => pluralAr(n, { one: 'ساعة', two: 'ساعتان', few: 'ساعات', many: 'ساعة', other: 'ساعة' })
const minutesLabel = (n: number) =>
  pluralAr(n, { one: 'دقيقة', two: 'دقيقتان', few: 'دقائق', many: 'دقيقة', other: 'دقيقة' })
const daysLabel = (n: number) => pluralAr(n, { one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يوماً', other: 'يوم' })

/** 5400 → "ساعة و30 دقيقة"; 600 → "10 دقائق". */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.max(0, Math.round(seconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return minutesLabel(Math.max(1, minutes))
  if (minutes === 0) return hoursLabel(hours)
  return `${hoursLabel(hours)} و${minutesLabel(minutes)}`
}

/** Compact mm:ss / h:mm:ss for lesson rows. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}

/** Access length of a plan: 90 → "3 أشهر", 365 → "سنة كاملة", null → "وصول دائم". */
export function formatAccess(days: number | null): string {
  if (days === null) return 'وصول دائم'
  if (days >= 365 && days % 365 === 0) return days === 365 ? 'سنة كاملة' : `${formatNumber(days / 365)} سنوات`
  if (days % 30 === 0) {
    const months = days / 30
    return pluralAr(months, { one: 'شهر واحد', two: 'شهران', few: 'أشهر', many: 'شهراً', other: 'شهر' })
  }
  return daysLabel(days)
}

const currencyFormatters = new Map<string, Intl.NumberFormat>()

/** 199 SAR → "199 ر.س."; keeps decimals only when needed. */
export function formatPrice(money: { amount: number; currency: string } | null | undefined): string {
  if (!money) return '—'
  const whole = Number.isInteger(money.amount)
  const key = `${money.currency}-${whole}`
  let formatter = currencyFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })
    currencyFormatters.set(key, formatter)
  }
  return formatter.format(money.amount)
}
