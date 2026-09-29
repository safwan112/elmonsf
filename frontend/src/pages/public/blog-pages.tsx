import { Clock, Newspaper } from 'lucide-react'
import { useParams } from 'react-router'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { PageHero } from '@/components/common/page-hero'
import { Pagination } from '@/components/common/pagination'
import { RichText } from '@/components/common/rich-text'
import { SectionHeading } from '@/components/common/section-heading'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState, PageLoader } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { CatalogToolbar } from '@/features/catalog/course-filters'
import { usePost, usePosts } from '@/features/catalog/use-catalog'
import { PostCard } from '@/features/content/post-card'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { config } from '@/lib/config'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { formatDate } from '@/utils/format'

export function BlogPage() {
  const { get, set, clear } = useUrlFilters()
  const search = get('search') ?? ''
  const page = Math.max(1, Number(get('page')) || 1)
  const posts = usePosts({ search: search || undefined, page, per_page: 9 })
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المدونة' }]

  return (
    <>
      <Seo title="المدونة" description="نصائح مذاكرة وخطط تدريب ومقالات تساعدك على الاستعداد لاختبارات القدرات والتحصيلي." jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title="المدونة" description="مقالات عملية تساعدك على المذاكرة بذكاء." />
      <div className="container-page grid gap-6 py-8">
        <CatalogToolbar
          search={search}
          onSearch={(v) => set({ search: v || undefined })}
          sort="newest"
          sorts={[{ value: 'newest', label: 'الأحدث' }]}
          onSort={() => undefined}
          activeCount={search ? 1 : 0}
          onClear={() => clear()}
        />
        {posts.isError ? (
          <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
        ) : posts.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : posts.data.data.length === 0 ? (
          <EmptyState icon={Newspaper} title="لا توجد مقالات مطابقة" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.data.data.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
        {posts.data && <Pagination meta={posts.data.meta} onPageChange={(p) => set({ page: p > 1 ? p : undefined }, { resetPage: false })} />}
      </div>
    </>
  )
}

export function PostPage() {
  const { slug = '' } = useParams()
  const query = usePost(slug)

  if (query.isPending) return <PageLoader />
  if (query.isError) {
    if (query.error.isNotFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const post = query.data.data
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المدونة', to: '/blog' }, { label: post.title }]
  const article = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seo.description ?? undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at ?? undefined,
    inLanguage: 'ar',
    ...(post.cover_url ? { image: post.cover_url } : {}),
    author: post.author ? { '@type': 'Person', name: post.author.name } : { '@type': 'Organization', name: config.appName },
    publisher: { '@type': 'Organization', name: config.appName },
    mainEntityOfPage: `${config.siteUrl}/blog/${encodeURIComponent(post.slug)}`,
  }

  return (
    <>
      <Seo title={post.seo.title} description={post.seo.description ?? undefined} type="article" image={post.cover_url ?? undefined} jsonLd={[article, breadcrumbJsonLd(crumbs)]} />
      <article className="container-page max-w-3xl py-10">
        <Breadcrumbs items={crumbs} className="mb-6 text-muted-foreground" />
        <header className="mb-8 grid gap-3">
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{post.title}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {post.author && <span>{post.author.name}</span>}
            {post.author && <span aria-hidden="true">·</span>}
            <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden="true" />
              {post.reading_minutes} دقائق قراءة
            </span>
          </p>
          {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
        </header>
        <RichText html={post.body_html} className="text-[1.05rem]" />
      </article>
      {query.data.more.length > 0 && (
        <section className="border-t bg-card/60">
          <div className="container-page py-12">
            <SectionHeading title="مقالات أخرى" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.more.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
