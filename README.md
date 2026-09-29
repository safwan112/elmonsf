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
| GET | `/api/v1/categories`, `/categories/{slug}` | public |
| GET | `/api/v1/courses?search=&category=&instructor=&level=&min_price=&max_price=&featured=&sort=&page=&per_page=` | public |
| GET | `/api/v1/courses/{slug}` (plans, curriculum, related) | public |
| GET | `/api/v1/courses/{slug}/lessons/{id}/preview` | public (preview lessons only) |
| GET | `/api/v1/products?search=&category=&type=&featured=&sort=`, `/products/{slug}` | public |
| GET | `/api/v1/instructors`, `/instructors/{slug}` | public |
| GET | `/api/v1/search?q=` (courses, products, posts) | public (throttled) |
| GET | `/api/v1/posts?search=&tag=`, `/posts/{slug}` | public |
| GET | `/api/v1/pages/{slug}`, `/faqs?group=`, `/testimonials`, `/settings` | public |
| POST | `/api/v1/contact` (honeypot) | public (throttled) |
| POST | `/api/v1/newsletter/subscribe`, `/newsletter/unsubscribe` | public (throttled) |
| GET | `/sitemap.xml` (web route, cached 1 h) | public |
| GET | `/api/v1/admin/overview` | admin |
| GET | `/api/v1/admin/users?search=&role=&status=&sort=&page=&per_page=` | admin |
| GET | `/api/v1/admin/users/{id}` | admin |
| GET | `/api/v1/cart` | user |
| POST | `/api/v1/cart/items` (`{type: course_plan\|product, id}`) | user |
| DELETE | `/api/v1/cart/items/{id}` | user |
| POST / DELETE | `/api/v1/cart/coupon` | user (throttled) |
| POST | `/api/v1/checkout` (`accept_terms`, `billing_name`, `billing_phone`) | verified user (throttled) |
| POST | `/api/v1/payments/myfatoorah/create` (`order_number`) | verified user (throttled) |
| GET | `/api/v1/payments/myfatoorah/callback?paymentId=` | public (verified server-side) |
| POST | `/api/v1/payments/myfatoorah/webhook` | MyFatoorah (signed, throttled) |
| GET | `/api/v1/orders`, `/orders/{number}` | owner |
| POST | `/api/v1/orders/{number}/cancel` | owner (unpaid orders) |
| GET | `/api/v1/invoices`, `/invoices/{number}` | owner |
| GET | `/api/v1/enrollments` | user |
| GET | `/api/v1/admin/orders?status=&search=`, `/admin/orders/{number}` | admin |
| POST | `/api/v1/admin/orders/{number}/refund` | admin |
| GET | `/api/v1/learning/courses/{id}` (curriculum, progress, exams) | enrolled |
| GET | `/api/v1/learning/lessons/{id}` | enrolled (or preview lesson) |
| POST | `/api/v1/learning/lessons/{id}/progress` (`completed`, `position_seconds`) | enrolled |
| GET | `/api/v1/learning/attachments/{id}` | enrolled |
| GET | `/api/v1/exams`, `/exams/{id}` | user (free / enrolled / owned) |
| POST | `/api/v1/exams/{id}/attempts` (start or resume) | user (throttled) |
| GET | `/api/v1/attempts/{id}` | owner (admins read-only) |
| PUT | `/api/v1/attempts/{id}/answers` (`question_id`, `option_id`, `flagged`) | owner |
| POST | `/api/v1/attempts/{id}/submit` | owner |
| GET | `/api/v1/question-banks`, `/question-banks/{id}` | user |
| GET | `/api/v1/question-banks/{id}/questions?topic=&difficulty=&status=` | unlocked bank |
| POST | `/api/v1/question-banks/{id}/questions/{question}/answer` | unlocked bank (throttled) |

### Catalog & content

- **Money:** amounts are stored as integers in minor units (halalas). The API
  returns `{ amount, amount_minor, currency }`. Course plans have a price, an
  optional compare-at price and an access length (`duration_days`), e.g.
  3 or 6 months.
- **Arabic search:** each searchable model keeps a normalised `search_text`
  column. Normalisation removes diacritics and tatweel, unifies أ/إ/آ→ا,
  ة→ه and ى→ي, and converts Arabic-Indic digits. Every search term must match
  (the terms are escaped), and results are ranked by `pg_trgm` similarity over
  a GIN trigram index. So «تاسيس الكمى» finds «تأسيس القسم الكمي».
- **Rich text:** content is written in Markdown and rendered on the server
  with raw HTML stripped and unsafe links removed. The SPA displays it with
  shared `.rich-text` styles.
- **Paid content never leaks:** the public course endpoint returns only the
  curriculum outline. Lesson bodies and video references are hidden at the
  model level, and only lessons marked as preview can be fetched through the
  preview endpoint.
- **Visibility:** only `published` items whose `published_at` has passed are
  public, which also allows scheduling. Drafts and archived items return 404.
