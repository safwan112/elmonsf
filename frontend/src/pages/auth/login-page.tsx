import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Seo } from '@/components/common/seo'
import { FormField } from '@/components/forms/form-field'
import { PasswordInput } from '@/components/forms/password-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { homePathFor, useLogin } from '@/features/auth/use-auth'
import { safeRedirect } from '@/utils/safe-redirect'

export function LoginPage() {
  const login = useLogin()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: (res) => {
        toast.success(`أهلاً بعودتك، ${res.data.name}`)
        navigate(safeRedirect(params.get('redirect'), homePathFor(res.data)), { replace: true })
      },
      onError: (error) => setFormError(applyServerErrors(error, form.setError, ['email', 'password'])),
    })
  })

  return (
    <div className="space-y-8">
      <Seo title="تسجيل الدخول" description="سجّل دخولك لمتابعة دوراتك واختباراتك." />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">مرحباً بعودتك</h1>
        <p className="text-muted-foreground">سجّل دخولك لمتابعة خطتك التدريبية.</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <FormField label="البريد الإلكتروني" error={errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...form.register('email')} />
        </FormField>

        <FormField label="كلمة المرور" error={errors.password?.message}>
          <PasswordInput autoComplete="current-password" {...form.register('password')} />
        </FormField>

        <div className="flex items-center gap-2.5">
          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Checkbox id="remember" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            )}
          />
          <Label htmlFor="remember" className="font-normal">
            تذكّرني على هذا الجهاز
          </Label>
        </div>

        <Button type="submit" size="lg" loading={login.isPending} className="w-full">
          تسجيل الدخول
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          أنشئ حساباً مجانياً
        </Link>
      </p>
    </div>
  )
}
