import { expect, test } from '@playwright/test'
import { loginViaUi, registerViaUi, uniqueEmail } from './support.ts'

const ADMIN = { email: 'admin@example.com', password: 'Admin@12345' }

test('new students get a welcome notification and admin announcements', async ({ page, browser }) => {
  await registerViaUi(page, uniqueEmail('notify'))

  // Welcome notification in the bell.
  await page.getByRole('button', { name: /الإشعارات \(1 غير مقروءة\)/ }).click()
  await page.getByRole('menuitem', { name: /أهلاً بك/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/exams$/)
  await expect(page.getByRole('button', { name: 'الإشعارات', exact: true })).toBeVisible()

  // An admin announces something to all students (separate browser session).
  const adminContext = await browser.newContext()
  const adminPage = await adminContext.newPage()
  await loginViaUi(adminPage, ADMIN.email, ADMIN.password)
  await expect(adminPage).toHaveURL(/\/admin$/)
  await adminPage.goto('/admin/notifications')
  const title = `إعلان تجريبي ${Date.now()}`
  await adminPage.getByLabel('العنوان *').fill(title)
  await adminPage.getByLabel('النص *').fill('جلسة مراجعة مباشرة غداً.')
  await adminPage.getByLabel('رابط داخلي (اختياري)').fill('/courses')
  await expect(adminPage.getByText(/سيصل إلى \d+ مستخدم/)).toBeVisible()
  await adminPage.getByRole('button', { name: 'إرسال' }).click()
  await expect(adminPage.getByText(title)).toBeVisible()
  await expect(adminPage.getByText('أُرسل').first()).toBeVisible()
  await adminContext.close()

  // The student sees it in the notifications page.
  await page.goto('/dashboard/notifications')
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible()
  await page.getByRole('button', { name: 'تحديد الكل كمقروء' }).click()
  await expect(page.getByText('كل إشعاراتك مقروءة.')).toBeVisible()
  await page.getByRole('link', { name: new RegExp(title) }).click()
  await expect(page).toHaveURL(/\/courses$/)
})
