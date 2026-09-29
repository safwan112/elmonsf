import { Search, Users } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { useEffect, useState } from 'react'
import { Pagination } from '@/components/common/pagination'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAdminUsers } from '@/features/admin/use-admin'
import { UserManageDialog } from '@/features/admin/user-manage-dialog'
import { useCurrentUser } from '@/features/auth/use-auth'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { ROLES, roleLabels, statusLabels, type Role, type UserStatus } from '@/types/user'
import { formatDate, formatDateTime, initials } from '@/utils/format'

const PER_PAGE = 15

function isRole(value: string | null): value is Role {
  return value !== null && (ROLES as readonly string[]).includes(value)
}

function isStatus(value: string | null): value is UserStatus {
  return value === 'active' || value === 'suspended'
}

export function AdminUsersPage() {
  const { user: me } = useCurrentUser()
  // Filters live in the URL so views are shareable and survive refresh.
  const [params, setParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get('search') ?? '')
  const search = useDebouncedValue(searchInput.trim())

  const roleParam = params.get('role')
  const statusParam = params.get('status')
  const role = isRole(roleParam) ? roleParam : undefined
  const status = isStatus(statusParam) ? statusParam : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)

  const updateParams = (patch: Record<string, string | undefined>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(patch)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if ((params.get('search') ?? '') !== search) {
      updateParams({ search: search || undefined, page: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced value
  }, [search])

  const { data, isPending, isError, error, refetch, isFetching } = useAdminUsers({
    search: search || undefined,
    role,
    status,
    page,
    per_page: PER_PAGE,
  })

  return (
    <DashboardSection>
      <Seo title="المستخدمون" noIndex />
      <PageHeader title="المستخدمون" description="ابحث في حسابات المنصة وتصفّحها حسب الدور والحالة." />

      <Card className="gap-0 py-0">
        <div className="grid gap-3 border-b p-4 sm:grid-cols-[1fr_12rem_12rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ابحث بالاسم أو البريد أو الجوال"
              aria-label="بحث في المستخدمين"
              className="h-10 ps-9"
            />
          </div>
          <NativeSelect
            aria-label="تصفية حسب الدور"
            value={role ?? ''}
            onChange={(e) => updateParams({ role: e.target.value || undefined, page: undefined })}
          >
            <option value="">كل الأدوار</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {roleLabels[r]}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label="تصفية حسب الحالة"
            value={status ?? ''}
            onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
          >
            <option value="">كل الحالات</option>
            <option value="active">{statusLabels.active}</option>
            <option value="suspended">{statusLabels.suspended}</option>
          </NativeSelect>
        </div>

        {isError ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={() => void refetch()} />
          </div>
        ) : isPending ? (
          <div className="grid gap-3 p-4" aria-busy="true" aria-label="جارٍ تحميل المستخدمين">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="لا توجد نتائج"
              description={search || role || status ? 'جرّب تعديل البحث أو إزالة عوامل التصفية.' : 'لم يُسجَّل أي مستخدم بعد.'}
            />
          </div>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>المستخدم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="hidden md:table-cell">تاريخ التسجيل</TableHead>
                  <TableHead className="hidden lg:table-cell">آخر دخول</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">إجراءات</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{u.name}</p>
                          <p className="truncate text-xs text-muted-foreground ltr-nums">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={r === 'admin' ? 'accent' : 'default'}>
                            {roleLabels[r]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : 'destructive'}>{statusLabels[u.status]}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatDateTime(u.last_login_at)}
                    </TableCell>
                    <TableCell>{me && me.id !== u.id && <UserManageDialog user={u} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {data && data.data.length > 0 && (
          <div className="border-t p-4">
            <Pagination
              meta={data.meta}
              disabled={isFetching}
              onPageChange={(p) => updateParams({ page: p > 1 ? String(p) : undefined })}
            />
          </div>
        )}
      </Card>
    </DashboardSection>
  )
}
