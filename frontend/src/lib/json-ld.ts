import { config } from '@/lib/config'
import type { Faq } from '@/types/catalog'

export interface Crumb {
  label: string
  to?: string
}

/** schema.org BreadcrumbList for a breadcrumb trail. */
export function breadcrumbJsonLd(items: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.to ? { item: `${config.siteUrl}${item.to}` } : {}),
    })),
  }
}

/** schema.org FAQPage (eligible for FAQ rich results). */
export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: (f.answer_html ?? '').replace(/<[^>]+>/g, '').trim() },
    })),
  }
}
