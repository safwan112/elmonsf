import { BookOpen, LayoutDashboard, ReceiptText, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react'
import { DashboardShell, type NavItem } from './dashboard-shell'

// Items are added here as each learning module ships (exams, question bank…).
const navItems: NavItem[] = [
  { to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/dashboard/courses', label: 'دوراتي', icon: BookOpen },
  { to: '/dashboard/orders', label: 'طلباتي', icon: ShoppingBag },
  { to: '/dashboard/invoices', label: 'الفواتير', icon: ReceiptText },
  { to: '/dashboard/profile', label: 'الملف الشخصي', icon: UserRound },
  { to: '/dashboard/security', label: 'الأمان', icon: ShieldCheck },
]

// The bottom bar only has room for the most used destinations.
const mobileTabs: NavItem[] = [navItems[0]!, navItems[1]!, navItems[2]!, navItems[4]!]

export function StudentLayout() {
  return <DashboardShell navItems={navItems} areaLabel="لوحة الطالب" mobileTabs={mobileTabs} />
}
