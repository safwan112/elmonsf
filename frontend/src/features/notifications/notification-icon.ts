import { Bell, BookOpenCheck, CalendarClock, CircleX, CreditCard, Megaphone, PartyPopper, Star, TriangleAlert } from 'lucide-react'

const ICONS: Record<string, typeof Bell> = {
  order_paid: CreditCard,
  payment_failed: CircleX,
  payment_review: TriangleAlert,
  enrollment_expiring: CalendarClock,
  announcement: Megaphone,
  welcome: PartyPopper,
  review_moderated: Star,
  exam_graded: BookOpenCheck,
}

export const notificationIcon = (type: string) => ICONS[type] ?? Bell
