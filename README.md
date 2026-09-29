# ذروة (Dhurwa) — Arabic-first learning platform

A production-grade, Arabic-first (RTL) platform for test-prep courses
(Qudurat / Tahsili): courses and packages, question banks, simulated exams,
checkout with MyFatoorah, and student and admin dashboards.

```
React SPA (Vite)  ──HTTPS / JSON──▶  Laravel 12 REST API  ──▶  PostgreSQL
  /frontend                          /backend (/api/v1)
```

The SPA never touches the database. **All authentication and authorization is
enforced by Laravel** (Sanctum, middleware, policies). The route guards in the
SPA exist only for UX.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Tailwind CSS v4, shadcn/ui + Radix UI, TanStack Query, React Hook Form, Zod, Axios, Sonner (toasts), IBM Plex Sans Arabic (self-hosted) |
| Backend | Laravel 12, PHP 8.3+, Sanctum (cookie-based SPA auth), API Resources, Form Requests, Policies/Gates, Queues, Notifications, Scheduler |
| Database | PostgreSQL 16 (Eloquent + migrations) |
| Tests | Pest (backend), Vitest + Testing Library + MSW (frontend), Playwright (E2E) |
| Code quality | Laravel Pint, oxlint, `tsc --strict` |

## Repository layout

```
backend/
  app/
    Enums/                 RoleName, UserStatus
    Exceptions/            ApiExceptionRenderer (uniform error envelope), DomainException
    Http/
      Controllers/Api/V1/  Auth, User, Admin/*, Health
      Middleware/          SecurityHeaders, ForceJsonResponse, SetLocale, EnsureUserHasRole, EnsureUserIsActive
      Requests/            Form Requests (validation + authorization)
      Resources/           API Resources
    Models/                User, Role
    Policies/              UserPolicy
  config/platform.php      Frontend URL, seed accounts, auth throttling, pagination
  database/                migrations, factories, seeders
  lang/ar, lang/en         Arabic (default) and English API messages
  routes/api.php           /api/v1/*
  tests/                   Pest feature + unit tests
frontend/
  src/
    api/          Axios client, typed endpoint modules, query keys, ApiError
    components/   ui/ (shadcn primitives), common/ (Seo, states, pagination…), forms/
    features/     auth, admin, theme (hooks + feature components)
    hooks/  lib/  types/  utils/
    layouts/      Public, Auth, Student, Admin (shared DashboardShell)
    pages/        Route components
    routes/       Router, guards, root layout
    test/         MSW server, fixtures, render helpers
  e2e/            Playwright specs (run against the real API)
docs/screenshots/ UI snapshots (light/dark, desktop/mobile)
```

---

## Local setup

### Prerequisites

- PHP **8.3+** with `pdo_pgsql`, `mbstring`, `intl`
- Composer 2
- Node.js **22+** and npm
- PostgreSQL **14+** (16 recommended)

### 1. Database

```sql
CREATE USER elmonsf WITH PASSWORD 'secret' CREATEDB;
CREATE DATABASE elmonsf OWNER elmonsf;
CREATE DATABASE elmonsf_test OWNER elmonsf;   -- used by the backend test suite
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
# edit .env: DB_PASSWORD=secret (and anything else you need)
php artisan migrate:fresh --seed
php artisan storage:link               # serves uploaded avatars from /storage
php artisan serve                      # http://127.0.0.1:8000
php artisan queue:work                 # another terminal: sends queued emails
php artisan schedule:work              # another terminal: daily clean-up jobs
```

Emails (verification, password reset, sign-in codes, security alerts) are
queued, so they are only sent while `queue:work` runs. With the default
`MAIL_MAILER=log`, they are written to `storage/logs/` instead of being sent.
Use `QUEUE_CONNECTION=sync` to send them inline during development.

Check the API with `curl http://127.0.0.1:8000/api/v1/health`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local             # defaults work for local development
npm run dev                            # http://localhost:5173
```

In development, Vite proxies `/api` and `/sanctum` to Laravel, so the SPA and API
share one origin. Sanctum's session and XSRF cookies then work with no
cross-site setup.

### Seed accounts (local/testing only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `Admin@12345` |
| Instructor | `instructor@example.com` | `Demo@12345` |
| Student | `student@example.com` | `Demo@12345` |

Override these with `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD`.
Outside `local`/`testing`, the seeder **refuses to run without explicit
passwords** and creates only the admin account (no demo users).

---

## Tests

```bash
# Backend: Pest on the elmonsf_test PostgreSQL database
cd backend && vendor/bin/pest && vendor/bin/pint --test

# Frontend: lint, types, unit/integration tests, production build
cd frontend && npm run lint && npm run typecheck && npm test && npm run build

# E2E: starts Laravel + Vite and drives Chromium (desktop + mobile viewports).
# Emails go to backend/storage/logs/laravel.log, which the specs read like an
# inbox (verification links, reset links, OTP codes).
cd backend && php artisan migrate:fresh --seed
cd ../frontend && npx playwright install chromium && npm run e2e
```

If Chromium is already installed elsewhere, set
`PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

