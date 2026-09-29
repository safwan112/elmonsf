import { BookOpen, ClipboardList, LayoutDashboard, Library, ReceiptText, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { DashboardShell, type NavItem } from './dashboard-shell'

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/dashboard/courses', label: 'دوراتي', icon: BookOpen },
  { to: '/dashboard/exams', label: 'الاختبارات', icon: ClipboardList },
  { to: '/dashboard/question-bank', label: 'بنك الأسئلة', icon: Library },
  { to: '/dashboard/orders', label: 'طلباتي', icon: ShoppingBag },
  { to: '/dashboard/invoices', label: 'الفواتير', icon: ReceiptText },
  { to: '/dashboard/profile', label: 'الملف الشخصي', icon: UserRound },
  { to: '/dashboard/security', label: 'الأمان', icon: ShieldCheck },
]

// The bottom bar only has room for the most used destinations.
const mobileTabs: NavItem[] = navItems.slice(0, 4)

export function StudentLayout() {
  return <DashboardShell navItems={navItems} areaLabel="لوحة الطالب" mobileTabs={mobileTabs} />
}
