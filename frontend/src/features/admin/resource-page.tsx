import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { adminResource, type ListParams } from '@/api/admin'
import { queryKeys } from '@/api/query-keys'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { cn } from '@/lib/utils'
import type { PaginationMeta } from '@/types/api'
import type { FieldDef, SelectOption } from './form-values'
import { ResourceForm } from './resource-form'

export interface Column<T> {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

export type FilterDef = { name: string; label: string } & ({ type: 'search'; placeholder?: string } | { type: 'select'; options: SelectOption[] })

interface ResourcePageProps<T extends object> {
  /** API path under /admin and query-key segment, e.g. "categories". */
  resource: string
  title: string
  description?: string
  /** Singular noun for dialog titles ("إضافة {singular}"). */
  singular: string
  columns: Column<T>[]
  fields?: FieldDef[] | ((row: T | null) => FieldDef[])
  filters?: FilterDef[]
  emptyIcon?: LucideIcon
  canCreate?: boolean
  canDelete?: (row: T) => boolean
  /** Rows link to a dedicated editor page instead of the dialog form. */
  editHref?: (row: T) => string
  /** Extra per-row actions (buttons/links). */
  rowActions?: (row: T) => ReactNode
  /** Wider dialog for long forms. */
  wide?: boolean
  /** Override what the edit dialog starts from (e.g. to fetch details). */
  toSource?: (row: T) => Record<string, unknown>
  /** Called after a create (e.g. to navigate to the new record). */
  onCreated?: (row: T) => void
  /** Stable key for rows without a numeric `id` (e.g. orders by number). */
  rowKey?: (row: T) => string | number
}

const idOf = (row: object) => (row as { id: number }).id

function isPaginated<T>(res: { data: T[]; meta?: PaginationMeta }): res is { data: T[]; meta: PaginationMeta } {
  return 'meta' in res && res.meta !== undefined
}

/**
 * Generic admin list + CRUD screen: URL-synced filters, table, pagination,
 * create/edit dialog built from field definitions and delete confirmation.
 */
export function ResourcePage<T extends object>({
  resource,
  title,
  description,
  singular,
  columns,
  fields,
  filters = [],
  emptyIcon,
  canCreate = true,
  canDelete = () => true,
  editHref,
  rowActions,
  wide,
  toSource,
  onCreated,
  rowKey = idOf,
}: ResourcePageProps<T>) {
  const api = adminResource<T>(resource)
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)

  const searchFilter = filters.find((f) => f.type === 'search')
  const [searchInput, setSearchInput] = useState(searchFilter ? (params.get(searchFilter.name) ?? '') : '')
  const debounced = useDebouncedValue(searchInput.trim())

