import { Menu, Search } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useCurrentUser } from '@/features/auth/use-auth'
import { useSiteSettings } from '@/features/catalog/use-catalog'
import { NewsletterForm } from '@/features/content/newsletter-form'
import { UserMenu } from '@/features/auth/user-menu'
import { CartButton } from '@/features/commerce/cart-button'
import { ThemeToggle } from '@/features/theme/theme-toggle'
import { config } from '@/lib/config'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/courses', label: 'الدورات' },
  { to: '/categories', label: 'التصنيفات' },
  { to: '/products', label: 'المنتجات' },
  { to: '/instructors', label: 'المدرّبون' },
  { to: '/blog', label: 'المدونة' },
]

const mobileExtra = [
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/contact', label: 'تواصل معنا' },
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
        <div className="flex items-center gap-6 xl:gap-8">
          <Logo />
          <nav aria-label="القائمة الرئيسية" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                        isActive && 'text-primary',
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
          <Button variant="ghost" size="icon" asChild>
            <Link to="/search" aria-label="بحث">
              <Search className="size-5" />
            </Link>
          </Button>
          <ThemeToggle />
          {isLoading ? (
            <span className="size-9" aria-hidden="true" />
          ) : user ? (
            <>
              <CartButton />
              <UserMenu user={user} />
            </>
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
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="start" className="overflow-y-auto">
              <SheetTitle className="sr-only">القائمة</SheetTitle>
              <SheetDescription className="sr-only">روابط التنقل في الموقع</SheetDescription>
              <Logo />
              <nav aria-label="قائمة الجوال" className="mt-2">
                <ul className="grid gap-1">
                  {[...navItems, ...mobileExtra].map((item) => (
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

const footerColumns = [
  {
    title: 'المنصة',
    links: [
      { to: '/courses', label: 'الدورات' },
      { to: '/products', label: 'المنتجات الرقمية' },
      { to: '/instructors', label: 'المدرّبون' },
      { to: '/blog', label: 'المدونة' },
    ],
  },
  {
    title: 'المساعدة',
    links: [
      { to: '/faq', label: 'الأسئلة الشائعة' },
      { to: '/contact', label: 'تواصل معنا' },
      { to: '/about', label: 'من نحن' },
    ],
  },
  {
    title: 'السياسات',
    links: [
      { to: '/terms', label: 'الشروط والأحكام' },
      { to: '/privacy', label: 'سياسة الخصوصية' },
      { to: '/refund-policy', label: 'سياسة الاسترجاع' },
    ],
  },
]

const SOCIAL_LABELS: Record<string, string> = {
  x: 'إكس',
  instagram: 'إنستغرام',
  tiktok: 'تيك توك',
  youtube: 'يوتيوب',
  telegram: 'تيليجرام',
}

function Footer() {
  const settings = useSiteSettings()
  const social = Object.entries(settings.data?.social ?? {}).filter(([, url]) => Boolean(url)) as [string, string][]

  return (
    <footer className="mt-auto border-t bg-card/60">
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_repeat(3,1fr)_1.4fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-7 text-muted-foreground">
            منصة عربية تساعدك على الاستعداد لاختبارات القدرات والتحصيلي بخطة واضحة، تدريب متدرّج، وقياس مستمر لمستواك.
          </p>
          {settings.data?.contact_email && (
            <a href={`mailto:${settings.data.contact_email}`} className="block text-sm text-muted-foreground hover:text-foreground ltr-nums">
              {settings.data.contact_email}
            </a>
          )}
          {social.length > 0 && (
            <ul className="flex flex-wrap gap-3 text-sm">
              {social.map(([key, url]) => (
                <li key={key}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    {SOCIAL_LABELS[key] ?? key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        {footerColumns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-3 text-sm font-bold">{col.title}</h2>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <NewsletterForm />
      </div>
      <div className="border-t">
        <p className="container-page py-5 text-center text-xs text-muted-foreground">
          © {CURRENT_YEAR} {config.appName}. جميع الحقوق محفوظة.
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
