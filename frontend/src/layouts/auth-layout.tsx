import { BadgeCheck, ChartLine, Layers } from 'lucide-react'
import { Outlet } from 'react-router'
import { Logo } from '@/components/common/logo'
import { ThemeToggle } from '@/features/theme/theme-toggle'

const highlights = [
  { icon: Layers, text: 'تدريب متدرّج على خمسة مستويات صعوبة' },
  { icon: ChartLine, text: 'تقارير أداء توضح نقاط قوتك وضعفك' },
  { icon: BadgeCheck, text: 'اختبارات محاكية بتوقيت الاختبار الفعلي' },
]

export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-lattice pointer-events-none absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative">
          <Logo inverted className="[&_span]:text-primary-foreground" />
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl leading-snug font-bold">كل خطوة تقرّبك من الدرجة التي تستحقها.</h2>
          <ul className="grid gap-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground/12">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-primary-foreground/70">بياناتك محمية ومشفّرة، ولا نشاركها مع أي طرف.</p>
      </aside>

      <div className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Logo className="lg:invisible" />
          <ThemeToggle />
        </div>
        <main id="main" className="flex flex-1 items-center justify-center px-4 pb-12 sm:px-8">
          <div className="w-full max-w-md animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
