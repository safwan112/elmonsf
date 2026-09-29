import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import type { Crumb } from '@/lib/json-ld'
import { cn } from '@/lib/utils'

export type { Crumb }

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="مسار التنقل" className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 opacity-90">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <ChevronLeft className="size-3.5 opacity-60" aria-hidden="true" />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
