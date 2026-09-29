import { expect, test } from '@playwright/test'

// Runs against the seeded demo catalog (php artisan migrate:fresh --seed).
const COURSE = 'تأسيس القسم الكمي من الصفر'

test('browse from the home page to a course, preview a lesson and pick a plan', async ({ page, isMobile }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'دورات مميّزة' })).toBeVisible()

  await page.getByRole('link', { name: COURSE }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  await expect(page).toHaveTitle(new RegExp(COURSE))

  // Structured data for search engines.
  const jsonLd = await page.locator('#seo-jsonld').textContent()
  expect(jsonLd).toContain('"@type":"Course"')
  expect(jsonLd).toContain('"@type":"BreadcrumbList"')

  // Free preview of the first lesson.
  await page.getByRole('button', { name: 'معاينة' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('ما الذي ستتعلمه؟')).toBeVisible()
  await dialog.getByRole('button', { name: 'إغلاق' }).click()

  // Choosing a plan updates every subscribe button.
  await page.getByText('وصول 3 أشهر').click()
  const cta = page.getByRole('link', { name: 'اشترك الآن' })
  const hrefs = await cta.evaluateAll((els) => els.map((e) => e.getAttribute('href')))
  expect(new Set(hrefs).size).toBe(1)
  expect(hrefs[0]).toMatch(/^\/checkout\?plan=\d+$/)

  if (isMobile) {
    // The sticky purchase bar is visible without scrolling.
    await expect(cta.last()).toBeInViewport()
  }
})

test('filter and search the catalog (arabic spelling variants)', async ({ page, isMobile }) => {
  await page.goto('/courses')
  await expect(page.getByRole('status')).toHaveText(/7 دورة/)

  if (isMobile) {
    await page.getByRole('button', { name: /تصفية/ }).click()
    await page.getByRole('dialog').getByText('القسم اللفظي').click()
    await page.getByRole('dialog').getByRole('button', { name: /عرض/ }).click()
  } else {
    await page.getByRole('complementary', { name: 'تصفية الدورات' }).getByText('القسم اللفظي').click()
  }
  await expect(page).toHaveURL(/category=qudurat-verbal/)
  await expect(page.getByRole('status')).toHaveText(/1 دورة/)
  await expect(page.getByRole('link', { name: 'القسم اللفظي الشامل' })).toBeVisible()

  // Typed without hamza and with alef maqsura; still matches "تأسيس ... الكمي".
  await page.goto('/courses')
  await page.getByRole('searchbox', { name: 'بحث' }).fill('تاسيس الكمى')
  await expect(page).toHaveURL(/search=/)
  await expect(page.getByRole('status')).toHaveText(/1 دورة/)
  await expect(page.getByRole('link', { name: COURSE })).toBeVisible()
})

test('site search, category pages, blog and CMS pages', async ({ page }) => {
  await page.goto(`/search?q=${encodeURIComponent('الكمي')}`)
  await expect(page.getByRole('heading', { name: 'الدورات' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'المنتجات' })).toBeVisible()

  await page.goto('/categories')
  await page.getByRole('link', { name: 'التحصيلي', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'التحصيلي' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'فيزياء التحصيلي المركّزة' })).toBeVisible()

  await page.goto('/blog')
  await page.getByRole('link', { name: 'خطة مذاكرة القدرات في شهر واحد' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'الأسبوع الأول: التأسيس' })).toBeVisible()

  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1, name: 'من نحن' })).toBeVisible()

  await page.goto('/faq')
  await page.getByRole('button', { name: 'كيف أشترك في دورة؟' }).click()
  await expect(page.getByText('اختر الدورة، ثم الباقة المناسبة')).toBeVisible()
})

test('draft and unknown courses are not reachable', async ({ page }) => {
  await page.goto(`/courses/${encodeURIComponent('أحياء-التحصيلي')}`)
  await expect(page.getByRole('heading', { name: 'لم نعثر على هذه الصفحة' })).toBeVisible()
})

test('contact form and newsletter', async ({ page }) => {
  await page.goto('/contact')
  await page.getByLabel('الاسم').fill('زائر الاختبار')
  await page.getByLabel('البريد الإلكتروني').fill('visitor@example.com')
  await page.getByLabel('الموضوع').fill('استفسار عن الباقات')
  await page.getByLabel('الرسالة').fill('هل يمكن ترقية الباقة من 3 إلى 6 أشهر لاحقاً؟')
  await page.getByRole('button', { name: 'إرسال الرسالة' }).click()
  await expect(page.getByText('شكراً لتواصلك!', { exact: false })).toBeVisible()

  await page.getByLabel('النشرة البريدية').fill(`news-${Date.now()}@example.com`)
  await page.getByRole('button', { name: 'اشتراك' }).click()
  await expect(page.getByText('تم اشتراكك في النشرة البريدية.')).toBeVisible()
})

test('sitemap lists public pages through the SPA origin', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.ok()).toBeTruthy()
  const xml = await res.text()
  expect(xml).toContain('<urlset')
  expect(xml).toContain(`/courses/${encodeURIComponent('تأسيس-القسم-الكمي')}`)
  expect(xml).not.toContain(encodeURIComponent('أحياء-التحصيلي'))
})
