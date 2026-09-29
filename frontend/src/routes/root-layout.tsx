import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'

/** Scroll to top on navigation, or to the #hash target when present. */
function ScrollManager() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])

  return null
}

export function RootLayout() {
  return (
    <>
      <ScrollManager />
      <Outlet />
    </>
  )
}
