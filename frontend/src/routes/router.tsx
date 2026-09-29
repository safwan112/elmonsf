import { createBrowserRouter, type RouteObject } from 'react-router'
import { AdminLayout } from '@/layouts/admin-layout'
import { AuthLayout } from '@/layouts/auth-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { StudentLayout } from '@/layouts/student-layout'
import { AdminOverviewPage } from '@/pages/admin/admin-overview-page'
import { AdminUsersPage } from '@/pages/admin/admin-users-page'
import { LoginPage } from '@/pages/auth/login-page'
import { RegisterPage } from '@/pages/auth/register-page'
import { DashboardHomePage } from '@/pages/dashboard/dashboard-home-page'
import { NotFoundPage } from '@/pages/errors/not-found-page'
import { RouteErrorPage } from '@/pages/errors/route-error-page'
import { HomePage } from '@/pages/public/home-page'
import { GuestOnly, RequireAuth, RequireRole } from './guards'
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
        element: (
          <GuestOnly>
            <AuthLayout />
          </GuestOnly>
        ),
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
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
