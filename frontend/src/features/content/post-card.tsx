import { Clock } from 'lucide-react'
import { Link } from 'react-router'
import { CoverArt } from '@/features/catalog/cover-art'
import type { PostSummary } from '@/types/catalog'
import { formatDate } from '@/utils/format'

export function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-shadow hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
      <CoverArt src={post.cover_url} seed={post.id + 1} icon="lightbulb" title={post.title} />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {post.reading_minutes} د قراءة
          </span>
        </p>
        <h3 className="text-lg leading-snug font-bold">
          <Link to={`/blog/${encodeURIComponent(post.slug)}`} className="outline-none after:absolute after:inset-0">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="line-clamp-3 text-sm leading-7 text-muted-foreground">{post.excerpt}</p>}
      </div>
    </article>
  )
}
