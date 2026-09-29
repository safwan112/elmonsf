import { ShieldAlert } from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Seo title="غير مصرح" noIndex />
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldAlert className="size-8" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold sm:text-3xl">لا تملك صلاحية الوصول</h1>
      <p className="mt-3 max-w-md text-muted-foreground">هذه الصفحة مخصصة لأدوار محددة. إن كنت تعتقد أن هذا خطأ فتواصل مع إدارة المنصة.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/dashboard">لوحة الطالب</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">الصفحة الرئيسية</Link>
        </Button>
      </div>
    </div>
  )
}
