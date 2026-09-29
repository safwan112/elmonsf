import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { Direction } from 'radix-ui'
import { useEffect, useState, type ReactNode } from 'react'
import { RouterProvider } from 'react-router'
import { Toaster } from 'sonner'
import { onUnauthenticated } from '@/api/client'
import { queryKeys } from '@/api/query-keys'
import { ThemeProvider } from '@/features/theme/theme-provider'
import { useTheme } from '@/hooks/use-theme'
import { createQueryClient } from '@/lib/query-client'
import { createRouter } from '@/routes/router'

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster dir="rtl" position="top-center" theme={resolvedTheme} richColors closeButton />
}

/** When any request returns 401, the cached session is dropped so guards react. */
function SessionSync({ client }: { client: QueryClient }) {
  useEffect(
    () =>
      onUnauthenticated(() => {
        if (client.getQueryData(queryKeys.auth.me)) {
          client.setQueryData(queryKeys.auth.me, null)
        }
      }),
    [client],
  )
  return null
}

export function AppProviders({ children, queryClient }: { children: ReactNode; queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Direction.Provider dir="rtl">
          <SessionSync client={queryClient} />
          {children}
          <ThemedToaster />
        </Direction.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default function App() {
  const [queryClient] = useState(createQueryClient)
  const [router] = useState(createRouter)

  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
