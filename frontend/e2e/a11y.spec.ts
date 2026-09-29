import { AxeBuilder } from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { loginViaUi } from './support.ts'

/**
 * Automated WCAG 2.x A/AA checks (axe-core) on the main screens, in light
 * and dark mode. Serious and critical violations fail the build.
 */
async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const summary = blocking.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join('\n  ')}`)
  expect(summary, `${label}\n${summary.join('\n')}`).toEqual([])
}

const PUBLIC = [
  ['/', 'الرئيسية'],
  ['/courses', 'الدورات'],
  ['/login', 'تسجيل الدخول'],
  ['/register', 'إنشاء حساب'],
  ['/blog', 'المدونة'],
  ['/contact', 'تواصل معنا'],
] as const

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme })

    for (const [path, name] of PUBLIC) {
      test(`public: ${name}`, async ({ page }) => {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await audit(page, `${scheme} ${path}`)
      })
    }

    test('course page', async ({ page }) => {
      await page.goto('/courses')
      await page.getByRole('link', { name: 'تأسيس القسم الكمي من الصفر' }).first().click()
      await page.waitForLoadState('networkidle')
      await audit(page, `${scheme} course`)
    })

    test('student and admin dashboards', async ({ page }) => {
      await loginViaUi(page, 'student@example.com', 'Demo@12345')
      await expect(page).toHaveURL(/\/dashboard$/)
      for (const path of ['/dashboard', '/dashboard/courses', '/dashboard/exams', '/dashboard/question-bank']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await audit(page, `${scheme} ${path}`)
      }

      await page.context().clearCookies()
      await loginViaUi(page, 'admin@example.com', 'Admin@12345')
      await expect(page).toHaveURL(/\/admin$/)
      for (const path of ['/admin', '/admin/courses', '/admin/orders', '/admin/settings']) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await audit(page, `${scheme} ${path}`)
      }
    })
  })
}
