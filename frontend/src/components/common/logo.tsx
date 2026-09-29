import { Link } from 'react-router'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

/**
 * Brand mark: two ascending peaks with a rising path and a summit dot —
 * "reaching the top score". Drawn from scratch for this project.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn('size-9', className)} aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" className="fill-primary" />
      <path d="M7 30 L16 16 L21 23 L26 13 L33 30 Z" className="fill-primary-foreground" opacity="0.95" />
      <path d="M16 16 L21 23 L26 13" fill="none" strokeWidth="2.2" strokeLinejoin="round" className="stroke-primary" />
      <circle cx="26" cy="9" r="2.6" className="fill-accent" />
    </svg>
  )
}

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link
      to={to}
      className={cn('inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-offset-4', className)}
      aria-label={`${config.appName} — الصفحة الرئيسية`}
    >
      <LogoMark />
      <span className="text-xl font-bold tracking-tight">{config.appName}</span>
    </Link>
  )
}
