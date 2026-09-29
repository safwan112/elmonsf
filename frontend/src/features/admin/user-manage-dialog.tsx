import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ROLES, roleLabels, statusLabels, type Role, type User, type UserStatus } from '@/types/user'

/** Change another user's status and roles (the API refuses one's own). */
export function UserManageDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [roles, setRoles] = useState<Role[]>(user.roles)
  const queryClient = useQueryClient()

  const save = useMutation({
    mutationFn: () => adminApi.updateUser(user.id, { status, roles }),
    onSuccess: (res) => {
      toast.success(res.message ?? 'تم التحديث')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`إدارة ${user.name}`}
        onClick={() => {
          setStatus(user.status)
          setRoles(user.roles)
          setOpen(true)
        }}
      >
        <Settings2 />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إدارة {user.name}</DialogTitle>
            <DialogDescription>تعليق الحساب يُسجّل خروج المستخدم من جميع أجهزته فوراً.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor={`status-${user.id}`}>حالة الحساب</Label>
              <NativeSelect id={`status-${user.id}`} value={status} onChange={(e) => setStatus(e.target.value as UserStatus)}>
                <option value="active">{statusLabels.active}</option>
                <option value="suspended">{statusLabels.suspended}</option>
              </NativeSelect>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-sm font-medium">الأدوار</legend>
              {ROLES.map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <Checkbox
                    id={`role-${user.id}-${role}`}
                    checked={roles.includes(role)}
                    onCheckedChange={(checked) => setRoles((list) => (checked ? [...list, role] : list.filter((r) => r !== role)))}
                  />
                  <Label htmlFor={`role-${user.id}-${role}`} className="font-normal">
                    {roleLabels[role]}
                  </Label>
                </div>
              ))}
            </fieldset>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button loading={save.isPending} disabled={roles.length === 0} onClick={() => save.mutate()}>
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
