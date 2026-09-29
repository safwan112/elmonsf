import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Read/write filter values in the URL query string, so filtered views are
 * shareable, bookmarkable and survive refresh/back navigation.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams()

  const get = useCallback((key: string) => params.get(key) ?? undefined, [params])

  const set = useCallback(
    (patch: Record<string, string | number | undefined | null>, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === null || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          if (resetPage && !('page' in patch)) next.delete('page')
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clear = useCallback((keep: string[] = []) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams()
        keep.forEach((k) => prev.get(k) && next.set(k, prev.get(k)!))
        return next
      },
      { replace: true },
    )
  }, [setParams])

  return { params, get, set, clear }
}
