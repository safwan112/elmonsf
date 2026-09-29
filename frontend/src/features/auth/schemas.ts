import { z } from 'zod'

// Mirrors the backend rules in RegisterRequest / LoginRequest. The server
// remains the source of truth; these give instant feedback.

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('أدخل بريداً إلكترونياً صحيحاً'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  remember: z.boolean(),
})

export type LoginValues = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'الاسم قصير جداً').max(100, 'الاسم طويل جداً'),
    email: z.string().trim().min(1, 'البريد الإلكتروني مطلوب').email('أدخل بريداً إلكترونياً صحيحاً').max(255),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\+?[0-9]{8,15}$/.test(v.replace(/[\s\-()]/g, '')), 'أدخل رقم جوال صحيحاً، مثل ‎+966500000000'),
    password: z
      .string()
      .min(8, 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
      .regex(/[A-Za-z؀-ۿ]/, 'يجب أن تحتوي كلمة المرور على حرف واحد على الأقل')
      .regex(/[0-9]/, 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل'),
    password_confirmation: z.string().min(1, 'أكّد كلمة المرور'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
    message: 'كلمتا المرور غير متطابقتين',
  })

export type RegisterValues = z.infer<typeof registerSchema>
