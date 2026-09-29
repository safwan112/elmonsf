import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotFoundPage({ inDashboard = false }: { inDashboard?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 text-center', inDashboard ? 'py-16' : 'min-h-[60vh] py-20')}>
      <Seo title="الصفحة غير موجودة" noIndex />
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Compass className="size-8" aria-hidden="true" />
      </span>
      <p className="text-sm font-semibold text-primary ltr-nums">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">لم نعثر على هذه الصفحة</h1>
      <p className="mt-3 max-w-md text-muted-foreground">ربما تغيّر الرابط أو أُزيلت الصفحة. تأكد من العنوان أو عُد إلى الصفحة الرئيسية.</p>
      <Button asChild className="mt-8">
        <Link to={inDashboard ? '..' : '/'} relative="path">
          {inDashboard ? 'العودة' : 'الصفحة الرئيسية'}
        </Link>
      </Button>
    </div>
  )
}
