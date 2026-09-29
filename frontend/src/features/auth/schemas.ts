import { z } from 'zod'

// Mirrors the backend Form Request rules. The server remains the source of
// truth; these give instant feedback.

const email = z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('أدخل بريداً إلكترونياً صحيحاً').max(255)

export const newPassword = z
  .string()
  .min(8, 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
  .max(255)
  .regex(/[A-Za-z؀-ۿ]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل')
  .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل')

const passwordsMatch = {
  path: ['password_confirmation'],
  message: 'كلمتا المرور غير متطابقتين',
}

export const phone = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\+?[0-9]{8,15}$/.test(v.replace(/[\s\-()]/g, '')), 'أدخل رقم جوال صحيحاً، مثل ‎+966500000000')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  remember: z.boolean(),
})
export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم قصير جداً').max(100, 'الاسم طويل جداً'),
    email,
    phone,
    password: newPassword,
    password_confirmation: z.string().min(1, 'أكّد كلمة المرور'),
  })
  .refine((d) => d.password === d.password_confirmation, passwordsMatch)
export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    password_confirmation: z.string().min(1, 'أكّد كلمة المرور'),
  })
  .refine((d) => d.password === d.password_confirmation, passwordsMatch)
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const otpEmailSchema = z.object({ email })
export type OtpEmailValues = z.infer<typeof otpEmailSchema>

export const otpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'أدخل الرمز المكوّن من 6 أرقام'),
})
export type OtpCodeValues = z.infer<typeof otpCodeSchema>
