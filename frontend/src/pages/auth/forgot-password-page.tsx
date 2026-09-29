import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, MailCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { FormField } from '@/components/forms/form-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/features/auth/schemas'
import { useForgotPassword } from '@/features/auth/use-auth'

export function ForgotPasswordPage() {
  const forgot = useForgotPassword()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(({ email }) => {
    setFormError(null)
    forgot.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (error) => setFormError(applyServerErrors(error, form.setError, ['email'])),
    })
  })

  if (sentTo) {
    return (
      <div className="space-y-6 text-center">
        <Seo title="تحقق من بريدك" noIndex />
        <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <MailCheck className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">تحقق من بريدك الإلكتروني</h1>
          <p className="text-muted-foreground" role="status">
            إذا كان <span className="font-semibold text-foreground ltr-nums">{sentTo}</span> مسجلاً لدينا فستصلك رسالة تحتوي
            على رابط لإعادة تعيين كلمة المرور خلال دقائق.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها أو حاول مجدداً بعد دقيقة.</p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => setSentTo(null)}>
            استخدام بريد آخر
          </Button>
          <Button asChild variant="ghost">
            <Link to="/login">
              <ArrowRight />
              العودة لتسجيل الدخول
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Seo title="نسيت كلمة المرور" description="استعد الوصول إلى حسابك بإعادة تعيين كلمة المرور." />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">نسيت كلمة المرور؟</h1>
        <p className="text-muted-foreground">أدخل بريدك الإلكتروني وسنرسل لك رابطاً لتعيين كلمة مرور جديدة.</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormField label="البريد الإلكتروني" error={form.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...form.register('email')} />
        </FormField>
        <Button type="submit" size="lg" loading={forgot.isPending} className="w-full">
          إرسال رابط إعادة التعيين
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        تذكرت كلمة المرور؟{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  )
}
