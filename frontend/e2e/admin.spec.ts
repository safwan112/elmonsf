import { expect, test } from '@playwright/test'
import { loginViaUi } from './support.ts'

const ADMIN = { email: 'admin@example.com', password: 'Admin@12345' }
const INSTRUCTOR = { email: 'instructor@example.com', password: 'Demo@12345' }

test('admin builds and publishes a course that appears in the catalog', async ({ page }) => {
  const title = `دورة تجريبية ${Date.now()}`
  await loginViaUi(page, ADMIN.email, ADMIN.password)
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'الإيرادات اليومية' })).toBeVisible()

  await page.goto('/admin/courses')
  await page.getByRole('button', { name: /إضافة دورة/ }).click()
  const create = page.getByRole('dialog', { name: 'إضافة دورة' })
  await create.getByLabel('عنوان الدورة *').fill(title)
  await create.getByLabel('التصنيف *').selectOption({ index: 1 })
  await create.getByRole('button', { name: 'إضافة' }).click()

  // Lands in the editor.
  await expect(page).toHaveURL(/\/admin\/courses\/\d+$/)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()

  await page.getByRole('tab', { name: /الأسعار/ }).click()
  await page.getByRole('button', { name: /إضافة خطة/ }).click()
  const plan = page.getByRole('dialog', { name: 'إضافة خطة' })
  await plan.getByLabel('اسم الخطة *').fill('شهر واحد')
  await plan.getByLabel('مدة الوصول (أيام)').fill('30')
  await plan.getByLabel('السعر * (ر.س)').fill('49')
  await plan.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByText('شهر واحد', { exact: true }).first()).toBeVisible()

  await page.getByRole('tab', { name: /المحتوى/ }).click()
  await page.getByLabel('عنوان القسم الجديد').fill('الأساسيات')
  await page.getByRole('button', { name: /إضافة قسم/ }).click()
  await expect(page.getByText('الأساسيات').first()).toBeVisible()
  await page.getByRole('button', { name: /إضافة درس/ }).click()
  const lesson = page.getByRole('dialog', { name: 'إضافة درس' })
  await lesson.getByLabel('عنوان الدرس *').fill('درس تمهيدي')
  await lesson.getByLabel('محتوى الدرس').fill('## مرحباً\n\nهذا درس تجريبي.')
  await lesson.getByRole('button', { name: 'حفظ' }).click()
  await expect(page.getByText('درس تمهيدي').first()).toBeVisible()

  await page.getByRole('tab', { name: 'البيانات' }).click()
  await page.getByLabel('الحالة').selectOption('published')
  await page.getByRole('button', { name: 'حفظ البيانات' }).click()
  const view = page.getByRole('link', { name: 'عرض في الموقع' })
  await expect(view).toBeVisible()

  // Public catalog.
  await page.goto((await view.getAttribute('href'))!)
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect(page.getByText('درس تمهيدي').first()).toBeVisible()

  // Clean up so catalog specs see the seeded catalog only.
  await page.goto(`/admin/courses?search=${encodeURIComponent(title)}`)
  await page.getByRole('button', { name: /^حذف دورة/ }).first().click()
  await page.getByRole('dialog', { name: 'حذف دورة؟' }).getByRole('button', { name: 'حذف' }).click()
  await expect(page.getByText('لا توجد عناصر')).toBeVisible()
})

test('instructors only manage their own courses', async ({ page }) => {
  await loginViaUi(page, INSTRUCTOR.email, INSTRUCTOR.password)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/courses$/)
  await expect(page.getByRole('heading', { name: 'الدورات' })).toBeVisible()

  const nav = page.getByRole('navigation', { name: 'لوحة المدرّب' }).first()
  await expect(nav.getByRole('link', { name: 'المستخدمون' })).toHaveCount(0)

  await page.goto('/admin/users')
  await expect(page.getByRole('heading', { name: 'لا تملك صلاحية الوصول' })).toBeVisible()
})