- **Categories:** filtering by a parent category includes its sub-categories.
- **Demo data:** `DemoCatalogSeeder` and `DemoContentSeeder` create an
  original Arabic demo catalog in non-production environments: 11 categories,
  3 instructors, 8 courses (one of them a draft), 4 products, 3 posts, pages,
  FAQs and testimonials. The legal pages are placeholders and must be
  replaced before launch.

### Learning

- **Access rules** live in one place (`App\Services\Learning\LearningAccess`),
  and the `Lesson`, `Exam` and `QuestionBank` policies delegate to it:
  - Admins can open everything.
  - Instructors can open the courses they teach.
  - Students need a current enrollment (active and not expired) for course
    content, or an active product entitlement for products such as a
    question bank.
  - Exams and banks with neither a course nor a product are free for any
    signed-in student.
  - Locked content answers `403 content_locked`, so the SPA can show the
    purchase path.
- **Progress:** viewing a lesson records it for "continue where you left
  off". Students mark lessons complete explicitly. Course progress counts
  published lessons only and is returned with every enrollment.
- **Exams:**
  - Starting an attempt freezes the question order, the option order (when
    shuffled) and the points, so later edits never change a running attempt.
  - Answers autosave one at a time. Correct options and explanations are
    never sent before the attempt is finished, and afterwards only if the exam
    allows reviewing answers.
  - The deadline is enforced on the server, with a 30-second grace period for
    in-flight saves. Late attempts are graded automatically: on the next
    request, or by `exams:close-expired` every 5 minutes.
  - Attempt limits are checked under a row lock, so double clicks can't
    bypass them.
- **Question banks:** practice questions come with instant, server-checked
  feedback. The latest answer per question is kept, so students can filter
  by unanswered, incorrect or correct questions. Answering is rate-limited
  to discourage scraping paid banks.
- **Demo:** `DemoLearningSeeder` adds lesson notes, three question banks (one
  free, two tied to the question-bank products), a free placement exam and a
  timed mock exam for the quantitative course. The demo student is enrolled
  in that course.

### Account flows

- **Email verification:** after registering, users get a signed, 60-minute
  link to `/verify-email` in the SPA. The SPA posts its parameters back to the
  API, which checks the signature and the email hash, so it works even when
  the user isn't signed in on that device. Unverified users see a banner with a
  resend button. The `verified` middleware (error code `email_unverified`)
  guards checkout and payment.
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

## Commerce and payments (MyFatoorah API v3)

### Cart, coupons and checkout

- The cart lives on the server, one per user. A course holds at most one plan
  per cart, and items that stop being available are pruned with a notice.
- Coupons are percent or fixed, with optional start and end dates, minimum
  subtotal, maximum discount, scope (all, courses or products), a global limit
  and a per-user limit. Pending and failed orders count as reserved uses, so
  limits can't be bypassed by opening several unpaid orders. Discounts are
  split across lines with the largest-remainder method, so they always add up.
- Prices include VAT (`VAT_RATE`, 15% by default). The VAT portion is shown on
  the cart, the order and the invoice.
- **Buying requires a verified email address.** Checkout creates a **PENDING**
  order with a snapshot of every line (title, plan, price), so later catalog
  edits never change an order. Orders are numbered `ORD-YYYY-000001`, with no
  gaps. Free orders (100% coupons) are completed immediately.

### Payment lifecycle

1. `POST /checkout` creates the local **PENDING** order.
2. `POST /payments/myfatoorah/create` calls `POST {base}/v3/payments` with a
   Bearer token and returns the hosted `PaymentURL`. A link created in the last
   `PAYMENT_LINK_TTL_MINUTES` is reused. The gateway call happens outside any
   database transaction.
3. MyFatoorah redirects the customer to the **callback** with `?paymentId=`.
   The callback never trusts the query string. It fetches
   `GET {base}/v3/payments/{paymentId}` and then sends the browser to
   `/payment/success?order=…`, or to `/payment/failed?order=…`.
4. The **webhook** (`PAYMENT_STATUS_CHANGED`, V2) is processed in this order:
   1. The `MyFatoorah-Signature` header (HMAC-SHA256 over the documented
      fields) is verified *before anything is stored*. Without a configured
      secret, every webhook is rejected.
   2. The event is recorded once per idempotency key, so duplicates are
      acknowledged and never processed twice.
   3. The payment is re-fetched from the API, exactly as the callback does.
   4. On failure the webhook returns a non-2xx status, so MyFatoorah retries.
5. Applying a verified result happens in one transaction with row locks:
   1. The invoice id must match, and the amount and currency must match the
      order to the halala. A mismatch is logged, the order is not paid, and
      admins are alerted.
   2. The order becomes **PAID**, and the coupon redemption is recorded.
   3. **Enrollments** are created, one per user and course. A repurchase
      extends the access period from its current end date.
   4. The **invoice** (`INV-YYYY-000001`, simplified tax invoice) is issued,
      and the student gets an email and an in-app notification after commit.
6. Order statuses are `PENDING`, `PAID`, `FAILED` (can be retried),
   `CANCELLED` and `REFUNDED`.
   - A second successful payment for an already-paid order is flagged
     `is_duplicate` for a refund, and admins are notified.
   - A partial unique index allows only one counted paid payment per order.

