import { zodResolver } from '@hookform/resolvers/zod'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FormField } from '@/components/forms/form-field'
import { OtpInput } from '@/components/forms/otp-input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@/types/user'
import { applyServerErrors } from './apply-server-errors'
import { otpCodeSchema, otpEmailSchema, type OtpCodeValues, type OtpEmailValues } from './schemas'
import { useSendOtp, useVerifyOtp } from './use-auth'

function useCountdown(seconds: number) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (left <= 0) return
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [left])
  return { left, start: () => setLeft(seconds) }
}

/**
 * Two-step passwordless sign-in: email → 6-digit code sent by email.
 */
export function OtpLoginForm({ onSuccess }: { onSuccess: (user: User) => void }) {
  const [email, setEmail] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const send = useSendOtp()
  const verify = useVerifyOtp()
  const cooldown = useCountdown(60)

  const emailForm = useForm<OtpEmailValues>({ resolver: zodResolver(otpEmailSchema), defaultValues: { email: '' } })
  const codeForm = useForm<OtpCodeValues>({ resolver: zodResolver(otpCodeSchema), defaultValues: { code: '' } })

  const requestCode = (target: string) => {
    setFormError(null)
    send.mutate(target, {
      onSuccess: () => {
        setEmail(target)
        cooldown.start()
        codeForm.reset({ code: '' })
      },
      onError: (error) => setFormError(applyServerErrors(error, emailForm.setError, ['email'])),
    })
  }

  // Move focus to the code field once it appears (keyboard & screen readers).
  useEffect(() => {
    if (email) codeForm.setFocus('code')
  }, [email, codeForm])

  const onEmailSubmit = emailForm.handleSubmit(({ email: value }) => requestCode(value))

  const onCodeSubmit = codeForm.handleSubmit(({ code }) => {
    if (!email) return
    setFormError(null)
    verify.mutate(
      { email, code, remember: true },
      {
        onSuccess: (res) => onSuccess(res.data),
        onError: (error) => setFormError(applyServerErrors(error, codeForm.setError, ['code'])),
      },
    )
  })

  const errorAlert = formError && (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertDescription>{formError}</AlertDescription>
    </Alert>
  )

  if (!email) {
    return (
      <form onSubmit={onEmailSubmit} noValidate className="grid gap-5">
        {errorAlert}
        <p className="text-sm text-muted-foreground">سنرسل رمز دخول مكوّناً من 6 أرقام إلى بريدك، دون الحاجة إلى كلمة المرور.</p>
        <FormField label="البريد الإلكتروني" error={emailForm.formState.errors.email?.message}>
          <Input type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" {...emailForm.register('email')} />
        </FormField>
        <Button type="submit" size="lg" loading={send.isPending} className="w-full">
          إرسال رمز الدخول
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={onCodeSubmit} noValidate className="grid gap-5">
      {errorAlert}
      <p className="text-sm text-muted-foreground" role="status">
        أدخل الرمز المرسل إلى <span className="font-semibold text-foreground ltr-nums">{email}</span>
      </p>
      <FormField label="رمز الدخول" error={codeForm.formState.errors.code?.message}>
        {(control) => (
          <Controller
            control={codeForm.control}
            name="code"
            render={({ field }) => (
              <OtpInput {...control} ref={field.ref} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
        )}
      </FormField>
      <Button type="submit" size="lg" loading={verify.isPending} className="w-full">
        تأكيد وتسجيل الدخول
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" className="font-medium text-muted-foreground hover:text-foreground" onClick={() => setEmail(null)}>
          تغيير البريد
        </button>
        <Button
          type="button"
          variant="link"
          size="sm"
          disabled={cooldown.left > 0 || send.isPending}
          onClick={() => requestCode(email)}
          className="px-0"
        >
          {cooldown.left > 0 ? `إعادة الإرسال بعد ${cooldown.left} ث` : 'إعادة إرسال الرمز'}
        </Button>
      </div>
    </form>
  )
}
