import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut, Monitor, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { UserSession } from '@/api/account'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { EmptyState, ErrorState } from '@/components/common/states'
import { FormField } from '@/components/forms/form-field'
import { PasswordInput } from '@/components/forms/password-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useRevokeOtherSessions, useRevokeSession, useSessions, useUpdatePassword } from '@/features/account/use-account'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { newPassword } from '@/features/auth/schemas'
import { DashboardSection } from '@/layouts/dashboard-shell'
import { formatRelative } from '@/utils/format'

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'أدخل كلمة المرور الحالية'),
    password: newPassword,
    password_confirmation: z.string().min(1, 'أكّد كلمة المرور'),
  })
  .refine((d) => d.password === d.password_confirmation, {
    path: ['password_confirmation'],
    message: 'كلمتا المرور غير متطابقتين',
  })
  .refine((d) => d.password !== d.current_password, {
    path: ['password'],
    message: 'اختر كلمة مرور مختلفة عن الحالية',
  })
type PasswordValues = z.infer<typeof passwordSchema>

function ChangePasswordCard() {
  const update = useUpdatePassword()
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: (res) => {
        toast.success(res.message)
        form.reset()
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, ['current_password', 'password', 'password_confirmation'])
        if (message) toast.error(message)
      },
    })
  })

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="contents">
        <CardHeader>
          <CardTitle>تغيير كلمة المرور</CardTitle>
          <CardDescription>سيتم تسجيل خروجك من جميع الأجهزة الأخرى بعد التغيير.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <FormField label="كلمة المرور الحالية" error={errors.current_password?.message}>
            <PasswordInput autoComplete="current-password" {...form.register('current_password')} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="كلمة المرور الجديدة" error={errors.password?.message} hint="8 أحرف على الأقل، وتتضمن حرفاً ورقماً.">
              <PasswordInput autoComplete="new-password" {...form.register('password')} />
            </FormField>
            <FormField label="تأكيد كلمة المرور الجديدة" error={errors.password_confirmation?.message}>
              <PasswordInput autoComplete="new-password" {...form.register('password_confirmation')} />
            </FormField>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={update.isPending}>
            تحديث كلمة المرور
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function SessionRow({ session }: { session: UserSession }) {
  const revoke = useRevokeSession()
  const Icon = session.is_mobile ? Smartphone : Monitor
  const title = [session.browser, session.platform].filter(Boolean).join(' على ') || 'جهاز غير معروف'

  return (
    <li className="flex items-center gap-4 py-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {title}
          {session.is_current && <Badge variant="success">هذا الجهاز</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="ltr-nums">{session.ip_address ?? '—'}</span> · آخر نشاط {formatRelative(session.last_active_at)}
        </p>
      </div>
      {!session.is_current && (
        <Button
          variant="ghost"
          size="sm"
          loading={revoke.isPending}
          onClick={() => revoke.mutate(session.id, { onSuccess: (res) => toast.success(res.message) })}
          aria-label={`تسجيل الخروج من ${title}`}
        >
          <LogOut />
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </Button>
      )}
    </li>
  )
}

function RevokeOthersDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const revoke = useRevokeOtherSessions()
  const form = useForm<{ password: string }>({ defaultValues: { password: '' } })

  const onSubmit = form.handleSubmit(({ password }) => {
    if (!password) {
      form.setError('password', { message: 'أدخل كلمة المرور للتأكيد' })
      return
    }
    revoke.mutate(password, {
      onSuccess: (res) => {
        toast.success(res.message)
        setOpen(false)
        form.reset()
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, ['password'])
        if (message) toast.error(message)
      },
    })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          تسجيل الخروج من الأجهزة الأخرى
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>تسجيل الخروج من الأجهزة الأخرى</DialogTitle>
            <DialogDescription>أكّد كلمة المرور لإنهاء جميع الجلسات عدا هذا الجهاز.</DialogDescription>
          </DialogHeader>
          <FormField label="كلمة المرور" error={form.formState.errors.password?.message}>
            <PasswordInput autoComplete="current-password" {...form.register('password')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" variant="destructive" loading={revoke.isPending}>
              تسجيل الخروج
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SessionsCard() {
  const { data, isPending, isError, error, refetch } = useSessions()
  const sessions = data?.data ?? []
  const hasOthers = sessions.some((s) => !s.is_current)

  return (
    <Card>
      <CardHeader>
        <CardTitle>الأجهزة المتصلة</CardTitle>
        <CardDescription>الأجهزة التي سجّلت الدخول منها. إن لم تتعرف على أحدها فسجّل الخروج منه وغيّر كلمة المرور.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : isPending ? (
          <div className="grid gap-4" aria-busy="true" aria-label="جارٍ تحميل الأجهزة">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="size-11 rounded-xl" />
                <div className="grid flex-1 gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
            ))}
          </div>
        ) : !data.meta.supported || sessions.length === 0 ? (
          <EmptyState icon={Monitor} title="لا تتوفر قائمة بالأجهزة" description="لا يمكن عرض الجلسات النشطة حالياً." />
        ) : (
          <ul className="divide-y" aria-label="الأجهزة المتصلة">
            {sessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        )}
      </CardContent>
      {data?.meta.supported && (
        <CardFooter className="justify-end">
          <RevokeOthersDialog disabled={!hasOthers} />
        </CardFooter>
      )}
    </Card>
  )
}

export function SecurityPage() {
  return (
    <DashboardSection className="max-w-3xl">
      <Seo title="الأمان" noIndex />
      <PageHeader title="الأمان" description="كلمة المرور والأجهزة المتصلة بحسابك." />
      <ChangePasswordCard />
      <SessionsCard />
    </DashboardSection>
  )
}
