import { CheckCircle2, PackageSearch } from 'lucide-react'
import { Link, useParams } from 'react-router'
import type { ProductSort } from '@/api/catalog'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { PageHero } from '@/components/common/page-hero'
import { Pagination } from '@/components/common/pagination'
import { RichText } from '@/components/common/rich-text'
import { SectionHeading } from '@/components/common/section-heading'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { checkoutPathForProduct } from '@/features/catalog/checkout-link'
import { CatalogToolbar } from '@/features/catalog/course-filters'
import { CoverArt } from '@/features/catalog/cover-art'
import { PriceTag } from '@/features/catalog/price-tag'
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/product-card'
import { useProduct, useProducts } from '@/features/catalog/use-catalog'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import type { ProductType } from '@/types/catalog'

const TYPES: { value: ProductType; label: string }[] = [
  { value: 'question_bank', label: 'بنوك الأسئلة' },
  { value: 'ebook', label: 'الكتب والملخصات' },
  { value: 'bundle', label: 'الحزم' },
]

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: من الأقل' },
  { value: 'price_desc', label: 'السعر: من الأعلى' },
]

export function ProductsPage() {
  const { get, set, clear } = useUrlFilters()
  const search = get('search') ?? ''
  const typeParam = get('type')
  const type = TYPES.some((t) => t.value === typeParam) ? (typeParam as ProductType) : undefined
  const sortParam = get('sort') as ProductSort | undefined
  const sort: ProductSort = sortParam && ['relevance', 'newest', 'price_asc', 'price_desc'].includes(sortParam) ? sortParam : search ? 'relevance' : 'newest'
  const page = Math.max(1, Number(get('page')) || 1)

  const products = useProducts({ search: search || undefined, type, sort, page, per_page: 12 })
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المنتجات الرقمية' }]

  return (
    <>
      <Seo title="المنتجات الرقمية" description="بنوك أسئلة وملخصات وحزم رقمية تكمّل دوراتك وتساعدك على التدريب الإضافي." jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title="المنتجات الرقمية" description="تدريب إضافي مركّز: بنوك أسئلة وملخصات تصلك فور الشراء." />
      <div className="container-page grid gap-6 py-8">
        <div role="group" aria-label="نوع المنتج" className="flex flex-wrap gap-2">
          {[{ value: undefined, label: 'الكل' }, ...TYPES].map((t) => (
            <button
              key={t.label}
              type="button"
              aria-pressed={type === t.value}
              onClick={() => set({ type: t.value })}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
                type === t.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <CatalogToolbar
          search={search}
          onSearch={(v) => set({ search: v || undefined, sort: undefined })}
          sort={sort}
          sorts={search ? [{ value: 'relevance', label: 'الأكثر صلة' }, ...SORTS] : SORTS}
          onSort={(v) => set({ sort: v })}
          activeCount={(type ? 1 : 0) + (search ? 1 : 0)}
          onClear={() => clear()}
        />

        {products.isError ? (
          <ErrorState error={products.error} onRetry={() => void products.refetch()} />
        ) : products.isPending ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.data.data.length === 0 ? (
          <EmptyState icon={PackageSearch} title="لا توجد منتجات مطابقة" description="جرّب نوعاً آخر أو كلمات بحث مختلفة." />
        ) : (
          <div className={cn('grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', products.isPlaceholderData && 'opacity-60')}>
            {products.data.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {products.data && (
          <Pagination meta={products.data.meta} disabled={products.isFetching} onPageChange={(p) => set({ page: p > 1 ? p : undefined }, { resetPage: false })} />
        )}
      </div>
    </>
  )
}

export function ProductDetailPage() {
  const { slug = '' } = useParams()
  const query = useProduct(slug)

  if (query.isPending) {
    return (
      <div className="container-page grid gap-6 py-10 lg:grid-cols-2" aria-busy="true">
        <Skeleton className="aspect-[16/10] rounded-2xl" />
        <div className="grid content-start gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-12 w-40" />
        </div>
      </div>
    )
  }
  if (query.isError) {
    if (query.error.isNotFound) return <NotFoundPage />
    return (
      <div className="container-page py-16">
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </div>
    )
  }

  const product = query.data.data
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'المنتجات', to: '/products' }, { label: product.title }]
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.seo?.description ?? product.subtitle ?? undefined,
    ...(product.cover_url ? { image: product.cover_url } : {}),
    brand: { '@type': 'Brand', name: config.appName },
    offers: {
      '@type': 'Offer',
      price: product.price.amount,
      priceCurrency: product.price.currency,
      availability: 'https://schema.org/InStock',
      url: `${config.siteUrl}/products/${encodeURIComponent(product.slug)}`,
    },
  }

  return (
    <>
      <Seo title={product.seo?.title ?? product.title} description={product.seo?.description ?? undefined} type="product" jsonLd={[jsonLd, breadcrumbJsonLd(crumbs)]} />
      <div className="container-page py-8 pb-28 lg:pb-12">
        <Breadcrumbs items={crumbs} className="mb-6 text-muted-foreground" />
        <div className="grid gap-10 lg:grid-cols-2">
          <CoverArt src={product.cover_url} seed={product.id + 2} icon="layers" title={product.title} className="rounded-2xl shadow-soft" />
          <div className="grid content-start gap-5">
            <Badge variant="secondary">{product.type.label}</Badge>
            <h1 className="text-3xl leading-tight font-bold">{product.title}</h1>
            {product.subtitle && <p className="text-lg text-muted-foreground">{product.subtitle}</p>}
            <PriceTag price={product.price} compareAt={product.compare_at_price} discountPercent={product.discount_percent} size="lg" />
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to={checkoutPathForProduct(product.id)}>اشترِ الآن</Link>
            </Button>
            <ul className="grid gap-2 text-sm">
              {['وصول فوري بعد الدفع', 'فاتورة إلكترونية', 'متوافق مع الجوال والحاسب'].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
        {product.description_html && (
          <section aria-labelledby="details" className="mt-12 max-w-3xl">
            <h2 id="details" className="mb-4 text-xl font-bold">
              التفاصيل
            </h2>
            <RichText html={product.description_html} />
          </section>
        )}
      </div>

      {query.data.related.length > 0 && (
        <section className="border-t bg-card/60">
          <div className="container-page py-12">
            <SectionHeading title="قد يعجبك أيضاً" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <PriceTag price={product.price} compareAt={product.compare_at_price} />
          <Button asChild size="lg">
            <Link to={checkoutPathForProduct(product.id)}>اشترِ الآن</Link>
          </Button>
        </div>
      </div>
    </>
  )
}
