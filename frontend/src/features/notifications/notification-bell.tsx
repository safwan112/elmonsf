import { Bell } from 'lucide-react'
import { createElement } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { AppNotification } from '@/types/notifications'
import { formatRelative } from '@/utils/format'
import { notificationIcon } from './notification-icon'
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from './use-notifications'

/** Header bell: unread badge and the latest notifications. */
export function NotificationBell() {
  const unread = useUnreadCount()
  const latest = useNotifications('all', 1, 6)
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const navigate = useNavigate()
  const count = unread.data ?? 0

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id)
    if (n.url) void navigate(n.url)
  }

  return (
    <DropdownMenu dir="rtl" onOpenChange={(o) => o && void latest.refetch()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={count > 0 ? `الإشعارات (${count} غير مقروءة)` : 'الإشعارات'}>
          <Bell className="size-5" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[0.65rem] leading-5 font-bold text-white ltr-nums"
            >
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <DropdownMenuLabel className="p-0">الإشعارات</DropdownMenuLabel>
          {count > 0 && (
            <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => markAll.mutate()}>
              تحديد الكل كمقروء
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {(latest.data?.data ?? []).length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات بعد.</p>
        ) : (
          latest.data!.data.map((n) => (
            <DropdownMenuItem key={n.id} onSelect={() => open(n)} className="items-start gap-3 py-2.5">
              <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg', n.read_at ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary')}>
                {createElement(notificationIcon(n.type), { className: 'size-4', 'aria-hidden': true })}
              </span>
              <span className="grid min-w-0 gap-0.5">
                <span className={cn('truncate text-sm', !n.read_at && 'font-semibold')}>{n.title}</span>
                <span className="line-clamp-2 text-xs whitespace-normal text-muted-foreground">{n.body}</span>
                <span className="text-[0.7rem] text-muted-foreground">{formatRelative(n.created_at)}</span>
              </span>
              {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="غير مقروء" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="justify-center font-medium text-primary">
          <Link to="/dashboard/notifications">عرض كل الإشعارات</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
