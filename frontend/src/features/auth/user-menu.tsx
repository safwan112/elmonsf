import { KeyRound, LayoutDashboard, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/utils/format'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { User } from '@/types/user'
import { useLogout } from './use-auth'

export function UserMenu({ user }: { user: User }) {
  const logout = useLogout()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => toast.success('تم تسجيل الخروج'),
      onSettled: () => navigate('/', { replace: true }),
    })
  }

  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full p-0.5 outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
        aria-label="قائمة الحساب"
      >
        <Avatar>
          {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground ltr-nums">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/dashboard">
            <LayoutDashboard />
            لوحة الطالب
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile">
            <UserRound />
            الملف الشخصي
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/security">
            <KeyRound />
            الأمان
          </Link>
        </DropdownMenuItem>
        {user.roles.includes('admin') ? (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <ShieldCheck />
              لوحة الإدارة
            </Link>
          </DropdownMenuItem>
        ) : (
          user.roles.includes('instructor') && (
            <DropdownMenuItem asChild>
              <Link to="/admin/courses">
                <ShieldCheck />
                إدارة دوراتي
              </Link>
            </DropdownMenuItem>
          )
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout} disabled={logout.isPending}>
          <LogOut className="text-destructive" />
          تسجيل الخروج
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
