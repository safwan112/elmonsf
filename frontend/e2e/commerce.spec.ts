import { expect, test, type Page } from '@playwright/test'
import { latestEmailTo, linkFrom, registerViaUi, uniqueEmail } from './support.ts'

/**
 * Purchase flows against the real API with MYFATOORAH_BASE_URL pointing at the
 * local MyFatoorah simulator (see playwright.config.ts). The real gateway
 * client, callback verification and webhook handling all run unchanged.
 */
const COURSE = 'تأسيس القسم الكمي من الصفر'
const API = 'http://127.0.0.1:8000'

async function registerVerified(page: Page) {
  const email = uniqueEmail('buyer')
  await registerViaUi(page, email)
  await page.goto(linkFrom(await latestEmailTo(email), '/verify-email?'))
  await expect(page.getByRole('heading', { name: 'تم تأكيد بريدك الإلكتروني' })).toBeVisible()
  return email
}

/** Browse to the course, subscribe and reach the hosted payment page. */
async function subscribeAndOpenGateway(page: Page) {
  await page.goto('/courses')
  await page.getByRole('link', { name: COURSE }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: COURSE })).toBeVisible()
  await page.getByRole('link', { name: 'اشترك الآن' }).filter({ visible: true }).first().click()

  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByRole('link', { name: COURSE })).toBeVisible()
  const pay = page.getByRole('button', { name: /ادفع/ })
  await pay.click()
  await expect(page.getByText('يجب الموافقة على الشروط وسياسة الاسترجاع للمتابعة')).toBeVisible()

  await page.getByRole('checkbox').check()
  await pay.click()
  await expect(page.getByRole('heading', { name: 'محاكي بوابة الدفع' })).toBeVisible()
}

/** The paymentId MyFatoorah appends to the callback URL. */
function capturePaymentIds(page: Page) {
  const ids: string[] = []
  page.on('request', (req) => {
    const id = new URL(req.url()).searchParams.get('paymentId')
    if (id && req.url().includes('/payments/myfatoorah/callback')) ids.push(id)
  })
  return ids
}

test('buy a course: checkout → MyFatoorah → verified callback → enrollment → invoice → webhook', async ({ page, request }) => {
  await registerVerified(page)
  const paymentIds = capturePaymentIds(page)

  await subscribeAndOpenGateway(page)
  await page.getByRole('button', { name: 'دفع ناجح' }).click()

  // Callback verified server-side, then back to the SPA.
  await expect(page).toHaveURL(/\/payment\/success\?order=ORD-/)
  await expect(page.getByRole('heading', { name: /تم الدفع بنجاح/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'عرض الفاتورة' })).toBeVisible()

  // Enrollment → access the purchased course.
  await page.getByRole('link', { name: 'ابدأ التعلّم' }).click()
  await expect(page).toHaveURL(/\/dashboard\/courses$/)
  await expect(page.getByRole('heading', { name: COURSE })).toBeVisible()
  await page.getByRole('link', { name: 'متابعة الدورة' }).click()
  await expect(page.getByText('أنت مشترك في هذه الدورة').filter({ visible: true }).first()).toBeVisible()

  // Order + invoice in the dashboard; the cart is empty again.
  await page.goto('/dashboard/orders')
  await expect(page.getByText('مدفوع')).toBeVisible()
  await page.goto('/dashboard/invoices')
  await page.getByRole('link', { name: /^INV-/ }).click()
  await expect(page.getByRole('heading', { name: 'فاتورة ضريبية مبسّطة' })).toBeVisible()
  await expect(page.getByText(COURSE)).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByText('سلتك فارغة')).toBeVisible()

  // MyFatoorah's signed webhook for the same payment is accepted once and
  // then recognised as a duplicate; a forged signature is rejected.
  expect(paymentIds).toHaveLength(1)
  const { payload, signature } = await (await request.get(`${API}/__myfatoorah-sim/webhook-payload/${paymentIds[0]}`)).json()
  const send = (sig: string) =>
    request.post(`${API}/api/v1/payments/myfatoorah/webhook`, {
      data: payload,
      headers: { 'MyFatoorah-Signature': sig, Accept: 'application/json' },
    })

  const first = await send(signature)
  expect(first.status()).toBe(200)
  const second = await send(signature)
  expect(await second.json()).toMatchObject({ received: true, duplicate: true })
  expect((await send(Buffer.from('forged').toString('base64'))).status()).toBe(401)

  // Still exactly one enrollment.
  await page.goto('/dashboard/courses')
  await expect(page.getByRole('heading', { name: COURSE })).toHaveCount(1)
})

test('declined card: failed page → retry → paid', async ({ page }) => {
  await registerVerified(page)
  await subscribeAndOpenGateway(page)
  await page.getByRole('button', { name: 'رفض البطاقة' }).click()

  await expect(page).toHaveURL(/\/payment\/failed\?order=ORD-/)
  await expect(page.getByRole('heading', { name: 'لم تكتمل عملية الدفع' })).toBeVisible()
  await expect(page.getByText('فشل الدفع')).toBeVisible()

  await page.getByRole('button', { name: 'إعادة المحاولة' }).click()
  await expect(page.getByRole('heading', { name: 'محاكي بوابة الدفع' })).toBeVisible()
  await page.getByRole('button', { name: 'دفع ناجح' }).click()

  await expect(page.getByRole('heading', { name: /تم الدفع بنجاح/ })).toBeVisible()
  await page.goto('/dashboard/courses')
  await expect(page.getByRole('heading', { name: COURSE })).toBeVisible()
})

test('unverified accounts cannot pay', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('unverified'))
  await page.goto('/courses')
  await page.getByRole('link', { name: COURSE }).first().click()
  await page.getByRole('link', { name: 'اشترك الآن' }).filter({ visible: true }).first().click()

  await expect(page.getByText('أكّد بريدك الإلكتروني لإتمام الدفع')).toBeVisible()
  await expect(page.getByRole('button', { name: /ادفع/ })).toBeDisabled()
})
