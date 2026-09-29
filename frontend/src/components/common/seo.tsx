import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { config } from '@/lib/config'

export interface SeoProps {
  title?: string
  description?: string
  /** Path or absolute URL; defaults to the current path without query string. */
  canonical?: string
  image?: string
  type?: 'website' | 'article' | 'product'
  /** Private pages (dashboards, checkout) must not be indexed. */
  noIndex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

const DEFAULT_DESCRIPTION =
  'منصة تعليمية عربية للتدريب على اختبارات القدرات العامة والتحصيلي: دورات مسجلة، بنوك أسئلة متدرجة، واختبارات محاكية بتحليل فوري للأداء.'

function absolute(url: string) {
  return /^https?:\/\//.test(url) ? url : `${config.siteUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Manages document head tags for the current page. Updates the tags that
 * already exist in index.html (so there are never duplicates) and adds any
 * that are missing.
 */
export function Seo({ title, description, canonical, image, type = 'website', noIndex, jsonLd }: SeoProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    const fullTitle = title ? `${title} | ${config.appName}` : `${config.appName} — منصة التدريب على اختبارات القدرات والتحصيلي`
    const desc = description ?? DEFAULT_DESCRIPTION
    const url = absolute(canonical ?? pathname)
    const img = absolute(image ?? '/og-default.svg')

    document.title = fullTitle
    upsertMeta('name', 'description', desc)
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
    upsertLink('canonical', url)

    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', desc)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:image', img)
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', desc)
    upsertMeta('name', 'twitter:image', img)

    const existing = document.getElementById('seo-jsonld')
    if (jsonLd) {
      const script = existing ?? document.createElement('script')
      script.id = 'seo-jsonld'
      script.setAttribute('type', 'application/ld+json')
      script.textContent = JSON.stringify(jsonLd)
      if (!existing) document.head.appendChild(script)
    } else {
      existing?.remove()
    }
  }, [title, description, canonical, image, type, noIndex, jsonLd, pathname])

  return null
}
