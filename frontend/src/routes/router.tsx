import { createBrowserRouter, type RouteObject } from 'react-router'
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
import { DashboardHomePage } from '@/pages/dashboard/dashboard-home-page'
import { ProfilePage } from '@/pages/dashboard/profile-page'
import { SecurityPage } from '@/pages/dashboard/security-page'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { RouteErrorPage } from '@/pages/errors/route-error-page'
import { HomePage } from '@/pages/public/home-page'
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
