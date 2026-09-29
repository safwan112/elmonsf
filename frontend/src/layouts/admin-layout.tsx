import { LayoutDashboard, Users } from 'lucide-react'
import { DashboardShell, type NavItem } from './dashboard-shell'

// Items are added here as each admin module ships (courses, orders, payments…).
const navItems: NavItem[] = [
  { to: '/admin', label: 'نظرة عامة', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'المستخدمون', icon: Users },
]

export function AdminLayout() {
  return <DashboardShell navItems={navItems} areaLabel="لوحة الإدارة" />
}
