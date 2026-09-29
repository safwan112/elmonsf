import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/errors'

/**
 * Map Laravel validation errors onto react-hook-form fields.
 * Returns the message to show globally when the error is not field-specific.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const apiError = ApiError.from(error)
  let matched = false

  if (apiError.isValidation) {
    for (const field of fields) {
      const message = apiError.field(field)
      if (message) {
        setError(field, { type: 'server', message })
        matched = true
      }
    }
  }

  return matched ? null : apiError.message
}
