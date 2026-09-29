import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { PageLoader } from '@/components/common/states'
import { homePathFor, useCurrentUser } from '@/features/auth/use-auth'
import { ForbiddenPage } from '@/pages/errors/forbidden-page'
import type { Role } from '@/types/user'
import { safeRedirect } from '@/utils/safe-redirect'

/*
 * Client-side guards exist purely for UX (no flash of private screens,
 * friendly redirects). Every API endpoint re-checks authentication and
 * authorization on the server.
 */

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCurrentUser()
  const location = useLocation()

  if (isLoading) return <PageLoader />

  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return children
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { hasRole, isLoading } = useCurrentUser()

  if (isLoading) return <PageLoader />
  if (!hasRole(...roles)) return <ForbiddenPage />

  return children
}

/** Admin home: the overview for admins, the course list for instructors. */
export function AdminIndex({ overview }: { overview: ReactNode }) {
  const { hasRole } = useCurrentUser()
  return hasRole('admin') ? overview : <Navigate to="/admin/courses" replace />
}

/**
 * Auth screens: signed-in users are sent on (honouring a safe ?redirect=,
 * which also makes this agree with the post-login navigation).
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useCurrentUser()
  const [params] = useSearchParams()

  if (isLoading) return <PageLoader />
  if (user) return <Navigate to={safeRedirect(params.get('redirect'), homePathFor(user))} replace />

  return children
}

export function GuestOnlyOutlet() {
  return (
    <GuestOnly>
      <Outlet />
    </GuestOnly>
  )
}
