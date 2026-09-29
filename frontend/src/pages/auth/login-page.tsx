import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Mail, TriangleAlert } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { applyServerErrors } from '@/features/auth/apply-server-errors'
import { OtpLoginForm } from '@/features/auth/otp-login-form'
import { loginSchema, type LoginValues } from '@/features/auth/schemas'
import { homePathFor, useLogin } from '@/features/auth/use-auth'
import type { User } from '@/types/user'
import { safeRedirect } from '@/utils/safe-redirect'

function PasswordLoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const login = useLogin()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    login.mutate(values, {
      onSuccess: (res) => onSuccess(res.data),
      onError: (error) => setFormError(applyServerErrors(error, form.setError, ['email', 'password'])),
    })
  })

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {formError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <FormField label="البريد الإلكتروني" error={errors.email?.message}>
        <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...form.register('email')} />
      </FormField>

      <FormField
        label="كلمة المرور"
        error={errors.password?.message}
        labelAside={
          <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
            نسيت كلمة المرور؟
          </Link>
        }
      >
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
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const onSignedIn = (user: User) => {
    toast.success(`أهلاً بعودتك، ${user.name}`)
    navigate(safeRedirect(params.get('redirect'), homePathFor(user)), { replace: true })
  }

  return (
    <div className="space-y-8">
      <Seo title="تسجيل الدخول" description="سجّل دخولك لمتابعة دوراتك واختباراتك." />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">مرحباً بعودتك</h1>
        <p className="text-muted-foreground">سجّل دخولك لمتابعة خطتك التدريبية.</p>
      </div>

      <Tabs defaultValue="password">
        <TabsList aria-label="طريقة تسجيل الدخول">
          <TabsTrigger value="password">
            <KeyRound className="size-4" aria-hidden="true" />
            بكلمة المرور
          </TabsTrigger>
          <TabsTrigger value="otp">
            <Mail className="size-4" aria-hidden="true" />
            برمز تحقق
          </TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <PasswordLoginForm onSuccess={onSignedIn} />
        </TabsContent>
        <TabsContent value="otp">
          <OtpLoginForm onSuccess={onSignedIn} />
        </TabsContent>
      </Tabs>

      <p className="text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          أنشئ حساباً مجانياً
        </Link>
      </p>
    </div>
  )
}
