import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCurrentUser } from '@/features/auth/use-auth'
import { UserMenu } from '@/features/auth/user-menu'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/#features', label: 'لماذا ذروة' },
  { to: '/#how-it-works', label: 'كيف تبدأ' },
]

function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
    >
      تخطَّ إلى المحتوى
    </a>
  )
}

function Header() {
  const { user, isLoading } = useCurrentUser()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav aria-label="القائمة الرئيسية" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                        isActive && item.end && 'text-foreground',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          {isLoading ? (
            <span className="size-9" aria-hidden="true" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" asChild>
                <Link to="/login">تسجيل الدخول</Link>
              </Button>
              <Button asChild>
                <Link to="/register">ابدأ مجاناً</Link>
              </Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="فتح القائمة">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="start">
              <SheetTitle className="sr-only">القائمة</SheetTitle>
              <SheetDescription className="sr-only">روابط التنقل في الموقع</SheetDescription>
              <Logo />
              <nav aria-label="قائمة الجوال" className="mt-2">
                <ul className="grid gap-1">
                  {navItems.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-muted"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              {!user && (
                <div className="mt-auto grid gap-2">
                  <Button asChild size="lg">
                    <Link to="/register" onClick={() => setOpen(false)}>
                      أنشئ حسابك مجاناً
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/login" onClick={() => setOpen(false)}>
                      تسجيل الدخول
                    </Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

const CURRENT_YEAR = new Date().getFullYear()

function Footer() {
  const year = CURRENT_YEAR

  return (
    <footer className="mt-auto border-t bg-card/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            منصة عربية تساعدك على الاستعداد لاختبارات القدرات والتحصيلي بخطة واضحة، تدريب متدرّج، وقياس مستمر لمستواك.
          </p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">المنصة</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/#features" className="hover:text-foreground">
                لماذا ذروة
              </Link>
            </li>
            <li>
              <Link to="/#how-it-works" className="hover:text-foreground">
                كيف تبدأ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">حسابك</h2>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>
              <Link to="/login" className="hover:text-foreground">
                تسجيل الدخول
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-foreground">
                إنشاء حساب
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <p className="container-page py-5 text-center text-xs text-muted-foreground">
          © {year} {config.appName}. جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
