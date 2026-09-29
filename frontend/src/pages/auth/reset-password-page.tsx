import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ApiError } from '@/api/errors'
import { Seo } from '@/components/common/seo'
import { EmptyState } from '@/components/common/states'
import { FormField } from '@/components/forms/form-field'
import { PasswordInput } from '@/components/forms/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { resetPasswordSchema, type ResetPasswordValues } from '@/features/auth/schemas'
import { useResetPassword } from '@/features/auth/use-auth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''
  const reset = useResetPassword()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', password_confirmation: '' },
  })
  const { errors } = form.formState

  if (!token || !email) {
    return (
      <>
        <Seo title="رابط غير صالح" noIndex />
        <EmptyState
          icon={KeyRound}
          title="رابط إعادة التعيين غير مكتمل"
          description="افتح الرابط من الرسالة كما هو، أو اطلب رابطاً جديداً."
          action={
            <Button asChild>
              <Link to="/forgot-password">طلب رابط جديد</Link>
            </Button>
          }
        />
      </>
    )
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    reset.mutate(
      { token, email, ...values },
      {
        onSuccess: (res) => {
          toast.success(res.message)
          navigate('/login', { replace: true })
        },
        onError: (error) => {
          // Token/email problems come back on the `email` field, which is not an input here.
          const tokenProblem = ApiError.from(error).field('email') ?? ApiError.from(error).field('token')
          setFormError(tokenProblem ?? applyServerErrors(error, form.setError, ['password', 'password_confirmation']))
        },
      },
    )
  })

  return (
    <div className="space-y-8">
      <Seo title="تعيين كلمة مرور جديدة" noIndex />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">تعيين كلمة مرور جديدة</h1>
        <p className="text-muted-foreground">
          للحساب <span className="font-semibold text-foreground ltr-nums">{email}</span>
        </p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>
            {formError}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              اطلب رابطاً جديداً
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormField label="كلمة المرور الجديدة" error={errors.password?.message} hint="8 أحرف على الأقل، وتتضمن حرفاً ورقماً.">
          <PasswordInput autoComplete="new-password" {...form.register('password')} />
        </FormField>
        <FormField label="تأكيد كلمة المرور" error={errors.password_confirmation?.message}>
          <PasswordInput autoComplete="new-password" {...form.register('password_confirmation')} />
        </FormField>
        <Button type="submit" size="lg" loading={reset.isPending} className="w-full">
          حفظ كلمة المرور
        </Button>
      </form>
    </div>
  )
}
