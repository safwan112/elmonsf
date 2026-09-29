import { TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { Button } from '@/components/ui/button'
import { NotFoundPage } from './not-found-page'

/** Last-resort boundary for errors thrown while rendering a route. */
export function RouteErrorPage() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  if (import.meta.env.DEV) {
    console.error(error)
  }

  return (
    <div role="alert" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-8" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-3 max-w-md text-muted-foreground">نعتذر عن ذلك. جرّب تحديث الصفحة، وإن تكرر الخطأ فعُد لاحقاً.</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={() => window.location.reload()}>تحديث الصفحة</Button>
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          الصفحة الرئيسية
        </Button>
      </div>
    </div>
  )
}