  const setParam = (patch: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    if (searchFilter && (params.get(searchFilter.name) ?? '') !== debounced) {
      setParam({ [searchFilter.name]: debounced || undefined, page: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [debounced])

  const listParams: ListParams = Object.fromEntries(
    [...filters.map((f) => f.name), 'page'].map((k) => [k, params.get(k) ?? undefined]),
  )

  const list = useQuery({
    queryKey: queryKeys.admin.resource(resource, 'list', listParams),
    queryFn: () => api.list(listParams),
    placeholderData: keepPreviousData,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.resource(resource) })

  const save = useMutation({
    mutationFn: ({ id, body }: { id: number | null; body: Record<string, unknown> }) => (id ? api.update(id, body) : api.create(body)),
    onSuccess: (res, vars) => {
      toast.success(res.message ?? 'تم الحفظ')
      setEditing(null)
      void invalidate()
      if (!vars.id) onCreated?.(res.data)
    },
    meta: { silentError: true },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.remove(id),
    onSuccess: (res) => {
      toast.success(res.message ?? 'تم الحذف')
      setDeleting(null)
      void invalidate()
    },
    onError: (err) => {
      toast.error(err.message)
      setDeleting(null)
    },
  })

  const rows = list.data?.data ?? []
  const fieldDefs = (row: T | null) => (typeof fields === 'function' ? fields(row) : (fields ?? []))
  const editRow = editing && editing !== 'new' ? editing : null

  return (
    <DashboardSection>
      <Seo title={title} noIndex />
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate &&
          fields && (
            <Button onClick={() => setEditing('new')}>
              <Plus />
              إضافة {singular}
            </Button>
          )
        }
      />

      <Card className="gap-0 py-0">
        {filters.length > 0 && (
          <div className="grid gap-3 border-b p-4 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
            {filters.map((f) =>
              f.type === 'search' ? (
                <div key={f.name} className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={f.placeholder}
                    aria-label={f.label}
                    className="h-10 ps-9"
                  />
                </div>
              ) : (
                <NativeSelect
                  key={f.name}
                  aria-label={f.label}
                  value={params.get(f.name) ?? ''}
                  onChange={(e) => setParam({ [f.name]: e.target.value || undefined, page: undefined })}
                >
                  <option value="">{f.label}: الكل</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </NativeSelect>
              ),
            )}
          </div>
        )}

        {list.isError ? (
          <div className="p-4">
            <ErrorState error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : list.isPending ? (
          <div className="grid gap-3 p-4" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={emptyIcon} title="لا توجد عناصر" description="أضف أول عنصر أو غيّر عوامل التصفية." />
          </div>
        ) : (
          <div className={cn('overflow-x-auto', list.isPlaceholderData && 'opacity-60')}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {columns.map((c) => (
                    <TableHead key={c.header} className={c.className}>
                      {c.header}
                    </TableHead>
                  ))}
                  <TableHead className="w-0 text-end">
                    <span className="sr-only">إجراءات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((c) => (
                      <TableCell key={c.header} className={c.className}>
                        {c.cell(row)}
                      </TableCell>
                    ))}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {rowActions?.(row)}
                        {editHref ? (
                          <Button asChild variant="ghost" size="icon-sm">
                            <Link to={editHref(row)} aria-label={`تعديل ${singular} ${rowKey(row)}`}>
                              <Pencil />
                            </Link>
                          </Button>
                        ) : (
                          fields && (
                            <Button variant="ghost" size="icon-sm" aria-label={`تعديل ${singular} ${rowKey(row)}`} onClick={() => setEditing(row)}>
                              <Pencil />
                            </Button>
                          )
                        )}
                        {canDelete(row) && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`حذف ${singular} ${rowKey(row)}`}
                            onClick={() => setDeleting(row)}
                          >
                            <Trash2 />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {list.data && isPaginated(list.data) && list.data.data.length > 0 && (
          <div className="border-t p-4">
            <Pagination meta={list.data.meta} disabled={list.isFetching} onPageChange={(p) => setParam({ page: p > 1 ? String(p) : undefined })} />
          </div>
        )}
      </Card>

      {fields && (
        <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className={cn('max-h-[90dvh] overflow-y-auto', wide ? 'max-w-3xl' : 'max-w-xl')}>
            <DialogHeader>
              <DialogTitle>{editRow ? `تعديل ${singular}` : `إضافة ${singular}`}</DialogTitle>
              <DialogDescription className="sr-only">نموذج {singular}</DialogDescription>
            </DialogHeader>
            {editing !== null && (
              <ResourceForm
                key={editRow ? rowKey(editRow) : 'new'}
                fields={fieldDefs(editRow)}
                source={editRow ? (toSource?.(editRow) ?? (editRow as unknown as Record<string, unknown>)) : undefined}
                submitLabel={editRow ? 'حفظ التغييرات' : 'إضافة'}
                onCancel={() => setEditing(null)}
                onSubmit={(body) => save.mutateAsync({ id: editRow ? idOf(editRow) : null, body })}
              />
            )}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف {singular}؟</DialogTitle>
            <DialogDescription>لا يمكن التراجع عن هذا الإجراء. العناصر المرتبطة بسجلات سابقة تُعطَّل بدلاً من حذفها.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" loading={remove.isPending} onClick={() => deleting && remove.mutate(idOf(deleting))}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardSection>
  )
}
