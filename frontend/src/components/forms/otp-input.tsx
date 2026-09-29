import type * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { toLatinDigits } from '@/utils/digits'

interface OtpInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value' | 'maxLength'> {
  value: string
  onChange: (value: string) => void
  length?: number
}

/**
 * Single-field one-time-code input: works with SMS/email autofill
 * (`autocomplete="one-time-code"`), paste, and Arabic-Indic digits.
 */
export function OtpInput({ value, onChange, length = 6, className, ...props }: OtpInputProps) {
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(toLatinDigits(e.target.value).replace(/\D/g, '').slice(0, length))}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`[0-9]{${length}}`}
      maxLength={length}
      dir="ltr"
      placeholder={'•'.repeat(length)}
      className={cn('h-14 text-center font-mono text-2xl tracking-[0.6em] md:text-2xl', className)}
    />
  )
}
