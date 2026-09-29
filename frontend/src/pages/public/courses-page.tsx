import { SearchX } from 'lucide-react'
import type { CourseSort } from '@/api/catalog'
import { Breadcrumbs } from '@/components/common/breadcrumbs'
import { breadcrumbJsonLd } from '@/lib/json-ld'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { CourseCard, CourseCardSkeleton, CourseGrid } from '@/features/catalog/course-card'
import { CatalogToolbar, CourseFilterPanel } from '@/features/catalog/course-filters'
import { COURSE_SORTS, LEVELS } from '@/features/catalog/filter-options'
import { useCategories, useCourses } from '@/features/catalog/use-catalog'
import { useUrlFilters } from '@/hooks/use-url-filters'
import { categoryIcons } from '@/features/catalog/category-icons'
import type { CourseLevel } from '@/types/catalog'
import { formatNumber } from '@/utils/format'

const isLevel = (v: string | undefined): v is CourseLevel => LEVELS.some((l) => l.value === v)
const isSort = (v: string | undefined): v is CourseSort =>
  v === 'relevance' || COURSE_SORTS.some((s) => s.value === v)
const toNumber = (v: string | undefined) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined)

/**
 * Course catalog. When `fixedCategory` is given (category landing pages),
 * the category filter is locked to it.
 */
export function CourseCatalog({ fixedCategory }: { fixedCategory?: string }) {
  const { get, set, clear } = useUrlFilters()
  const categories = useCategories()

  const search = get('search') ?? ''
  const level = isLevel(get('level')) ? (get('level') as CourseLevel) : undefined
  const sortParam = get('sort')
  const sort: CourseSort = isSort(sortParam) ? sortParam : search ? 'relevance' : 'newest'
  const category = fixedCategory ?? get('category')
  const page = Math.max(1, Number(get('page')) || 1)
  const minPrice = get('min_price')
  const maxPrice = get('max_price')

  const courses = useCourses({
    search: search || undefined,
    category,
    level,
    min_price: toNumber(minPrice),
    max_price: toNumber(maxPrice),
    sort,
    page,
    per_page: 12,
  })

  const activeCount = [fixedCategory ? undefined : category, level, minPrice, maxPrice].filter(Boolean).length + (search ? 1 : 0)
  const icons = categoryIcons(categories.data)
  const total = courses.data?.meta.total

  const panel = (idPrefix: string) => (
    <CourseFilterPanel
      idPrefix={idPrefix}
      values={{ category, level, min_price: minPrice, max_price: maxPrice }}
      categories={categories.data ?? []}
      hideCategory={Boolean(fixedCategory)}
      onChange={(patch) => set(patch)}
    />
  )

  return (
    <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
      <aside aria-label="تصفية الدورات" className="hidden lg:block">
        <div className="sticky top-24">{panel('desktop')}</div>
      </aside>

      <div className="grid content-start gap-6">
        <CatalogToolbar
          search={search}
          onSearch={(v) => set({ search: v || undefined, sort: undefined })}
          sort={sort}
          sorts={search ? [{ value: 'relevance', label: 'الأكثر صلة' }, ...COURSE_SORTS] : COURSE_SORTS}
          onSort={(v) => set({ sort: v })}
          filterPanel={panel('mobile')}
          activeCount={activeCount}
          onClear={() => clear()}
          total={total}
        />

        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
          {courses.isPending ? 'جارٍ تحميل الدورات…' : total !== undefined ? `${formatNumber(total)} دورة` : ''}
        </p>

        {courses.isError ? (
          <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
        ) : courses.isPending ? (
          <CourseGrid>
            {Array.from({ length: 6 }, (_, i) => (
              <CourseCardSkeleton key={i} />
            ))}
          </CourseGrid>
        ) : courses.data.data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="لا توجد دورات مطابقة"
            description="جرّب كلمات بحث أخرى أو أزل بعض عوامل التصفية."
            action={
              activeCount > 0 ? (
                <Button variant="outline" onClick={() => clear()}>
                  مسح التصفية
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={courses.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <CourseGrid>
              {courses.data.data.map((course) => (
                <CourseCard key={course.id} course={course} categoryIcon={course.category ? icons[course.category.slug] : null} />
              ))}
            </CourseGrid>
          </div>
        )}

        {courses.data && (
          <Pagination
            meta={courses.data.meta}
            disabled={courses.isFetching}
            onPageChange={(p) => {
              set({ page: p > 1 ? p : undefined }, { resetPage: false })
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}
      </div>
    </div>
  )
}

export function CoursesPage() {
  const crumbs = [{ label: 'الرئيسية', to: '/' }, { label: 'الدورات' }]

  return (
    <>
      <Seo
        title="جميع الدورات"
        description="تصفّح دورات القدرات العامة والتحصيلي: تأسيس، استراتيجيات، ومراجعات مركّزة مع بنوك أسئلة واختبارات محاكية."
        jsonLd={breadcrumbJsonLd(crumbs)}
      />
      <section className="border-b bg-card/60">
        <div className="container-page py-8 sm:py-10">
          <Breadcrumbs items={crumbs} className="text-muted-foreground" />
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">الدورات</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">اختر المسار المناسب لك، وابدأ بمعاينة الدروس المجانية قبل الاشتراك.</p>
        </div>
      </section>
      <div className="container-page py-8">
        <CourseCatalog />
      </div>
    </>
  )
}
