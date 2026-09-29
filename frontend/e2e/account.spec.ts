import path from 'node:path'
import { expect, test } from '@playwright/test'
import {
  codeFrom,
  latestEmailTo,
  linkFrom,
  loginViaUi,
  logoutViaUi,
  nextEmailTo,
  registerViaUi,
  uniqueEmail,
} from './support.ts'

test('email verification: banner → link from the inbox → verified', async ({ page }) => {
  const email = uniqueEmail('verify')
  await registerViaUi(page, email)

  await expect(page.getByText(/لم تؤكد بريدك الإلكتروني بعد/)).toBeVisible()

  const mail = await latestEmailTo(email)
  expect(mail).toContain('تأكيد بريدك الإلكتروني')
  await page.goto(linkFrom(mail, '/verify-email?'))

  await expect(page.getByRole('heading', { name: 'تم تأكيد بريدك الإلكتروني' })).toBeVisible()
  await page.getByRole('link', { name: 'الانتقال إلى لوحتي' }).click()
  await expect(page.getByRole('heading', { name: /أهلاً/ })).toBeVisible()
  await expect(page.getByText(/لم تؤكد بريدك الإلكتروني بعد/)).toHaveCount(0)
})

test('forgot password: reset link from the inbox sets a new password', async ({ page }) => {
  const email = uniqueEmail('reset')
  await registerViaUi(page, email, 'OldSecret123')
  await logoutViaUi(page)

  await page.goto('/login')
  await page.getByRole('link', { name: 'نسيت كلمة المرور؟' }).click()
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click()
  await expect(page.getByRole('heading', { name: 'تحقق من بريدك الإلكتروني' })).toBeVisible()

  const mail = await latestEmailTo(email)
  expect(mail).toContain('إعادة تعيين كلمة المرور')
  await page.goto(linkFrom(mail, '/reset-password?'))

  await page.getByLabel('كلمة المرور الجديدة', { exact: true }).fill('NewSecret456')
  await page.getByLabel('تأكيد كلمة المرور').fill('NewSecret456')
  await page.getByRole('button', { name: 'حفظ كلمة المرور' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await loginViaUi(page, email, 'OldSecret123')
  await expect(page.getByText('البريد الإلكتروني أو كلمة المرور غير صحيحة.')).toBeVisible()

  await loginViaUi(page, email, 'NewSecret456')
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('passwordless login with a code from the inbox', async ({ page }) => {
  const email = uniqueEmail('otp')
  await registerViaUi(page, email)
  const verificationMail = await latestEmailTo(email)
  await logoutViaUi(page)

  await page.goto('/login')
  await page.getByRole('tab', { name: 'برمز تحقق' }).click()
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByRole('button', { name: 'إرسال رمز الدخول' }).click()

  const mail = await nextEmailTo(email, verificationMail)
  expect(mail).toContain('رمز التحقق')
  await page.getByLabel('رمز الدخول').fill(codeFrom(mail))
  await page.getByRole('button', { name: 'تأكيد وتسجيل الدخول' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  // Receiving the code proves the inbox, so the email is now verified.
  await expect(page.getByText(/لم تؤكد بريدك الإلكتروني بعد/)).toHaveCount(0)
})

test('profile: update details and upload a real avatar', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('profile'))
  await page.goto('/dashboard/profile')

  const name = page.getByLabel('الاسم الكامل')
  await name.fill('اسم محدَّث')
  await page.getByLabel('رقم الجوال').fill(`+9665${Math.floor(10_000_000 + Math.random() * 89_999_999)}`)
  await page.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(page.getByText('تم حفظ بياناتك.')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('الاسم الكامل')).toHaveValue('اسم محدَّث')

  await page.getByLabel('اختيار صورة شخصية').setInputFiles(path.resolve(import.meta.dirname, 'fixtures/avatar.png'))
  await expect(page.getByText('تم تحديث الصورة الشخصية.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'تغيير الصورة' })).toBeVisible()
})

test('security: change password, see sessions and sign out another device', async ({ browser, page }) => {
  const email = uniqueEmail('security')
  await registerViaUi(page, email, 'Secret123')

  // A second device signs in.
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await loginViaUi(otherPage, email, 'Secret123')
  await expect(otherPage).toHaveURL(/\/dashboard$/)

  await page.goto('/dashboard/security')
  const devices = page.getByRole('list', { name: 'الأجهزة المتصلة' })
  await expect(devices.getByRole('listitem')).toHaveCount(2)
  await expect(devices.getByText('هذا الجهاز')).toBeVisible()

  await page.getByRole('button', { name: 'تسجيل الخروج من الأجهزة الأخرى' }).click()
  await page.getByRole('dialog').getByLabel('كلمة المرور', { exact: true }).fill('Secret123')
  await page.getByRole('dialog').getByRole('button', { name: 'تسجيل الخروج' }).click()
  await expect(devices.getByRole('listitem')).toHaveCount(1)

  // The other device is signed out on its next request.
  await otherPage.reload()
  await expect(otherPage).toHaveURL(/\/login/)
  await other.close()

  // Change password; the old one stops working.
  await page.getByLabel('كلمة المرور الحالية').fill('Secret123')
  await page.getByLabel('كلمة المرور الجديدة', { exact: true }).fill('Changed789')
  await page.getByLabel('تأكيد كلمة المرور الجديدة').fill('Changed789')
  await page.getByRole('button', { name: 'تحديث كلمة المرور' }).click()
  await expect(page.getByText(/تم تغيير كلمة المرور/)).toBeVisible()

  // This device stays signed in.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'الأمان' })).toBeVisible()

  await logoutViaUi(page)
  await loginViaUi(page, email, 'Changed789')
  await expect(page).toHaveURL(/\/dashboard$/)
})
