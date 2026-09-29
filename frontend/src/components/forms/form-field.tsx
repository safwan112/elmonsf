import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: ReactNode
  error?: string
  hint?: ReactNode
  /** Optional element rendered at the end of the label row (e.g. a link). */
  labelAside?: ReactNode
  className?: string
  /**
   * The control. Either an element (props are injected), or a render
   * function for controls wrapped in e.g. react-hook-form's <Controller>.
   */
  children: ReactElement<Partial<FieldControlProps>> | ((props: FieldControlProps) => ReactNode)
}

/**
 * Accessible field wrapper: wires the label, hint and error message to the
 * control via id / aria-describedby / aria-invalid.
 */
export function FormField({ label, error, hint, labelAside, className, children }: FormFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint && !error ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  const controlProps: FieldControlProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  const control =
    typeof children === 'function'
      ? children(controlProps)
      : isValidElement(children)
        ? cloneElement(children, controlProps)
        : children

  return (
    <div className={cn('grid gap-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {labelAside}
      </div>
      {control}
      {hint && !error && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
