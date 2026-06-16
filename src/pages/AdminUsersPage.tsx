import { useCallback, useEffect, useState } from 'react'
import { KeyRound, Plus, RefreshCw, UserPlus, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { createUser, resetUserPassword, validatePassword } from '../lib/admin'
import { supabase, type Profile, type UserRole } from '../lib/supabase'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'مدير عام',
  employee: 'موظف',
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('employee')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('فشل تحميل قائمة المستخدمين')
      console.error(error)
    } else {
      setUsers((data as Profile[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const resetAddForm = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setRole('employee')
  }

  const resetPasswordForm = () => {
    setNewPassword('')
    setConfirmPassword('')
    setSelectedUser(null)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    if (!fullName.trim() || !email.trim()) {
      toast.error('الاسم والبريد الإلكتروني مطلوبان')
      return
    }

    setSubmitting(true)
    try {
      await createUser({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role,
      })
      toast.success('تم إنشاء المستخدم بنجاح')
      setAddOpen(false)
      resetAddForm()
      await fetchUsers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء المستخدم')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    const validationError = validatePassword(newPassword, confirmPassword)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      await resetUserPassword(selectedUser.id, newPassword)
      toast.success(`تم إعادة تعيين كلمة مرور ${selectedUser.full_name}`)
      setResetOpen(false)
      resetPasswordForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل إعادة تعيين كلمة المرور')
    } finally {
      setSubmitting(false)
    }
  }

  const openResetDialog = (profile: Profile) => {
    setSelectedUser(profile)
    setNewPassword('')
    setConfirmPassword('')
    setResetOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
          <p className="mt-1 text-sm text-gray-500">إضافة المستخدمين وإدارة كلمات المرور</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" />
            إضافة مستخدم
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-600" />
            قائمة المستخدمين ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-500">جاري التحميل...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-gray-500">لا يوجد مستخدمون</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-right text-gray-500">
                    <th className="pb-3 pr-2 font-medium">الاسم</th>
                    <th className="pb-3 pr-2 font-medium">البريد الإلكتروني</th>
                    <th className="pb-3 pr-2 font-medium">الدور</th>
                    <th className="pb-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((profile) => (
                    <tr key={profile.id} className="border-b border-gray-100">
                      <td className="py-3 pr-2 font-medium">{profile.full_name}</td>
                      <td className="py-3 pr-2 text-gray-600" dir="ltr">
                        {profile.email ?? '—'}
                      </td>
                      <td className="py-3 pr-2">
                        <Badge variant={profile.role === 'super_admin' ? 'info' : 'default'}>
                          {ROLE_LABELS[profile.role]}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResetDialog(profile)}
                          disabled={profile.id === currentUser?.id}
                          title={
                            profile.id === currentUser?.id
                              ? 'استخدم صفحة الإعدادات لتغيير كلمة مرورك'
                              : undefined
                          }
                        >
                          <KeyRound className="h-4 w-4" />
                          إعادة تعيين
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة مستخدم جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">الاسم الكامل</Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="أدخل الاسم الكامل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@mrmarvel.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>الدور</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="super_admin">مدير عام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جاري الإنشاء...' : 'إنشاء المستخدم'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open)
          if (!open) resetPasswordForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <p className="text-sm text-gray-500">
              للمستخدم: <span className="font-medium text-gray-900">{selectedUser.full_name}</span>
            </p>
          )}
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmResetPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmResetPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
