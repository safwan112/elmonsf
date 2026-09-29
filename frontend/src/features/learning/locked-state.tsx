import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { ApiError } from '@/api/errors'
import { EmptyState, ErrorState } from '@/components/common/states'

/**
 * Error display for learning pages: a friendly "subscribe to unlock" state
 * for 403 content_locked, the standard error state otherwise.
 */
export function LearningError({ error, onRetry, action }: { error: unknown; onRetry?: () => void; action?: ReactNode }) {
  const apiError = ApiError.from(error)
  if (apiError.code === 'content_locked') {
    return <EmptyState icon={Lock} title="هذا المحتوى للمشتركين" description={apiError.message} action={action} />
  }
  return <ErrorState error={apiError} onRetry={onRetry} />
}
