import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import { PageLoader } from '@/components/common/states'
import { AdminLayout } from '@/layouts/admin-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { StudentLayout } from '@/layouts/student-layout'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'
import { VerifyEmailPage } from '@/pages/auth/verify-email-page'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { RouteErrorPage } from '@/pages/errors/route-error-page'
import { HomePage } from '@/pages/public/home-page'
import { AdminIndex, GuestOnlyOutlet, RequireAuth, RequireRole } from './guards'
import { page } from './lazy'
import { RootLayout } from './root-layout'

// Page modules are split per area; each loads on first visit.
const catalog = () => import('@/pages/public/catalog-routes')
const content = () => import('@/pages/public/content-routes')
const commerce = () => import('@/pages/commerce/commerce-routes')
const dashboard = () => import('@/pages/dashboard/dashboard-routes')
const learning = () => import('@/pages/learning/learning-routes')
const admin = () => import('@/pages/admin/admin-routes')

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: PageLoader,
    children: [
      // ---- Public website -------------------------------------------------
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'courses', lazy: page(catalog, 'CoursesPage') },
          { path: 'courses/:slug', lazy: page(catalog, 'CourseDetailPage') },
          { path: 'categories', lazy: page(catalog, 'CategoriesPage') },
          { path: 'categories/:slug', lazy: page(catalog, 'CategoryPage') },
          { path: 'products', lazy: page(catalog, 'ProductsPage') },
          { path: 'products/:slug', lazy: page(catalog, 'ProductDetailPage') },
          { path: 'instructors', lazy: page(catalog, 'InstructorsPage') },
          { path: 'instructors/:slug', lazy: page(catalog, 'InstructorPage') },
          { path: 'search', lazy: page(catalog, 'SearchPage') },
          { path: 'blog', lazy: page(content, 'BlogPage') },
          { path: 'blog/:slug', lazy: page(content, 'PostPage') },
          { path: 'faq', lazy: page(content, 'FaqPage') },
          { path: 'contact', lazy: page(content, 'ContactPage') },
          // Well-known CMS pages at the root; any other CMS page under /pages.
          { path: 'about', lazy: page(content, 'AboutPage') },
          { path: 'terms', lazy: page(content, 'TermsPage') },
          { path: 'privacy', lazy: page(content, 'PrivacyPage') },
          { path: 'refund-policy', lazy: page(content, 'RefundPolicyPage') },
          { path: 'pages/:slug', lazy: page(content, 'CmsPage') },
          // Purchasing requires an account; the API enforces it regardless.
          {
            element: (
              <RequireAuth>
                <Outlet />
              </RequireAuth>
            ),
            children: [
              { path: 'cart', lazy: page(commerce, 'CartPage') },
              { path: 'checkout', lazy: page(commerce, 'CheckoutPage') },
              { path: 'payment/success', lazy: page(commerce, 'PaymentSuccessPage') },
              { path: 'payment/failed', lazy: page(commerce, 'PaymentFailedPage') },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },

      // ---- Authentication -------------------------------------------------
      {
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnlyOutlet />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'register', element: <RegisterPage /> },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
            ],
          },
          // Reachable signed in or out: they are opened from email links.
          { path: 'reset-password', element: <ResetPasswordPage /> },
          { path: 'verify-email', element: <VerifyEmailPage /> },
        ],
      },

      // ---- Student dashboard ---------------------------------------------
      {
        path: 'dashboard',
        element: (
          <RequireAuth>
            <StudentLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, lazy: page(dashboard, 'DashboardHomePage') },
          { path: 'courses', lazy: page(dashboard, 'MyCoursesPage') },
          { path: 'courses/:id', lazy: page(learning, 'CoursePlayerPage') },
          { path: 'lessons/:id', lazy: page(learning, 'LessonPage') },
          { path: 'exams', lazy: page(learning, 'ExamsPage') },
          { path: 'exams/:id', lazy: page(learning, 'ExamDetailPage') },
          { path: 'exams/:id/attempts/:attemptId', lazy: page(learning, 'AttemptPage') },
          { path: 'question-bank', lazy: page(learning, 'QuestionBanksPage') },
          { path: 'question-bank/:id', lazy: page(learning, 'PracticePage') },
          { path: 'orders', lazy: page(dashboard, 'OrdersPage') },
          { path: 'orders/:number', lazy: page(dashboard, 'OrderDetailPage') },
          { path: 'invoices', lazy: page(dashboard, 'InvoicesPage') },
          { path: 'invoices/:number', lazy: page(dashboard, 'InvoicePage') },
          { path: 'notifications', lazy: page(dashboard, 'NotificationsPage') },
          { path: 'profile', lazy: page(dashboard, 'ProfilePage') },
          { path: 'security', lazy: page(dashboard, 'SecurityPage') },
          { path: '*', element: <NotFoundPage inDashboard /> },
        ],
      },

      // ---- Admin (admins; instructors see their courses only) ------------
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireRole roles={['admin', 'instructor']}>
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          {
            index: true,
            lazy: async () => {
              const { AdminOverviewPage } = await admin()
              return { Component: () => <AdminIndex overview={<AdminOverviewPage />} /> }
            },
          },
          { path: 'courses', lazy: page(admin, 'AdminCoursesPage') },
          { path: 'courses/:id', lazy: page(admin, 'AdminCourseEditorPage') },
          {
            element: (
              <RequireRole roles={['admin']}>
                <Outlet />
              </RequireRole>
            ),
            children: [
              { path: 'users', lazy: page(admin, 'AdminUsersPage') },
              { path: 'categories', lazy: page(admin, 'AdminCategoriesPage') },
              { path: 'instructors', lazy: page(admin, 'AdminInstructorsPage') },
              { path: 'products', lazy: page(admin, 'AdminProductsPage') },
              { path: 'coupons', lazy: page(admin, 'AdminCouponsPage') },
              { path: 'question-banks', lazy: page(admin, 'AdminQuestionBanksPage') },
              { path: 'questions', lazy: page(admin, 'AdminQuestionsPage') },
              { path: 'exams', lazy: page(admin, 'AdminExamsPage') },
              { path: 'exams/:id', lazy: page(admin, 'AdminExamEditorPage') },
              { path: 'orders', lazy: page(admin, 'AdminOrdersPage') },
              { path: 'orders/:number', lazy: page(admin, 'AdminOrderDetailPage') },
              { path: 'payments', lazy: page(admin, 'AdminPaymentsPage') },
              { path: 'reviews', lazy: page(admin, 'AdminReviewsPage') },
              { path: 'blog', lazy: page(admin, 'AdminPostsPage') },
              { path: 'pages', lazy: page(admin, 'AdminPagesPage') },
              { path: 'faqs', lazy: page(admin, 'AdminFaqsPage') },
              { path: 'testimonials', lazy: page(admin, 'AdminTestimonialsPage') },
              { path: 'notifications', lazy: page(admin, 'AdminBroadcastsPage') },
              { path: 'messages', lazy: page(admin, 'AdminMessagesPage') },
              { path: 'settings', lazy: page(admin, 'AdminSettingsPage') },
              { path: 'audit-logs', lazy: page(admin, 'AdminAuditLogsPage') },
            ],
          },
          { path: '*', element: <NotFoundPage inDashboard /> },
        ],
      },
    ],
  },
]

export function createRouter() {
  return createBrowserRouter(routes)
}
