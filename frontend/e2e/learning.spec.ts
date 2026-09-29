import { expect, test } from '@playwright/test'
import { loginViaUi, registerViaUi, uniqueEmail } from './support.ts'

// Runs against the seeded demo data (php artisan migrate:fresh --seed).
const STUDENT = { email: 'student@example.com', password: 'Demo@12345' }

test('placement exam: answer, flag, submit and review', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('exam'))
  await page.goto('/dashboard/exams')

  await page.getByRole('link', { name: 'اختبار تحديد المستوى' }).click()
  await page.getByRole('button', { name: /ابدأ الاختبار/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/exams\/\d+\/attempts\/\d+$/)
  await expect(page.getByRole('timer')).toBeVisible()

  const total = 7
  for (let n = 1; n <= total; n++) {
    await expect(page.getByText(`السؤال ${n} من ${total}`)).toBeVisible()
    // Controlled input: checked after the (optimistic) save, not synchronously.
    await page.getByRole('radio').first().click()
    await expect(page.getByRole('radio').first()).toBeChecked()
    if (n === 2) await page.getByRole('button', { name: 'تمييز للمراجعة' }).click()
    if (n < total) await page.getByRole('button', { name: /التالي/ }).click()
  }
  await expect(page.getByText(`أجبت عن ${total} من ${total}`)).toBeVisible()

  await page.getByRole('button', { name: /إنهاء وتسليم/ }).click()
  const dialog = page.getByRole('dialog', { name: 'تسليم الاختبار؟' })
  await dialog.getByRole('button', { name: 'تأكيد التسليم' }).click()

  await expect(page.getByText(/^\d+(\.\d+)?%$/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'مراجعة الإجابات' })).toBeVisible()
  await expect(page.getByText('الشرح').first()).toBeVisible()

  // The attempt shows up in the exam history.
  await page.getByRole('link', { name: 'العودة إلى الاختبار' }).click()
  await expect(page.getByText('المحاولة 1')).toBeVisible()
})

test('question bank: free practice with feedback, paid banks locked', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('bank'))
  await page.goto('/dashboard/question-bank')

  await expect(page.getByRole('link', { name: /اشترِ بنك أسئلة القسم الكمي/ })).toBeVisible()
  await page.getByRole('link', { name: /ابدأ التدريب/ }).click()

  await expect(page.getByRole('button', { name: 'حاول مجدداً' })).toHaveCount(0)
  await page.getByRole('button', { name: '27 ريالاً' }).click()
  await expect(page.getByText('إجابة صحيحة')).toBeVisible()
  await expect(page.getByText(/ثمن القلم الواحد/)).toBeVisible()

  await page.getByLabel('الحالة').selectOption('correct')
  await expect(page.getByText('إجابة صحيحة')).toBeVisible()
  await expect(page.getByRole('button', { name: '27 ريالاً' })).toBeDisabled()
})

test('course player: resume, read a lesson and track completion', async ({ page }) => {
  await loginViaUi(page, STUDENT.email, STUDENT.password)
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/dashboard/courses')
  await page.getByRole('link', { name: /ابدأ التعلّم|متابعة الدورة/ }).first().click()
  await expect(page).toHaveURL(/\/dashboard\/courses\/\d+$/)
  await expect(page.getByRole('progressbar', { name: 'نسبة إكمال الدورة' })).toBeVisible()

  await page.getByRole('link', { name: /ابدأ الدورة|متابعة التعلّم/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/lessons\/\d+$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page
      .getByRole('complementary', { name: 'محتوى الدورة' })
      .or(page.getByRole('button', { name: 'محتوى الدورة' }))
      .filter({ visible: true })
      .first(),
  ).toBeVisible()

  // Toggle completion both ways so the demo account stays unchanged.
  const mark = page.getByRole('button', { name: 'تحديد كمكتمل' })
  const unmark = page.getByRole('button', { name: 'إلغاء تحديد الإكمال' })
  if (await unmark.isVisible()) {
    await unmark.click()
    await expect(mark).toBeVisible()
  }
  await mark.click()
  await expect(unmark).toBeVisible()
  await expect(page.getByText('مكتمل', { exact: true }).first()).toBeVisible()
  await unmark.click()
  await expect(mark).toBeVisible()

  await page.getByRole('link', { name: /التالي/ }).click()
  await expect(page).toHaveURL(/\/dashboard\/lessons\/\d+$/)
  await expect(page.getByRole('link', { name: /السابق/ })).toBeVisible()
})

test('paid lessons stay locked for students who are not enrolled', async ({ page }) => {
  await registerViaUi(page, uniqueEmail('locked'))
  // The demo course player requires an enrollment.
  await page.goto('/dashboard/courses/1')
  await expect(page.getByText('هذا المحتوى للمشتركين')).toBeVisible()
})
