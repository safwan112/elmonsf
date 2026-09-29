import { cn } from '@/lib/utils'

/**
 * Renders HTML produced by the API's Markdown renderer. The server strips raw
 * HTML and unsafe links from the source, so this output is safe to inject.
 */
export function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null
  return <div className={cn('rich-text', className)} dangerouslySetInnerHTML={{ __html: html }} />
}