**Scheduler:**

- `enrollments:expire` runs hourly and ends access periods that have elapsed.
- `orders:cancel-stale` runs hourly. It first reconciles each pending payment
  with MyFatoorah, then cancels orders left unpaid for longer than
  `PENDING_ORDER_TTL_HOURS`.
- Reconciliation needs the `paymentId`, which is only known after the
  customer returns or a webhook arrives. Orders with no known payment are
  simply cancelled.

**Refunds:**

- Issue the refund in the MyFatoorah portal, then record it with
  `POST /admin/orders/{number}/refund`.
- This marks the order **REFUNDED**, revokes the enrollments and entitlements,
  and writes an audit-log entry.
- Refunds are not sent through the gateway API automatically.

### Configuration

Keys stay on the server and are never sent to the SPA.

```dotenv
MYFATOORAH_API_KEY=            # sandbox token from the MyFatoorah demo portal
MYFATOORAH_BASE_URL=https://apitest.myfatoorah.com   # live KSA: https://api-sa.myfatoorah.com
MYFATOORAH_WEBHOOK_SECRET=     # from the portal's webhook settings
MYFATOORAH_CURRENCY=SAR
MYFATOORAH_PAYMENT_METHOD=CARD
MYFATOORAH_CALLBACK_URL=       # optional; defaults to this API's callback route
```

For invoices, set `legal_name`, `vat_number` and `address` in the site
settings table.

**Sandbox setup:**

1. Create a MyFatoorah demo (test) account.
2. Copy the test API token into `MYFATOORAH_API_KEY`.
3. In the portal, enable webhooks (V2), point them at
   `https://<api-host>/api/v1/payments/myfatoorah/webhook`, and copy the
   signature secret into `MYFATOORAH_WEBHOOK_SECRET`.
4. For local webhook testing, expose the API with a tunnel (e.g. `cloudflared`
   or `ngrok`).

**Offline simulator (development and E2E only):**

- Set `MYFATOORAH_SIMULATOR=true`,
  `MYFATOORAH_BASE_URL=http://127.0.0.1:8000/__myfatoorah-sim`, and any values
  for `MYFATOORAH_API_KEY` and `MYFATOORAH_WEBHOOK_SECRET`.
- Run the API with `PHP_CLI_SERVER_WORKERS=4 php artisan serve --no-reload`,
  because the API calls itself.
- The simulator implements the v3 create and get endpoints. It adds a hosted
  page with **successful payment**, **card declined** and **cancel** buttons,
  and `GET /__myfatoorah-sim/webhook-payload/{paymentId}`, which returns a
  correctly signed webhook body.
- The real gateway client, callback and webhook code run unchanged.
- The routes are never registered in production.

## SEO strategy (SPA)

- **Per-page tags:** the `<Seo>` component sets the title, description,
  canonical URL, Open Graph and Twitter tags, `robots`, and JSON-LD. It updates
  the tags already in `index.html` rather than duplicating them.
  - `index.html` ships Arabic defaults for crawlers that don't run JavaScript.
  - Dashboards and other private pages are `noindex` and are also disallowed in
    `public/robots.txt`.
- **Sitemap:** Laravel generates `/sitemap.xml` from published categories,
  courses, products, instructors, posts and pages, using SPA URLs. It is
  cached for one hour.
  - The SPA host must proxy `/sitemap.xml` (and `/storage`) to the API; the
    Vite dev/preview servers already do this.
  - Add the absolute `Sitemap:` line to `robots.txt` at deploy time.
- **Per-page JSON-LD:** `Course` (with offers and rating), `Product`,
  `BlogPosting`, `Person`, `FAQPage`, `BreadcrumbList`, `EducationalOrganization`
  and `WebSite` (with `SearchAction`).
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
  password-reset tokens daily, expires enrollments and reconciles/cancels
  stale orders hourly.
- Run `php artisan storage:link` (or serve `storage/app/public` from a CDN or
  bucket) for avatars.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation: monorepo, Laravel API skeleton, Sanctum SPA auth (register/login/logout/me), roles, error envelope, security headers, Arabic i18n, React app shell, design system, layouts, admin users list, tests + CI | ✅ |
| 2 | Auth completion: email verification, forgot/reset password, email OTP sign-in, profile (avatar, email change), security (password, sessions), audit log, Arabic RTL emails | ✅ |
| 3 | Catalog: categories, courses with plans, curriculum and free previews, products, instructors, blog, CMS pages, FAQ, testimonials, contact form, newsletter, Arabic search and filters, sitemap, JSON-LD | ✅ |
| 4 | Commerce: cart, coupons, checkout, orders, MyFatoorah, webhooks, invoices, enrollments | ✅ |
| 5 | Learning: lesson player, progress, question bank, exams and attempts | ✅ |
| 6 | Admin CRUD for all modules, reviews, CMS, settings, audit logs | ⏳ |
| 7 | Notifications (in-app + email), scheduler jobs (expiry reminders) | ⏳ |
| 8 | Hardening: performance, accessibility pass, SEO meta injection, deployment docs | ⏳ |
