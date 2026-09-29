import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CircleCheck, CircleX } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { authApi } from '@/api/auth'
import { queryKeys } from '@/api/query-keys'
import { Seo } from '@/components/common/seo'
import { Spinner } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/use-auth'

/**
 * Landing page for the link in the verification email. Works whether or
 * not the user is signed in on this device.
 */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const { user } = useCurrentUser()
  const queryClient = useQueryClient()
  const started = useRef(false)

  const id = params.get('id') ?? ''
  const hash = params.get('hash') ?? ''
  const expires = params.get('expires') ?? ''
  const signature = params.get('signature') ?? ''
  const complete = Boolean(id && hash && expires && signature)

  const verify = useMutation({
    mutationFn: () => authApi.verifyEmail({ id, hash, expires, signature }),
    meta: { silentError: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.auth.me }),
  })

  useEffect(() => {
    // Guard against React StrictMode's double effect in development.
    if (complete && !started.current) {
      started.current = true
      verify.mutate()
    }
  }, [complete, verify])

  const continueTo = user ? '/dashboard' : '/login'

  if (complete && (verify.isIdle || verify.isPending)) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <Seo title="تأكيد البريد الإلكتروني" noIndex />
        <Spinner className="[&_svg]:size-8" label="جارٍ تأكيد بريدك الإلكتروني" />
        <p className="text-muted-foreground">جارٍ تأكيد بريدك الإلكتروني…</p>
      </div>
    )
  }

  if (verify.isSuccess) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <Seo title="تم تأكيد البريد" noIndex />
        <span className="flex size-16 items-center justify-center rounded-2xl bg-success/12 text-success">
          <CircleCheck className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">تم تأكيد بريدك الإلكتروني</h1>
          <p className="text-muted-foreground">{verify.data.message}</p>
        </div>
        <Button asChild size="lg">
          <Link to={continueTo}>{user ? 'الانتقال إلى لوحتي' : 'تسجيل الدخول'}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <Seo title="تعذّر تأكيد البريد" noIndex />
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <CircleX className="size-8" aria-hidden="true" />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">تعذّر تأكيد البريد الإلكتروني</h1>
        <p className="text-muted-foreground" role="alert">
          {verify.error?.message ?? 'الرابط غير مكتمل. افتحه من الرسالة كما هو.'}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        {user ? 'يمكنك طلب رابط جديد من لوحتك.' : 'سجّل الدخول ثم اطلب رابط تأكيد جديداً من لوحتك.'}
      </p>
      <Button asChild size="lg" variant="outline">
        <Link to={continueTo}>{user ? 'الانتقال إلى لوحتي' : 'تسجيل الدخول'}</Link>
      </Button>
    </div>
  )
}
