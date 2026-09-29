import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUser } from '@/features/auth/use-auth'
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils/format'

interface PublicReview {
  id: number
  rating: number
  comment: string | null
  author: { name: string; avatar_url: string | null }
  created_at: string | null
}

interface MyReview {
  can_review: boolean
  review: { id: number; rating: number; comment: string | null; status: { value: string; label: string } } | null
}

const path = (slug: string) => `/courses/${encodeURIComponent(slug)}/reviews`

function Stars({ value }: { value: number }) {
  return (
    <span className="flex" role="img" aria-label={`${value} من 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={cn('size-4', i < value ? 'fill-accent text-accent' : 'text-muted-foreground/40')} aria-hidden="true" />
      ))}
    </span>
  )
}

/** Approved reviews, plus the enrolled student's own review form. */
export function CourseReviews({ slug }: { slug: string }) {
  const { isAuthenticated } = useCurrentUser()
  const reviews = useQuery({
    queryKey: ['catalog', 'course', slug, 'reviews'],
    queryFn: () => api.get<{ data: PublicReview[]; meta: { total: number } }>(path(slug)),
  })
  const mine = useQuery({
    queryKey: ['catalog', 'course', slug, 'reviews', 'mine'],
    queryFn: () => api.get<{ data: MyReview }>(`${path(slug)}/mine`).then((r) => r.data),
    enabled: isAuthenticated,
  })

  const list = reviews.data?.data ?? []
  if (list.length === 0 && !mine.data?.can_review) return null

  return (
    <section aria-labelledby="reviews" className="grid gap-4">
      <h2 id="reviews" className="text-xl font-bold">
        آراء الطلاب
      </h2>
      {mine.data?.can_review && <ReviewForm slug={slug} existing={mine.data.review} />}
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد مراجعات منشورة بعد. كن أول من يقيّم الدورة.</p>
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.author.name}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm leading-7 text-muted-foreground">{r.comment}</p>}
              <span className="text-xs text-muted-foreground">{formatDate(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ReviewForm({ slug, existing }: { slug: string; existing: MyReview['review'] }) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: () => api.put<{ message?: string }>(`${path(slug)}/mine`, { rating, comment: comment.trim() || null }),
    onSuccess: (res) => {
      toast.success(res.message ?? 'شكراً لتقييمك')
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'course', slug, 'reviews', 'mine'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <form
      className="grid gap-3 rounded-2xl border border-dashed bg-card/60 p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (rating > 0) save.mutate()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{existing ? 'تقييمك للدورة' : 'قيّم الدورة'}</p>
        {existing && <Badge variant={existing.status.value === 'approved' ? 'success' : 'accent'}>{existing.status.label}</Badge>}
      </div>
      <fieldset className="flex gap-1">
        <legend className="sr-only">التقييم</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} className="sr-only" aria-label={`${n} من 5`} />
            <Star className={cn('size-7 transition-colors', n <= rating ? 'fill-accent text-accent' : 'text-muted-foreground/40')} aria-hidden="true" />
          </label>
        ))}
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor="review-comment">تعليقك (اختياري)</Label>
        <Textarea id="review-comment" rows={3} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>
      <Button type="submit" className="justify-self-start" loading={save.isPending} disabled={rating === 0}>
        {existing ? 'تحديث التقييم' : 'إرسال التقييم'}
      </Button>
      <p className="text-xs text-muted-foreground">تظهر المراجعات بعد مراجعتها من فريق المنصة.</p>
    </form>
  )
}
