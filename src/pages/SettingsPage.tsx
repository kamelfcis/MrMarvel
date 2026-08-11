import { useEffect, useState } from 'react'
import { KeyRound, Percent, User } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import { validatePassword } from '../lib/admin'
import {
  DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT,
  fetchHighDiscountThreshold,
  saveHighDiscountThreshold,
} from '../lib/discountAudit'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function SettingsPage() {
  const { profile, changePassword, isSuperAdmin } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [discountThreshold, setDiscountThreshold] = useState(
    String(DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT),
  )
  const [discountThresholdLoading, setDiscountThresholdLoading] = useState(false)
  const [discountThresholdSaving, setDiscountThresholdSaving] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) return

    let cancelled = false
    setDiscountThresholdLoading(true)
    void fetchHighDiscountThreshold()
      .then((value) => {
        if (!cancelled) setDiscountThreshold(String(value))
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) {
          toast.error('فشل تحميل إعدادات مراجعة الخصومات')
        }
      })
      .finally(() => {
        if (!cancelled) setDiscountThresholdLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isSuperAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validatePassword(newPassword, confirmPassword)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)
    try {
      await changePassword(newPassword)
      toast.success('تم تغيير كلمة المرور بنجاح')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل تغيير كلمة المرور')
    } finally {
      setLoading(false)
    }
  }

  const handleDiscountThresholdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const value = Number(discountThreshold)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      toast.error('يجب أن تكون النسبة بين 0 و 100')
      return
    }

    setDiscountThresholdSaving(true)
    try {
      await saveHighDiscountThreshold(value)
      toast.success('تم حفظ حد الخصم بدون عرض. ننصح بإعادة فحص مراجعة الخصومات.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل حفظ الإعداد')
    } finally {
      setDiscountThresholdSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
        <p className="mt-1 text-sm text-gray-500">إدارة حسابك وكلمة المرور</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            معلومات الحساب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-gray-100 pb-2">
            <span className="text-gray-500">الاسم</span>
            <span className="font-medium">{profile?.full_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">الدور</span>
            <span className="font-medium">
              {profile?.role === 'super_admin' ? 'مدير عام' : 'موظف'}
            </span>
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-blue-600" />
              إعدادات مراجعة الخصومات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDiscountThresholdSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="discountThreshold">الحد الأقصى للخصم بدون عرض (%)</Label>
                <Input
                  id="discountThreshold"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  required
                  dir="ltr"
                  value={discountThreshold}
                  disabled={discountThresholdLoading}
                  onChange={(e) => setDiscountThreshold(e.target.value)}
                  placeholder="20"
                />
              </div>
              <p className="text-xs text-gray-500">
                يُستخدم عند فحص الفواتير لتحديد «خصم عالي بدون عرض». القيمة الحالية:{' '}
                {discountThresholdLoading ? '...' : `${discountThreshold}%`}
              </p>
              <Button
                type="submit"
                disabled={discountThresholdLoading || discountThresholdSaving}
                className="w-full"
              >
                {discountThresholdSaving ? 'جاري الحفظ...' : 'حفظ إعداد الخصم'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-blue-600" />
            تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
              <Input
                id="newPassword"
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور"
                dir="ltr"
              />
            </div>
            <p className="text-xs text-gray-500">يجب أن تكون كلمة المرور 6 أحرف على الأقل</p>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
