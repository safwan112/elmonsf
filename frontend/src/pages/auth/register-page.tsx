import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Seo } from '@/components/common/seo'
import { FormField } from '@/components/forms/form-field'
import { PasswordInput } from '@/components/forms/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { registerSchema, type RegisterValues } from '@/features/auth/schemas'
import { useRegister } from '@/features/auth/use-auth'
import { safeRedirect } from '@/utils/safe-redirect'

const FIELDS = ['name', 'email', 'phone', 'password', 'password_confirmation'] as const

export function RegisterPage() {
  const register = useRegister()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', phone: '', password: '', password_confirmation: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    register.mutate(
      { ...values, phone: values.phone || undefined },
      {
        onSuccess: () => {
          toast.success('تم إنشاء حسابك بنجاح، أهلاً بك!')
          navigate(safeRedirect(params.get('redirect'), '/dashboard'), { replace: true })
        },
        onError: (error) => setFormError(applyServerErrors(error, form.setError, FIELDS)),
      },
    )
  })

  return (
    <div className="space-y-8">
      <Seo title="إنشاء حساب" description="أنشئ حسابك المجاني وابدأ التدريب على اختبارات القدرات والتحصيلي." />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">أنشئ حسابك</h1>
        <p className="text-muted-foreground">دقيقة واحدة تفصلك عن بداية خطتك التدريبية.</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormField label="الاسم الكامل" error={errors.name?.message}>
          <Input autoComplete="name" {...form.register('name')} />
        </FormField>

        <FormField label="البريد الإلكتروني" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...form.register('email')} />
        </FormField>

        <FormField label="رقم الجوال (اختياري)" error={errors.phone?.message} hint="لإرسال تنبيهات مهمة عن اشتراكاتك فقط.">
          <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+9665XXXXXXXX" {...form.register('phone')} />
        </FormField>

        <FormField label="كلمة المرور" error={errors.password?.message} hint="8 أحرف على الأقل، وتتضمن حرفاً ورقماً.">
          <PasswordInput autoComplete="new-password" {...form.register('password')} />
        </FormField>

        <FormField label="تأكيد كلمة المرور" error={errors.password_confirmation?.message}>
          <PasswordInput autoComplete="new-password" {...form.register('password_confirmation')} />
        </FormField>

        <Button type="submit" size="lg" loading={register.isPending} className="w-full">
          إنشاء الحساب
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        لديك حساب بالفعل؟{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          سجّل الدخول
        </Link>
      </p>
    </div>
  )
}
