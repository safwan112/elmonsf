import { zodResolver } from '@hookform/resolvers/zod'
import { BadgeCheck, MailWarning } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { PageHeader } from '@/components/common/page-header'
import { Seo } from '@/components/common/seo'
import { FormField } from '@/components/forms/form-field'
import { PasswordInput } from '@/components/forms/password-input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { AvatarCard } from '@/features/account/avatar-card'
import { useResendVerification, useUpdateEmail, useUpdateProfile } from '@/features/account/use-account'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { phone } from '@/features/auth/schemas'
import { useCurrentUser } from '@/features/auth/use-auth'
import { DashboardSection } from '@/layouts/dashboard-shell'
import type { User } from '@/types/user'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جداً').max(100, 'الاسم طويل جداً'),
  phone,
  locale: z.enum(['ar', 'en']),
})
type ProfileValues = z.infer<typeof profileSchema>

const emailSchema = z.object({
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('أدخل بريداً إلكترونياً صحيحاً'),
  current_password: z.string().min(1, 'أدخل كلمة المرور الحالية'),
})
type EmailValues = z.infer<typeof emailSchema>

function PersonalInfoCard({ user }: { user: User }) {
  const update = useUpdateProfile()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { name: user.name, phone: user.phone ?? '', locale: user.locale === 'en' ? 'en' : 'ar' },
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(
      { ...values, phone: values.phone.trim() === '' ? null : values.phone },
      {
        onSuccess: (res) => toast.success(res.message ?? 'تم الحفظ'),
        onError: (error) => {
          const message = applyServerErrors(error, form.setError, ['name', 'phone', 'locale'])
          if (message) toast.error(message)
        },
      },
    )
  })

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="contents">
        <CardHeader>
          <CardTitle>البيانات الشخصية</CardTitle>
          <CardDescription>يظهر اسمك في الشهادات والفواتير.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField label="الاسم الكامل" error={errors.name?.message} className="sm:col-span-2">
            <Input autoComplete="name" {...form.register('name')} />
          </FormField>
          <FormField label="رقم الجوال" error={errors.phone?.message} hint="اختياري">
            <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+9665XXXXXXXX" {...form.register('phone')} />
          </FormField>
          <FormField label="لغة الرسائل" error={errors.locale?.message} hint="لغة الرسائل التي تصلك على البريد.">
            <NativeSelect {...form.register('locale')}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </NativeSelect>
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" loading={update.isPending} disabled={!isDirty}>
            حفظ التغييرات
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

function EmailCard({ user }: { user: User }) {
  const update = useUpdateEmail()
  const resend = useResendVerification()
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '', current_password: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    update.mutate(values, {
      onSuccess: (res) => {
        toast.success(res.message ?? 'تم التحديث')
        form.reset()
      },
      onError: (error) => {
        const message = applyServerErrors(error, form.setError, ['email', 'current_password'])
        if (message) toast.error(message)
      },
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>البريد الإلكتروني</CardTitle>
        <CardDescription>تُرسل إليه الفواتير وروابط استعادة الحساب.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-4">
          <div className="min-w-0">
            <p className="truncate font-semibold ltr-nums">{user.email}</p>
            {user.email_verified ? (
              <Badge variant="success" className="mt-1.5">
                <BadgeCheck />
                مؤكَّد
              </Badge>
            ) : (
              <Badge variant="accent" className="mt-1.5">
                <MailWarning />
                بانتظار التأكيد
              </Badge>
            )}
          </div>
          {!user.email_verified && (
            <Button
              variant="outline"
              size="sm"
              loading={resend.isPending}
              disabled={resend.isSuccess}
              onClick={() => resend.mutate(undefined, { onSuccess: (res) => toast.success(res.message) })}
            >
              {resend.isSuccess ? 'تم الإرسال' : 'إعادة إرسال رابط التأكيد'}
            </Button>
          )}
        </div>

        <form onSubmit={onSubmit} noValidate className="grid gap-5 sm:grid-cols-2">
          <FormField label="البريد الجديد" error={errors.email?.message}>
            <Input type="email" autoComplete="email" inputMode="email" {...form.register('email')} />
          </FormField>
          <FormField label="كلمة المرور الحالية" error={errors.current_password?.message}>
            <PasswordInput autoComplete="current-password" {...form.register('current_password')} />
          </FormField>
          <div className="flex justify-end sm:col-span-2">
            <Button type="submit" variant="secondary" loading={update.isPending}>
              تغيير البريد
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function ProfilePage() {
  const { user } = useCurrentUser()
  if (!user) return null

  return (
    <DashboardSection className="max-w-3xl">
      <Seo title="الملف الشخصي" noIndex />
      <PageHeader title="الملف الشخصي" description="حدّث بياناتك وصورتك وبريدك الإلكتروني." />
      <AvatarCard user={user} />
      <PersonalInfoCard user={user} />
      <EmailCard user={user} />
    </DashboardSection>
  )
}
