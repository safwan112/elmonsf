import { createBrowserRouter, Outlet, type RouteObject } from 'react-router'
import { AdminLayout } from '@/layouts/admin-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { StudentLayout } from '@/layouts/student-layout'
import { AdminOverviewPage } from '@/pages/admin/admin-overview-page'
import { AdminUsersPage } from '@/pages/admin/admin-users-page'
import { ForgotPasswordPage } from '@/pages/auth/forgot-password-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { ResetPasswordPage } from '@/pages/auth/reset-password-page'
import { VerifyEmailPage } from '@/pages/auth/verify-email-page'
import { CartPage } from '@/pages/commerce/cart-page'
import { CheckoutPage } from '@/pages/commerce/checkout-page'
import { PaymentFailedPage, PaymentSuccessPage } from '@/pages/commerce/payment-result-pages'
import { DashboardHomePage } from '@/pages/dashboard/dashboard-home-page'
import { InvoicePage, InvoicesPage } from '@/pages/dashboard/invoices-pages'
import { MyCoursesPage } from '@/pages/dashboard/my-courses-page'
import { OrderDetailPage, OrdersPage } from '@/pages/dashboard/orders-pages'
import { AttemptPage } from '@/pages/learning/attempt-page'
import { CoursePlayerPage } from '@/pages/learning/course-player-page'
import { ExamDetailPage, ExamsPage } from '@/pages/learning/exams-pages'
import { LessonPage } from '@/pages/learning/lesson-page'
import { PracticePage, QuestionBanksPage } from '@/pages/learning/question-bank-pages'
import { ProfilePage } from '@/pages/dashboard/profile-page'
import { SecurityPage } from '@/pages/dashboard/security-page'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { RouteErrorPage } from '@/pages/errors/route-error-page'
import { BlogPage, PostPage } from '@/pages/public/blog-pages'
import { CategoriesPage, CategoryPage } from '@/pages/public/categories-page'
import { CmsPage, ContactPage, FaqPage } from '@/pages/public/content-pages'
import { CourseDetailPage } from '@/pages/public/course-detail-page'
import { CoursesPage } from '@/pages/public/courses-page'
import { HomePage } from '@/pages/public/home-page'
import { InstructorPage, InstructorsPage } from '@/pages/public/instructors-page'
import { ProductDetailPage, ProductsPage } from '@/pages/public/products-page'
import { SearchPage } from '@/pages/public/search-page'
import { GuestOnlyOutlet, RequireAuth, RequireRole } from './guards'
import { RootLayout } from './root-layout'

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      // ---- Public website -------------------------------------------------
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'courses', element: <CoursesPage /> },
          { path: 'courses/:slug', element: <CourseDetailPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'categories/:slug', element: <CategoryPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'products/:slug', element: <ProductDetailPage /> },
          { path: 'instructors', element: <InstructorsPage /> },
          { path: 'instructors/:slug', element: <InstructorPage /> },
          { path: 'blog', element: <BlogPage /> },
          { path: 'blog/:slug', element: <PostPage /> },
          { path: 'search', element: <SearchPage /> },
          { path: 'faq', element: <FaqPage /> },
          { path: 'contact', element: <ContactPage /> },
          // Well-known CMS pages at the root; any other CMS page under /pages.
          { path: 'about', element: <CmsPage slug="about" /> },
          { path: 'terms', element: <CmsPage slug="terms" /> },
          { path: 'privacy', element: <CmsPage slug="privacy" /> },
          { path: 'refund-policy', element: <CmsPage slug="refund-policy" /> },
          { path: 'pages/:slug', element: <CmsPage /> },
          // Purchasing requires an account; the API enforces it regardless.
          {
            element: (
              <RequireAuth>
                <Outlet />
              </RequireAuth>
            ),
            children: [
              { path: 'cart', element: <CartPage /> },
              { path: 'checkout', element: <CheckoutPage /> },
              { path: 'payment/success', element: <PaymentSuccessPage /> },
              { path: 'payment/failed', element: <PaymentFailedPage /> },
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
          { index: true, element: <DashboardHomePage /> },
          { path: 'courses', element: <MyCoursesPage /> },
          { path: 'courses/:id', element: <CoursePlayerPage /> },
          { path: 'lessons/:id', element: <LessonPage /> },
          { path: 'exams', element: <ExamsPage /> },
          { path: 'exams/:id', element: <ExamDetailPage /> },
          { path: 'exams/:id/attempts/:attemptId', element: <AttemptPage /> },
          { path: 'question-bank', element: <QuestionBanksPage /> },
          { path: 'question-bank/:id', element: <PracticePage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:number', element: <OrderDetailPage /> },
          { path: 'invoices', element: <InvoicesPage /> },
          { path: 'invoices/:number', element: <InvoicePage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'security', element: <SecurityPage /> },
          { path: '*', element: <NotFoundPage inDashboard /> },
        ],
      },

      // ---- Admin ----------------------------------------------------------
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireRole roles={['admin']}>
              <AdminLayout />
            </RequireRole>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: '*', element: <NotFoundPage inDashboard /> },
        ],
      },
    ],
  },
]

export function createRouter() {
  return createBrowserRouter(routes)
}
