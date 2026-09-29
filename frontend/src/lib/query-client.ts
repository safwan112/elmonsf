import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api/errors'

function shouldRetry(failureCount: number, error: unknown) {
  const apiError = ApiError.from(error)
  // Never retry client errors (auth, validation, not found...).
  if (apiError.status >= 400 && apiError.status < 500) return false
  return failureCount < 2
}

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache(),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        // Mutations can opt out (e.g. forms that render field errors inline).
        if (mutation.meta?.silentError) return
        const apiError = ApiError.from(error)
        if (!apiError.isValidation) toast.error(apiError.message)
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError
    mutationMeta: { silentError?: boolean }
  }
}
