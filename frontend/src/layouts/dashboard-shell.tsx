import { ArrowRight, Menu, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/common/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCurrentUser } from '@/features/auth/use-auth'
import { UserMenu } from '@/features/auth/user-menu'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { cn } from '@/lib/utils'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

interface DashboardShellProps {
  navItems: NavItem[]
  /** Short label shown next to the logo, e.g. "لوحة الإدارة". */
  areaLabel: string
  /** Up to 5 items shown in the mobile bottom bar. */
  mobileTabs?: NavItem[]
}

function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="grid gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                isActive && 'bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary',
              )
            }
          >
            <Icon className="size-[1.125rem]" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function Brand({ areaLabel }: { areaLabel: string }) {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <Badge variant="secondary" className="hidden sm:inline-flex">
        {areaLabel}
      </Badge>
    </div>
  )
}

/**
 * Shared chrome for the student and admin areas: fixed sidebar on desktop,
 * off-canvas drawer + bottom tab bar on mobile.
 */
export function DashboardShell({ navItems, areaLabel, mobileTabs }: DashboardShellProps) {
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="min-h-dvh bg-muted/40 lg:grid lg:grid-cols-[16.5rem_1fr]">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        تخطَّ إلى المحتوى
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-e bg-sidebar lg:flex">
        <div className="flex h-16 items-center border-b px-5">
          <Brand areaLabel={areaLabel} />
        </div>
        <nav aria-label={areaLabel} className="flex-1 overflow-y-auto p-3">
          <SideNav items={navItems} />
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" asChild>
            <Link to="/">
              <ArrowRight />
              العودة إلى الموقع
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="فتح القائمة">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="start">
                <SheetTitle className="sr-only">{areaLabel}</SheetTitle>
                <SheetDescription className="sr-only">روابط التنقل</SheetDescription>
                <Brand areaLabel={areaLabel} />
                <nav aria-label={areaLabel}>
                  <SideNav items={navItems} onNavigate={() => setOpen(false)} />
                </nav>
                <Button variant="ghost" className="mt-auto justify-start text-muted-foreground" asChild>
                  <Link to="/" onClick={() => setOpen(false)}>
                    <ArrowRight />
                    العودة إلى الموقع
                  </Link>
                </Button>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            {user && <UserMenu user={user} />}
          </div>
        </header>

        <main
          id="main"
          key={location.pathname}
          className={cn('flex-1 animate-fade-in px-4 py-6 sm:px-6 lg:px-8 lg:py-8', mobileTabs && 'pb-24 lg:pb-8')}
        >
          <Outlet />
        </main>
      </div>

      {mobileTabs && <MobileTabBar items={mobileTabs} />}
    </div>
  )
}

function MobileTabBar({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="التنقل السريع"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium text-muted-foreground',
                  isActive && 'text-primary',
                )
              }
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function DashboardSection({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('mx-auto w-full max-w-6xl space-y-6', className)}>{children}</section>
}
