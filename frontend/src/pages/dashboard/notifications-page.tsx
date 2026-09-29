import { BellOff, CheckCheck, Trash2 } from 'lucide-react'
import { createElement, useState } from 'react'
import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { Pagination } from '@/components/common/pagination'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notificationIcon } from '@/features/notifications/notification-icon'
import { useDeleteNotification, useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/use-notifications'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { cn } from '@/lib/utils'
import { formatDateTime, formatRelative } from '@/utils/format'

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const list = useNotifications(filter, page)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const remove = useDeleteNotification()
  const unread = list.data?.unread_count ?? 0

  return (
    <DashboardSection className="max-w-3xl">
      <Seo title="الإشعارات" noIndex />
      <PageHeader
        title="الإشعارات"
        description={unread > 0 ? `لديك ${unread} إشعار غير مقروء.` : 'كل إشعاراتك مقروءة.'}
        actions={
          unread > 0 && (
            <Button variant="outline" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              <CheckCheck />
              تحديد الكل كمقروء
            </Button>
          )
        }
      />
      <Tabs
        value={filter}
        dir="rtl"
        onValueChange={(v) => {
          setFilter(v === 'unread' ? 'unread' : 'all')
          setPage(1)
        }}
      >
        <TabsList>
          <TabsTrigger value="all">الكل</TabsTrigger>
          <TabsTrigger value="unread">غير المقروءة</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.isPending ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : list.data.data.length === 0 ? (
        <EmptyState icon={BellOff} title={filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'} />
      ) : (
        <>
          <ul className="grid gap-3">
            {list.data.data.map((n) => {
              const body = (
                <>
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', n.read_at ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary')}>
                    {createElement(notificationIcon(n.type), { className: 'size-5', 'aria-hidden': true })}
                  </span>
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className={cn('text-sm', !n.read_at && 'font-bold')}>{n.title}</span>
                    <span className="text-sm text-muted-foreground">{n.body}</span>
                    <time className="text-xs text-muted-foreground" dateTime={n.created_at ?? undefined} title={formatDateTime(n.created_at)}>
                      {formatRelative(n.created_at)}
                    </time>
                  </span>
                </>
              )
              return (
                <li key={n.id} className={cn('flex items-start gap-2 rounded-2xl border bg-card p-4', !n.read_at && 'border-primary/30')}>
                  {n.url ? (
                    <Link to={n.url} className="flex min-w-0 flex-1 items-start gap-3" onClick={() => !n.read_at && markRead.mutate(n.id)}>
                      {body}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-start gap-3">{body}</div>
                  )}
                  <div className="flex shrink-0 flex-col gap-1">
                    {!n.read_at && (
                      <Button variant="ghost" size="icon-sm" aria-label={`تحديد «${n.title}» كمقروء`} onClick={() => markRead.mutate(n.id)}>
                        <CheckCheck />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon-sm" aria-label={`حذف «${n.title}»`} onClick={() => remove.mutate(n.id)}>
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
          <Pagination meta={list.data.meta} onPageChange={setPage} disabled={list.isFetching} />
        </>
      )}
    </DashboardSection>
  )
}
