import { MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/user'
import { useResendVerification } from './use-account'

/** Nudge shown across the dashboards until the email is confirmed. */
export function VerifyEmailBanner({ user }: { user: User }) {
  const resend = useResendVerification()

  if (user.email_verified) return null

  return (
    <div role="status" className="border-b border-warning/40 bg-warning/15">
      <div className="flex flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-center gap-2">
          <MailWarning className="size-4 shrink-0" aria-hidden="true" />
          <span>
            لم تؤكد بريدك الإلكتروني بعد. أرسلنا رابط التأكيد إلى <span className="font-semibold ltr-nums">{user.email}</span>
          </span>
        </p>
        <Button
          size="sm"
          variant="outline"
          className="self-start sm:self-auto"
          loading={resend.isPending}
          disabled={resend.isSuccess}
          onClick={() => resend.mutate(undefined, { onSuccess: (res) => toast.success(res.message) })}
        >
          {resend.isSuccess ? 'تم الإرسال' : 'إعادة إرسال الرابط'}
        </Button>
      </div>
    </div>
  )
}