CI (`.github/workflows/ci.yml`) runs all three suites plus migrations on a
clean database.

---

## API conventions

- **Base path:** `/api/v1`. Arabic is the default language; send
  `Accept-Language: en` for English messages.
- **Success:** `{ "data": … , "message"?: "…" }`. Paginated lists add Laravel's
  `links` and `meta` (`current_page`, `per_page`, `total`, …).
- **Errors:** always `{ "message": "…", "code": "…", "errors"?: { field: [..] } }`.
  - `code` is machine-readable: `validation_failed`, `unauthenticated`,
    `forbidden`, `not_found`, `too_many_requests`, `csrf_token_mismatch`,
    `server_error`, …
  - Stack traces are never returned outside debug mode.
- **Authentication:** Sanctum SPA (stateful cookies).
  1. `GET /sanctum/csrf-cookie`
  2. `POST /api/v1/auth/login` (or `/register`) with the `X-XSRF-TOKEN` header.
     Axios sends it automatically (`withXSRFToken`).
  3. The session cookie is `httpOnly` and encrypted. The SPA never stores tokens.
- **Authorization:** the `role:admin` middleware protects `/admin/*`, and
  policies (e.g. `UserPolicy`) check every action. Suspended users are cut off
  on their next request (the `active` middleware).

### Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/health` | public |
| POST | `/api/v1/auth/register` | public (throttled) |
| POST | `/api/v1/auth/login` | public (throttled) |
| POST | `/api/v1/auth/logout` | user |
| POST | `/api/v1/auth/forgot-password` | public (throttled per address) |
| POST | `/api/v1/auth/reset-password` | public (throttled) |
| POST | `/api/v1/auth/otp/send` | public (60 s cooldown, throttled per address) |
| POST | `/api/v1/auth/otp/verify` | public (throttled) |
| POST | `/api/v1/auth/email/verify/{id}/{hash}?expires=&signature=` | signed link |
| POST | `/api/v1/auth/email/verification-notification` | user |
| GET | `/api/v1/user` | user |
| PATCH | `/api/v1/user/profile` | user |
| PATCH | `/api/v1/user/email` | user (current password) |
| POST / DELETE | `/api/v1/user/avatar` | user |
| PUT | `/api/v1/user/password` | user (current password) |
| GET | `/api/v1/user/sessions` | user |
| DELETE | `/api/v1/user/sessions/{publicId}` | user |
| POST | `/api/v1/user/sessions/revoke-others` | user (current password) |
| GET | `/api/v1/admin/overview` | admin |
| GET | `/api/v1/admin/users?search=&role=&status=&sort=&page=&per_page=` | admin |
| GET | `/api/v1/admin/users/{id}` | admin |

### Account flows

- **Email verification:** after registering, users get a signed, 60-minute
  link to `/verify-email` in the SPA. The SPA posts its parameters back to the
  API, which checks the signature and the email hash, so it works even when
  the user isn't signed in on that device. Unverified users see a banner with a
  resend button. The `verified` middleware (error code `email_unverified`) is
  ready to guard purchases in Phase 4.
- **Password reset:** the link goes to `/reset-password` in the SPA and is
  valid for 60 minutes and one use. The request returns the same response
  whether or not the email exists. A successful reset ends **all** sessions,
  rotates "remember me" tokens and sends a security alert.
- **Sign-in with a code (OTP):** a 6-digit code is sent by email. Only an HMAC
  of it is stored; it expires after 10 minutes, allows 5 attempts and one use,
  and requesting a new code cancels older ones. Arabic-Indic digits are
  accepted. Signing in with a code also verifies the email.
- **Profile:** name, phone, and email language (`locale`) can be changed.
  Changing the email requires the current password, resets verification and
  alerts the old address. Avatars are decoded and re-encoded server-side into
  a 256×256 WebP, which strips EXIF/GPS data.
- **Security:** changing the password signs out other devices. Users can see
  their active sessions (browser, OS, IP, last activity) and sign out one
  device or all others. Raw session IDs are never exposed; the API uses a
  SHA-256 public ID instead.
- **Audit log:** registration, logins (with method), logout, verification,
  password and email changes, session revocations and profile edits are
  written to `audit_logs`.

---

## Security measures (in place)

- Cookie-based Sanctum sessions (httpOnly, encrypted, `SameSite=Lax`, session
  regenerated on login, invalidated on logout) and CSRF protection on every
  mutating request.
- CORS is restricted to the SPA origin(s), with credentials.
- Brute-force throttling on login and register (per email+IP and per IP), plus a
  global API rate limit.
- Mass-assignment safety: `status` and roles can never be set from request
  input (covered by a test).
- Input normalization and sanitization in Form Requests; `LIKE` wildcards are
  escaped in search.
- No account enumeration: login uses equal-time checks for unknown emails,
  and forgot-password and OTP-send always give the same response.
