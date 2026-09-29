import { Quote, Star } from 'lucide-react'
import type { Testimonial } from '@/types/catalog'

export function Testimonials({ items }: { items: Testimonial[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((t) => (
        <li key={t.id}>
          <figure className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-5">
            <Quote className="size-6 text-accent" aria-hidden="true" />
            <blockquote className="flex-1 text-sm leading-7">{t.body}</blockquote>
            <figcaption className="flex items-center justify-between gap-2 border-t pt-3">
              <span>
                <span className="block font-semibold">{t.name}</span>
                {t.subtitle && <span className="block text-xs text-muted-foreground">{t.subtitle}</span>}
              </span>
              <span className="flex" role="img" aria-label={`${t.rating} من 5`}>
                {Array.from({ length: t.rating }, (_, i) => (
                  <Star key={i} className="size-3.5 fill-accent text-accent" aria-hidden="true" />
                ))}
              </span>
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  )
}
