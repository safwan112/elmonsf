import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, type Page } from '@playwright/test'

/**
 * The E2E API server runs with MAIL_MAILER=log and LOG_CHANNEL=single, so
 * every email lands in backend/storage/logs/laravel.log. These helpers read
 * the latest email sent to an address, the way a user would open their inbox.
 */
const LOG_FILE = path.resolve(import.meta.dirname, '../../backend/storage/logs/laravel.log')

export async function latestEmailTo(email: string, { timeout = 10_000 } = {}): Promise<string> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    let log = ''
    try {
      // Laravel's log mailer writes messages already decoded (UTF-8).
      log = readFileSync(LOG_FILE, 'utf8')
    } catch {
      // Not created yet.
    }
    const entries = log
      .split(/^(?=\[\d{4}-\d{2}-\d{2}[ T])/m)
      .filter((e) => e.includes('To: ') && e.includes(email))
    const last = entries.at(-1)
    if (last) return last
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No email to ${email} found in ${LOG_FILE}`)
}

/** Wait for a *new* email (one that differs from `previous`). */
export async function nextEmailTo(email: string, previous: string | null, timeout = 10_000): Promise<string> {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const mail = await latestEmailTo(email, { timeout }).catch(() => null)
    if (mail && mail !== previous) return mail
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`No new email to ${email}`)
}

export function linkFrom(mail: string, pathPrefix: string): string {
  const match = mail.match(new RegExp(`https?://[^\\s"'<>)\\]]+${pathPrefix.replace(/[/?]/g, '\\$&')}[^\\s"'<>)\\]]*`))
  if (!match) throw new Error(`No ${pathPrefix} link in email`)
  // Links in HTML bodies escape & as &amp;.
  return match[0].replace(/&amp;/g, '&')
}

export function codeFrom(mail: string): string {
  // The code is rendered in bold: **123456** (text) / <strong>123456</strong> (HTML).
  const match = mail.match(/(?:\*\*|<strong>)(\d{6})(?:\*\*|<\/strong>)/)
  if (!match?.[1]) throw new Error('No 6-digit code in email')
  return match[1]
}

export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

export async function registerViaUi(page: Page, email: string, password = 'Secret123', name = 'مستخدم الاختبار') {
  await page.goto('/register')
  await page.getByLabel('الاسم الكامل').fill(name)
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password)
  await page.getByLabel('تأكيد كلمة المرور').fill(password)
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click()
}

export async function logoutViaUi(page: Page) {
  await page.getByRole('button', { name: 'قائمة الحساب' }).click()
  await page.getByRole('menuitem', { name: 'تسجيل الخروج' }).click()
  await expect(page).toHaveURL(/\/$/)
}
