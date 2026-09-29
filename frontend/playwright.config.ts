import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests run the real stack: Laravel API (port 8000) + Vite dev
 * server (port 5173, proxying /api and /sanctum to Laravel) + PostgreSQL.
 * Prepare the database first:  cd ../backend && php artisan migrate:fresh --seed
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
  ],
  webServer: [
    {
      // - The suite signs in repeatedly across two viewports: relax the limiters.
      // - Emails are written to storage/logs/laravel.log (read by e2e/support.ts)
      //   and sent synchronously, so no queue worker is needed.
      command: [
        'AUTH_THROTTLE_PER_MINUTE=100 AUTH_THROTTLE_IP_PER_MINUTE=500 AUTH_EMAILS_PER_HOUR=100',
        'QUEUE_CONNECTION=sync MAIL_MAILER=log LOG_CHANNEL=single',
        'php artisan serve --host=127.0.0.1 --port=8000',
      ].join(' '),
      cwd: '../backend',
      url: 'http://127.0.0.1:8000/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