- Security-alert emails for password or email changes; every sensitive change
  requires the current password.
- Security headers on every response: `nosniff`, `X-Frame-Options: DENY`,
  strict CSP for the API, `Referrer-Policy`, `Permissions-Policy`, and HSTS over
  HTTPS.
- Open-redirect protection for `?redirect=` after login.
- Strict Eloquent mode outside production (catches lazy-loading and N+1
  queries).
- Secrets live only in `backend/.env`. Nothing secret is prefixed `VITE_`.

## Payments: MyFatoorah (API v3), planned for Phase 4

Configuration is already wired into `config/services.php`. Keys stay on the
server and are never sent to the SPA.

```dotenv
MYFATOORAH_API_KEY=            # sandbox token from the MyFatoorah demo portal
MYFATOORAH_BASE_URL=https://apitest.myfatoorah.com   # live KSA: https://api-sa.myfatoorah.com
MYFATOORAH_WEBHOOK_SECRET=     # from the portal's webhook settings
MYFATOORAH_CURRENCY=SAR
```

**Sandbox setup:**

1. Create a MyFatoorah demo (test) account.
2. Copy the test API token into `MYFATOORAH_API_KEY`.
3. In the portal, enable webhooks, point them at
   `https://<api-host>/api/v1/payments/myfatoorah/webhook`, and copy the
   signature secret into `MYFATOORAH_WEBHOOK_SECRET`.
4. For local webhook testing, expose the API with a tunnel (e.g. `cloudflared`
   or `ngrok`).

The CSRF exemption for `api/v1/payments/*/webhook` is already configured.

The Phase 4 payment lifecycle:

1. Cart → checkout → local **PENDING** order.
2. Create the MyFatoorah payment and redirect to it.
3. Callback, with **server-side verification** of the payment status.
4. Webhook, with signature verification, idempotency and amount checks.
5. The transaction marks the order **PAID**, then creates the enrollment
   (duplicate-safe), generates the invoice and notifies the student.

## SEO strategy (SPA)

- **Per-page tags:** the `<Seo>` component sets the title, description,
  canonical URL, Open Graph and Twitter tags, `robots`, and JSON-LD. It updates
  the tags already in `index.html` rather than duplicating them.
  - `index.html` ships Arabic defaults for crawlers that don't run JavaScript.
  - Dashboards and other private pages are `noindex` and are also disallowed in
    `public/robots.txt`.
- **Sitemap (Phase 3):** Laravel will generate `sitemap.xml` from published
  courses, products, posts and pages. The web server proxies `/sitemap.xml` to
  it, and the absolute `Sitemap:` line is added to `robots.txt` at deploy time.
- **Shareable and crawlable HTML (hardening phase):** a server route will serve
  `index.html` with page-specific `<title>`/OG tags injected for public URLs
  (course, product and blog pages). Link previews and non-JS crawlers then get
  correct metadata without SSR. Google renders the SPA itself.

## Deployment notes

- Serve the SPA (`frontend/dist`) and the API from the same registrable domain,
  e.g. `www.example.com` + `api.example.com`. Then set:
  - `SESSION_DOMAIN=.example.com`
  - `SANCTUM_STATEFUL_DOMAINS=www.example.com`
  - `FRONTEND_URL=https://www.example.com`
  - `SESSION_SECURE_COOKIE=true`
  - frontend `VITE_API_URL=https://api.example.com`
- Alternatively, reverse-proxy `/api` and `/sanctum` from the SPA's own origin
  and leave `VITE_API_URL` empty.
- The SPA host must rewrite unknown paths to `index.html` (history routing).
- Set `TRUSTED_PROXIES` when running behind a load balancer.
- Run a queue worker (`php artisan queue:work`, supervised) and the scheduler
  (cron `* * * * * php artisan schedule:run`). It prunes expired OTP codes and
  password-reset tokens daily.
- Run `php artisan storage:link` (or serve `storage/app/public` from a CDN or
  bucket) for avatars.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: monorepo, Laravel API skeleton, Sanctum SPA auth (register/login/logout/me), roles, error envelope, security headers, Arabic i18n, React app shell, design system, layouts, admin users list, tests + CI | ✅ |
| 2 | Auth completion: email verification, forgot/reset password, email OTP sign-in, profile (avatar, email change), security (password, sessions), audit log, Arabic RTL emails | ✅ |
| 3 | Catalog: categories, courses, plans, sections/lessons, products, instructors, blog/pages/FAQ, search and filtering, sitemap | ⏳ |
| 4 | Commerce: cart, coupons, checkout, orders, MyFatoorah, webhooks, invoices, enrollments | ⏳ |
| 5 | Learning: lesson player, progress, question bank, exams and attempts | ⏳ |
| 6 | Admin CRUD for all modules, reviews, CMS, settings, audit logs | ⏳ |
| 7 | Notifications (in-app + email), scheduler jobs (expiry reminders) | ⏳ |
| 8 | Hardening: performance, accessibility pass, SEO meta injection, deployment docs | ⏳ |
