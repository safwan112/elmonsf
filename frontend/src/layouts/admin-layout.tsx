import {
  BookOpen,
  ClipboardList,
  CreditCard,
  FileText,
  FolderTree,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquareQuote,
  Newspaper,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  Star,
  TicketPercent,
  UserRound,
  Users,
} from 'lucide-react'
import { useCurrentUser } from '@/features/auth/use-auth'
import type { Role } from '@/types/user'
import { DashboardShell, type NavItem } from './dashboard-shell'

type AdminNavItem = NavItem & { roles?: Role[] }

// Instructors see only what they can manage (their courses); the API
// enforces this independently.
const navItems: AdminNavItem[] = [
  { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, end: true, roles: ['admin'] },
  { to: '/admin/courses', label: 'الدورات', icon: BookOpen, roles: ['admin', 'instructor'] },
  { to: '/admin/products', label: 'المنتجات', icon: Package },
  { to: '/admin/categories', label: 'التصنيفات', icon: FolderTree },
  { to: '/admin/instructors', label: 'المدرّبون', icon: UserRound },
  { to: '/admin/question-banks', label: 'بنوك الأسئلة', icon: Library },
  { to: '/admin/questions', label: 'الأسئلة', icon: ListChecks },
  { to: '/admin/exams', label: 'الاختبارات', icon: ClipboardList },
  { to: '/admin/orders', label: 'الطلبات', icon: ReceiptText },
  { to: '/admin/payments', label: 'المدفوعات', icon: CreditCard },
  { to: '/admin/coupons', label: 'رموز الخصم', icon: TicketPercent },
  { to: '/admin/users', label: 'المستخدمون', icon: Users },
  { to: '/admin/reviews', label: 'المراجعات', icon: Star },
  { to: '/admin/blog', label: 'المدونة', icon: Newspaper },
  { to: '/admin/pages', label: 'الصفحات', icon: FileText },
  { to: '/admin/faqs', label: 'الأسئلة الشائعة', icon: HelpCircle },
  { to: '/admin/testimonials', label: 'آراء الطلاب', icon: MessageSquareQuote },
  { to: '/admin/messages', label: 'رسائل التواصل', icon: Inbox },
  { to: '/admin/settings', label: 'الإعدادات', icon: Settings },
  { to: '/admin/audit-logs', label: 'سجل التدقيق', icon: ScrollText },
]

export function AdminLayout() {
  const { hasRole } = useCurrentUser()
  const items = navItems.filter((item) => hasRole(...(item.roles ?? ['admin'])))

  return <DashboardShell navItems={items} areaLabel={hasRole('admin') ? 'لوحة الإدارة' : 'لوحة المدرّب'} />
}
