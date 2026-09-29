import { expect, test, type Page } from '@playwright/test'

// Seeded by `php artisan db:seed` (local/testing defaults documented in README).
const ADMIN = { email: 'admin@example.com', password: 'Admin@12345' }
const STUDENT = { email: 'student@example.com', password: 'Demo@12345' }

async function login(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

async function openAccountMenu(page: Page) {
  await page.getByRole('button', { name: 'قائمة الحساب' }).click()
}

test('home page is Arabic, RTL and has SEO tags', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('القدرات والتحصيلي')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/)
  await expect(page.locator('#seo-jsonld')).toBeAttached()
})

test('a visitor can register, lands on the dashboard, and the session persists', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`

  await page.goto('/register')
  await page.getByLabel('الاسم الكامل').fill('طالب الاختبار الآلي')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill('Secret123')
  await page.getByLabel('تأكيد كلمة المرور').fill('Secret123')
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: /أهلاً طالب/ })).toBeVisible()

  // Session cookie survives a full reload.
  await page.reload()
  await expect(page.getByRole('heading', { name: /أهلاً طالب/ })).toBeVisible()

  // A student cannot open the admin area.
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'لا تملك صلاحية الوصول' })).toBeVisible()
})

test('login rejects wrong credentials with an Arabic message', async ({ page }) => {
  await login(page, { email: STUDENT.email, password: 'wrong-password-1' })
  await expect(page.getByText('البريد الإلكتروني أو كلمة المرور غير صحيحة.')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
})

test('guests are redirected to login and returned after signing in', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard/)

  await page.getByLabel('البريد الإلكتروني').fill(STUDENT.email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(STUDENT.password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: /أهلاً/ })).toBeVisible()
})

test('admin signs in to the admin area, browses users, and logs out', async ({ page }) => {
  await login(page, ADMIN)

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('heading', { name: 'نظرة عامة' })).toBeVisible()
  await expect(page.getByText('إجمالي المستخدمين')).toBeVisible()

  await page.goto('/admin/users')
  await page.getByLabel('بحث في المستخدمين').fill('student@example.com')
  await expect(page.getByRole('table').getByText('student@example.com')).toBeVisible()
  await expect(page.getByRole('table').getByText('admin@example.com')).toHaveCount(0)

  await openAccountMenu(page)
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click()
  await expect(page).toHaveURL(/\/$/)

  // The server session is gone: private pages redirect to login again.
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/login/)
})

test('the API itself refuses admin data to students (not just the UI)', async ({ page }) => {
  await login(page, STUDENT)
  await expect(page).toHaveURL(/\/dashboard$/)

  const status = await page.evaluate(async () => {
    const res = await fetch('/api/v1/admin/users', { headers: { Accept: 'application/json' }, credentials: 'include' })
    return res.status
  })
  expect(status).toBe(403)
})
