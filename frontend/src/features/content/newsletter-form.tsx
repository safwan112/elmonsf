import { useMutation } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { toast } from 'sonner'
import { contentApi } from '@/api/catalog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewsletterForm() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const subscribe = useMutation({ mutationFn: contentApi.subscribe, meta: { silentError: true } })

  return (
    <form
      noValidate
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
          setError('أدخل بريداً إلكترونياً صحيحاً')
          return
        }
        subscribe.mutate(email.trim(), {
          onSuccess: (res) => {
            toast.success(res.message)
            setEmail('')
          },
          onError: (err) => setError(err.field('email') ?? err.message),
        })
      }}
    >
      <label htmlFor={id} className="text-sm font-bold">
        النشرة البريدية
      </label>
      <p className="text-xs text-muted-foreground">نصائح مذاكرة وعروض الدورات، مرة أسبوعياً على الأكثر.</p>
      <div className="flex gap-2">
        <Input
          id={id}
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-10"
        />
        <Button type="submit" size="sm" className="h-10" loading={subscribe.isPending}>
          اشتراك
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
