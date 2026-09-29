import { Camera, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/types/user'
import { initials } from '@/utils/format'
import { useDeleteAvatar, useUploadAvatar } from './use-account'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 4 * 1024 * 1024

export function AvatarCard({ user }: { user: User }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadAvatar()
  const remove = useDeleteAvatar()
  const [error, setError] = useState<string | null>(null)

  const onFile = (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!ACCEPTED.includes(file.type)) {
      setError('اختر صورة بصيغة JPG أو PNG أو WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('يجب ألا يتجاوز حجم الصورة 4 ميغابايت.')
      return
    }
    upload.mutate(file, {
      onSuccess: (res) => toast.success(res.message ?? 'تم تحديث الصورة'),
      onError: (e) => setError(e.field('avatar') ?? e.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الصورة الشخصية</CardTitle>
        <CardDescription>تظهر في حسابك وفي تقييماتك للدورات.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <Avatar className="size-20 text-2xl">
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
          <AvatarFallback className="text-2xl">{initials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" loading={upload.isPending} onClick={() => inputRef.current?.click()}>
              <Camera />
              {user.avatar_url ? 'تغيير الصورة' : 'رفع صورة'}
            </Button>
            {user.avatar_url && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                loading={remove.isPending}
                onClick={() => remove.mutate(undefined, { onSuccess: (res) => toast.success(res.message ?? 'تمت الإزالة') })}
              >
                <Trash2 />
                إزالة
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">JPG أو PNG أو WebP، بحد أقصى 4 ميغابايت. سنقصّها بشكل مربع.</p>
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="sr-only"
            tabIndex={-1}
            aria-label="اختيار صورة شخصية"
            onChange={(e) => {
              onFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
