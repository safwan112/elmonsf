import { Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PageHero } from '@/components/common/page-hero'
import { SectionHeading } from '@/components/common/section-heading'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CourseCard, CourseCardSkeleton, CourseGrid } from '@/features/catalog/course-card'
import { ProductCard } from '@/features/catalog/product-card'
import { useSearch } from '@/features/catalog/use-catalog'
import { PostCard } from '@/features/content/post-card'

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const [text, setText] = useState(q)
  const results = useSearch(q)

  const [syncedQ, setSyncedQ] = useState(q)
  if (syncedQ !== q) {
    setSyncedQ(q)
    setText(q)
  }

  const data = results.data?.data
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'البحث' }]

  return (
    <>
      <Seo title={q ? `نتائج البحث عن «${q}»` : 'البحث'} noIndex />
      <PageHero crumbs={crumbs} title="البحث">
        <form
          role="search"
          className="mt-5 flex max-w-2xl gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setParams(text.trim() ? { q: text.trim() } : {})
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ابحث في الدورات والمنتجات والمقالات…"
              aria-label="كلمات البحث"
              className="h-12 ps-9 text-base"
            />
          </div>
          <Button type="submit" size="lg">
            بحث
          </Button>
        </form>
      </PageHero>

      <div className="container-page grid gap-12 py-10">
        {q.length < 2 ? (
          <EmptyState icon={Search} title="ابدأ البحث" description="اكتب حرفين على الأقل للبحث في الدورات والمنتجات والمقالات." />
        ) : results.isError ? (
          <ErrorState error={results.error} onRetry={() => void results.refetch()} />
        ) : results.isPending ? (
          <CourseGrid>
            {Array.from({ length: 3 }, (_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </CourseGrid>
        ) : !data || results.data.meta.total === 0 ? (
          <EmptyState icon={SearchX} title={`لا توجد نتائج لـ «${q}»`} description="تحقّق من الإملاء أو جرّب كلمات أعم." />
        ) : (
          <>
            <p className="text-sm text-muted-foreground" role="status">
              {results.data.meta.total} نتيجة لـ «{q}»
            </p>
            {data.courses.length > 0 && (
              <section aria-labelledby="r-courses">
                <SectionHeading id="r-courses" title="الدورات" />
                <CourseGrid>
                  {data.courses.map((c) => (
                    <CourseCard key={c.id} course={c} />
                  ))}
                </CourseGrid>
              </section>
            )}
            {data.products.length > 0 && (
              <section aria-labelledby="r-products">
                <SectionHeading id="r-products" title="المنتجات" />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
            {data.posts.length > 0 && (
              <section aria-labelledby="r-posts">
                <SectionHeading id="r-posts" title="المقالات" />
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
