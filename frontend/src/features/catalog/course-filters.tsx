import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { cn } from '@/lib/utils'
import type { Category, CourseLevel } from '@/types/catalog'
import { totalCourses } from './category-icons'
import { LEVELS } from './filter-options'

export interface CourseFilterValues {
  category?: string
  level?: CourseLevel
  min_price?: string
  max_price?: string
}

interface FilterPanelProps {
  /** Distinguishes the desktop and mobile instances (unique element ids). */
  idPrefix: string
  values: CourseFilterValues
  categories: Category[]
  hideCategory?: boolean
  onChange: (patch: Partial<Record<keyof CourseFilterValues, string | undefined>>) => void
}

function RadioList<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string
  legend: string
  options: { value: T; label: string; count?: number; indent?: boolean }[]
  value: T | undefined
  onChange: (value: T | undefined) => void
}) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-2 text-sm font-bold">{legend}</legend>
      {[{ value: '' as T, label: 'الكل' }, ...options].map((option) => {
        const id = `${name}-${option.value || 'all'}`
        const checked = (value ?? '') === option.value
        return (
          <label
            key={id}
            htmlFor={id}
            className={cn(
              'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-ring/25',
              checked && 'bg-primary-soft font-semibold text-primary',
              'indent' in option && option.indent && 'ps-6',
            )}
          >
            <span className="flex items-center gap-2">
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value || undefined)}
                className="sr-only"
              />
              {option.label}
            </span>
            {'count' in option && option.count !== undefined && (
              <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}

function FilterPanel({ idPrefix, values, categories, hideCategory, onChange }: FilterPanelProps) {
  const [min, setMin] = useState(values.min_price ?? '')
  const [max, setMax] = useState(values.max_price ?? '')
  // Re-sync the inputs when the URL changes (e.g. "clear filters").
  const [synced, setSynced] = useState({ min: values.min_price, max: values.max_price })
  if (synced.min !== values.min_price || synced.max !== values.max_price) {
    setSynced({ min: values.min_price, max: values.max_price })
    setMin(values.min_price ?? '')
    setMax(values.max_price ?? '')
  }

  const categoryOptions = categories.flatMap((c) => [
    { value: c.slug, label: c.name, count: totalCourses(c) },
    ...(c.children ?? []).map((child) => ({ value: child.slug, label: child.name, count: child.courses_count, indent: true })),
  ])

  return (
    <div className="grid gap-7">
      {!hideCategory && (
        <RadioList
          name={`${idPrefix}-category`}
          legend="التصنيف"
          options={categoryOptions}
          value={values.category}
          onChange={(v) => onChange({ category: v })}
        />
      )}
      <RadioList name={`${idPrefix}-level`} legend="المستوى" options={LEVELS} value={values.level} onChange={(v) => onChange({ level: v })} />
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          onChange({ min_price: min || undefined, max_price: max || undefined })
        }}
      >
        <fieldset className="grid gap-3">
          <legend className="mb-2 text-sm font-bold">السعر (ر.س)</legend>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-min_price`} className="text-xs text-muted-foreground">
                من
              </Label>
              <Input id={`${idPrefix}-min_price`} type="number" inputMode="numeric" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="h-10" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-max_price`} className="text-xs text-muted-foreground">
                إلى
              </Label>
              <Input id={`${idPrefix}-max_price`} type="number" inputMode="numeric" min={0} value={max} onChange={(e) => setMax(e.target.value)} className="h-10" />
            </div>
          </div>
        </fieldset>
        <Button type="submit" variant="secondary" size="sm">
          تطبيق السعر
        </Button>
      </form>
    </div>
  )
}

export function CatalogToolbar({
  search,
  onSearch,
  sort,
  sorts,
  onSort,
  filterPanel,
  activeCount,
  onClear,
  total,
}: {
  search: string
  onSearch: (value: string) => void
  sort: string
  sorts: { value: string; label: string }[]
  onSort: (value: string) => void
  /** Mobile filter sheet contents. */
  filterPanel?: React.ReactNode
  activeCount: number
  onClear: () => void
  total?: number
}) {
  const [text, setText] = useState(search)
  const debounced = useDebouncedValue(text.trim(), 400)
  const [open, setOpen] = useState(false)

  const [syncedSearch, setSyncedSearch] = useState(search)
  if (syncedSearch !== search) {
    setSyncedSearch(search)
    setText(search)
  }
  useEffect(() => {
    if (debounced !== search) onSearch(debounced)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to debounced text
  }, [debounced])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ابحث عن دورة أو موضوع…"
          aria-label="بحث"
          className="ps-9"
        />
      </div>
      <div className="flex items-center gap-2">
        {filterPanel && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden">
                <SlidersHorizontal />
                تصفية
                {activeCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums">{activeCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="start" className="overflow-y-auto">
              <SheetTitle>تصفية النتائج</SheetTitle>
              <SheetDescription className="sr-only">اختر عوامل التصفية</SheetDescription>
              {filterPanel}
              <div className="mt-auto grid gap-2 pt-4">
                <Button onClick={() => setOpen(false)}>
                  عرض {total !== undefined ? `${total} نتيجة` : 'النتائج'}
                </Button>
                {activeCount > 0 && (
                  <Button variant="ghost" onClick={onClear}>
                    مسح الكل
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        )}
        <NativeSelect aria-label="ترتيب النتائج" value={sort} onChange={(e) => onSort(e.target.value)} className="h-11 min-w-44">
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear} className="hidden lg:inline-flex">
          <X />
          مسح التصفية
        </Button>
      )}
    </div>
  )
}

export { FilterPanel as CourseFilterPanel }
