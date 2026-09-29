import { LayoutDashboard } from 'lucide-react'
import { DashboardShell, type NavItem } from './dashboard-shell'

// Items are added here as each learning module ships (courses, exams, orders…).
const navItems: NavItem[] = [{ to: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard, end: true }]

export function StudentLayout() {
  return <DashboardShell navItems={navItems} areaLabel="لوحة الطالب" />
}
