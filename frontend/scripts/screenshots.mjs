// Captures screenshots of every screen against the running dev stack
// (Laravel :8000 with the MyFatoorah simulator + Vite :5173, seeded demo data).
//   node scripts/screenshots.mjs <outDir>
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import path from 'node:path'

const BASE = 'http://localhost:5173'
const OUT = path.resolve(process.argv[2] ?? '../docs/screenshots/full')
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined })
const shots = []

async function newPage(viewport = { width: 1440, height: 900 }, isMobile = false) {
  const context = await browser.newContext({ viewport, isMobile, hasTouch: isMobile, deviceScaleFactor: 1, locale: 'ar-SA', timezoneId: 'Asia/Riyadh' })
  return context.newPage()
}

async function settle(page) {
  await page.waitForLoadState('networkidle').catch(() => {})
  // Wait for skeletons/spinners to go away.
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"], .animate-shimmer'), null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(400)
}

async function shot(page, name, { fullPage = true } = {}) {
  await settle(page)
  const file = path.join(OUT, `${name}.png`)
  await page.screenshot({ path: file, fullPage })
  shots.push(file)
  console.log('✓', name)
}

async function visit(page, url, name, opts) {
  await page.goto(BASE + url)
  await shot(page, name, opts)
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`)
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
  await page.waitForURL(/\/(dashboard|admin)$/)
}

const COURSE = 'تأسيس القسم الكمي من الصفر'

// ---- Public website (visitor) ----------------------------------------------
{
  const page = await newPage()
  await visit(page, '/', '01-home')
  await visit(page, '/courses', '02-courses')
  await page.getByRole('link', { name: COURSE }).first().click()
  await shot(page, '03-course-detail')
  await page.getByRole('button', { name: 'معاينة' }).first().click()
  await shot(page, '04-lesson-preview', { fullPage: false })
  await visit(page, '/categories', '05-categories')
  await visit(page, '/categories/qudurat', '06-category')
  await visit(page, '/products', '07-products')
  await page.locator('main a[href^="/products/"]').first().click()
  await shot(page, '08-product-detail')
  await visit(page, '/instructors', '09-instructors')
  await page.locator('main a[href^="/instructors/"]').first().click()
  await shot(page, '10-instructor')
  await visit(page, '/blog', '11-blog')
  await page.locator('main a[href^="/blog/"]').first().click()
  await shot(page, '12-blog-post')
  await visit(page, `/search?q=${encodeURIComponent('الكمي')}`, '13-search')
  await visit(page, '/faq', '14-faq')
  await visit(page, '/contact', '15-contact')
  await visit(page, '/about', '16-about')
  await visit(page, '/login', '17-login')
  await visit(page, '/register', '18-register')
  await visit(page, '/forgot-password', '19-forgot-password')
  await visit(page, '/no-such-page', '20-not-found')
  await page.context().close()
}

// ---- Student: purchase flow, learning, dashboard ----------------------------
{
  const page = await newPage()
  await login(page, 'student@example.com', 'Demo@12345')

  // Buy a second course through the MyFatoorah simulator.
  await page.goto(`${BASE}/courses`)
  await page.getByRole('link', { name: 'القسم اللفظي الشامل' }).first().click()
  await page.getByRole('link', { name: 'اشترك الآن' }).filter({ visible: true }).first().click()
  await page.waitForURL(/\/checkout$/)
  await page.goto(`${BASE}/cart`)
  await shot(page, '21-cart')
  await page.goto(`${BASE}/checkout`)
  await page.getByRole('checkbox').check()
  await shot(page, '22-checkout')
  await page.getByRole('button', { name: /ادفع/ }).click()
  await page.getByRole('heading', { name: 'محاكي بوابة الدفع' }).waitFor()
  await shot(page, '23-payment-gateway-simulator', { fullPage: false })
  await page.getByRole('button', { name: 'دفع ناجح' }).click()
  await page.getByRole('heading', { name: /تم الدفع بنجاح/ }).waitFor()
  await shot(page, '24-payment-success')

  await visit(page, '/dashboard', '25-student-dashboard')
  await visit(page, '/dashboard/courses', '26-my-courses')
  await page.getByRole('link', { name: /ابدأ التعلّم|متابعة الدورة/ }).first().click()
  await shot(page, '27-course-player')
  await page.getByRole('link', { name: /ابدأ الدورة|متابعة التعلّم/ }).click()
  await shot(page, '28-lesson')

  // Exams: take the placement exam.
  await visit(page, '/dashboard/exams', '29-exams')
  await page.getByRole('link', { name: 'اختبار تحديد المستوى' }).click()
  await shot(page, '30-exam-detail')
  await page.getByRole('button', { name: /ابدأ الاختبار/ }).click()
  await page.waitForURL(/attempts\/\d+$/)
  await page.getByRole('radio').nth(1).click()
  await page.getByRole('button', { name: 'تمييز للمراجعة' }).click()
  await shot(page, '31-exam-in-progress', { fullPage: false })
  for (let i = 0; i < 7; i++) {
    await page.getByRole('radio').nth(i % 2).click()
    if (i < 6) await page.getByRole('button', { name: /التالي/ }).click()
  }
  await page.getByRole('button', { name: /إنهاء وتسليم/ }).click()
  await shot(page, '32-exam-submit-dialog', { fullPage: false })
  await page.getByRole('button', { name: 'تأكيد التسليم' }).click()
  await page.getByRole('heading', { name: 'مراجعة الإجابات' }).waitFor()
  await shot(page, '33-exam-result')

  // Question bank practice.
  await visit(page, '/dashboard/question-bank', '34-question-banks')
  await page.getByRole('link', { name: /ابدأ التدريب|متابعة التدريب/ }).first().click()
  await settle(page)
  await page.locator('ol > li').first().getByRole('button').nth(1).click()
  await shot(page, '35-question-practice')

  await visit(page, '/dashboard/orders', '36-orders')
  await page.locator('main a[href^="/dashboard/orders/"]').first().click()
  await shot(page, '37-order-detail')
  await visit(page, '/dashboard/invoices', '38-invoices')
  await page.locator('main a[href^="/dashboard/invoices/"]').first().click()
  await shot(page, '39-invoice')
  await visit(page, '/dashboard/notifications', '40-notifications')
  await visit(page, '/dashboard/profile', '41-profile')
  await visit(page, '/dashboard/security', '42-security')
  await page.goto(`${BASE}/dashboard`)
  await settle(page)
  await page.getByRole('button', { name: /^الإشعارات/ }).first().click()
  await shot(page, '43-notification-bell', { fullPage: false })
  await page.context().close()
}

// ---- Admin -------------------------------------------------------------------
{
  const page = await newPage()
  await login(page, 'admin@example.com', 'Admin@12345')
  await shot(page, '44-admin-overview')
  await visit(page, '/admin/courses', '45-admin-courses')
  await page.locator('main a[href^="/admin/courses/"]').first().click()
  await shot(page, '46-admin-course-details')
  await page.getByRole('tab', { name: /الأسعار/ }).click()
  await shot(page, '47-admin-course-pricing')
  await page.getByRole('tab', { name: /المحتوى/ }).click()
  await shot(page, '48-admin-course-curriculum')
  await page.getByRole('button', { name: /^تعديل / }).nth(1).click()
  await shot(page, '49-admin-lesson-editor', { fullPage: false })
  await page.keyboard.press('Escape')

  const admin = [
    ['/admin/products', '50-admin-products'],
    ['/admin/categories', '51-admin-categories'],
    ['/admin/instructors', '52-admin-instructors'],
    ['/admin/question-banks', '53-admin-question-banks'],
    ['/admin/questions', '54-admin-questions'],
    ['/admin/exams', '55-admin-exams'],
  ]
  for (const [url, name] of admin) await visit(page, url, name)
  await page.locator('main a[href^="/admin/exams/"]').first().click()
  await shot(page, '56-admin-exam-editor')
  await page.goto(`${BASE}/admin/questions`)
  await settle(page)
  await page.getByRole('button', { name: /إضافة سؤال/ }).click()
  await shot(page, '57-admin-question-form', { fullPage: false })
  await page.keyboard.press('Escape')

  const more = [
    ['/admin/orders', '58-admin-orders'],
    ['/admin/payments', '60-admin-payments'],
    ['/admin/coupons', '61-admin-coupons'],
    ['/admin/users', '62-admin-users'],
    ['/admin/reviews', '63-admin-reviews'],
    ['/admin/blog', '64-admin-blog'],
    ['/admin/pages', '65-admin-pages'],
    ['/admin/faqs', '66-admin-faqs'],
    ['/admin/testimonials', '67-admin-testimonials'],
    ['/admin/notifications', '68-admin-announcements'],
    ['/admin/messages', '69-admin-messages'],
    ['/admin/settings', '70-admin-settings'],
    ['/admin/audit-logs', '71-admin-audit-log'],
  ]
  for (const [url, name] of more) await visit(page, url, name)
  await page.goto(`${BASE}/admin/orders`)
  await settle(page)
  await page.locator('main a[href^="/admin/orders/"]').first().click()
  await shot(page, '59-admin-order-detail')
  await page.context().close()
}

// ---- Instructor ----------------------------------------------------------------
{
  const page = await newPage()
  await login(page, 'instructor@example.com', 'Demo@12345')
  await visit(page, '/admin', '72-instructor-courses')
  await page.context().close()
}

// ---- Mobile + dark mode -------------------------------------------------------------
{
  const page = await newPage({ width: 390, height: 844 }, true)
  await visit(page, '/', 'm1-mobile-home', { fullPage: false })
  await page.goto(`${BASE}/courses`)
  await page.getByRole('link', { name: COURSE }).first().click()
  await shot(page, 'm2-mobile-course', { fullPage: false })
  await login(page, 'student@example.com', 'Demo@12345')
  await shot(page, 'm3-mobile-dashboard', { fullPage: false })
  await page.context().close()

  const dark = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', locale: 'ar-SA' })
  const d = await dark.newPage()
  await visit(d, '/', 'd1-dark-home', { fullPage: false })
  await d.goto(`${BASE}/courses`)
  await d.getByRole('link', { name: COURSE }).first().click()
  await shot(d, 'd2-dark-course', { fullPage: false })
  await dark.close()
}

await browser.close()
console.log(`\n${shots.length} screenshots in ${OUT}`)
