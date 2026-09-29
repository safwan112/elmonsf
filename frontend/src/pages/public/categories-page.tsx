import { ArrowLeft } from 'lucide-react'
import { createElement } from 'react'
import { Link, useParams } from 'react-router'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { PageHero } from '@/components/common/page-hero'
import { Seo } from '@/components/common/seo'
import { ErrorState } from '@/components/common/states'
import { Skeleton } from '@/components/ui/skeleton'
import { iconFor, totalCourses } from '@/features/catalog/category-icons'
import { useCategories, useCategory } from '@/features/catalog/use-catalog'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import type { Category } from '@/types/catalog'
import { CourseCatalog } from './courses-page'

export function CategoryTile({ category }: { category: Category }) {
  return (
    <article className="relative flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift focus-within:ring-4 focus-within:ring-ring/25">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {createElement(iconFor(category.icon), { className: 'size-6', 'aria-hidden': true })}
      </span>
      <div className="grid gap-1">
        <h2 className="text-lg font-bold">
          <Link to={`/categories/${encodeURIComponent(category.slug)}`} className="outline-none after:absolute after:inset-0">
            {category.name}
          </Link>
        </h2>
        {category.description && <p className="text-sm leading-7 text-muted-foreground">{category.description}</p>}
      </div>
      <div className="mt-auto flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{totalCourses(category)} دورة</span>
        <ArrowLeft className="size-4 text-primary" aria-hidden="true" />
      </div>
      {category.children && category.children.length > 0 && (
        <ul className="relative z-10 flex flex-wrap gap-2 border-t pt-4">
          {category.children.map((child) => (
            <li key={child.id}>
              <Link
                to={`/categories/${encodeURIComponent(child.slug)}`}
                className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium hover:bg-primary-soft hover:text-primary"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export function CategoriesPage() {
  const categories = useCategories()
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'التصنيفات' }]

  return (
    <>
      <Seo title="التصنيفات" description="تصفّح مسارات التدريب: القدرات العامة (كمي ولفظي)، والتحصيلي، ومهارات الاختبارات." jsonLd={breadcrumbJsonLd(crumbs)} />
      <PageHero crumbs={crumbs} title="التصنيفات" description="اختر المسار الذي تستعد له لتصل إلى الدورات المناسبة." />
      <div className="container-page py-10">
        {categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.isPending
              ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
              : categories.data.map((c) => <CategoryTile key={c.id} category={c} />)}
          </div>
        )}
      </div>
    </>
  )
}

export function CategoryPage() {
  const { slug = '' } = useParams()
  const category = useCategory(slug)

  if (category.isError && category.error.isNotFound) return <NotFoundPage />

  const c = category.data
  const crumbs = [
    { label: 'الرئيسية', to: '/' },
    { label: 'التصنيفات', to: '/categories' },
    ...(c?.parent ? [{ label: c.parent.name, to: `/categories/${encodeURIComponent(c.parent.slug)}` }] : []),
    { label: c?.name ?? '…' },
  ]

  return (
    <>
      {c && <Seo title={c.seo.title} description={c.seo.description ?? undefined} jsonLd={breadcrumbJsonLd(crumbs)} />}
      <PageHero crumbs={crumbs} title={c?.name ?? 'جارٍ التحميل…'} description={c?.description}>
        {c?.children && c.children.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {c.children.map((child) => (
              <li key={child.id}>
                <Link
                  to={`/categories/${encodeURIComponent(child.slug)}`}
                  className="inline-flex rounded-full border bg-card px-3.5 py-1.5 text-sm font-medium hover:border-primary hover:text-primary"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageHero>
      <div className="container-page py-8">
        {category.isError ? (
          <ErrorState error={category.error} onRetry={() => void category.refetch()} />
        ) : (
          <CourseCatalog fixedCategory={slug} />
        )}
      </div>
    </>
  )
}
