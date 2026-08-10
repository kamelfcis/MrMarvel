import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarRange,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { TablePagination, type PageSize } from '../components/TablePagination'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
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
import { useAuth } from '../contexts/AuthContext'
import { type PromoType, type Promotion } from '../lib/discountAudit'
import { supabase } from '../lib/supabase'
import { formatDateMDY } from '../lib/utils'
import { cn } from '../components/ui/utils'

type PromoForm = {
  name: string
  promo_type: PromoType
  branch_name: string
  item_name: string
  item_category: string
  max_discount_pct: string
  buy_qty: string
  get_qty: string
  valid_from: string
  valid_to: string
  is_active: boolean
}

const emptyForm: PromoForm = {
  name: '',
  promo_type: 'max_percent',
  branch_name: '',
  item_name: '',
  item_category: '',
  max_discount_pct: '',
  buy_qty: '2',
  get_qty: '1',
  valid_from: '',
  valid_to: '',
  is_active: true,
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-4 motion-reduce:animate-none"
        >
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="mx-4 h-4 flex-1 rounded bg-gray-200" />
          <div className="h-8 w-20 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function promoTypeLabel(type: PromoType) {
  return type === 'max_percent' ? 'نسبة خصم قصوى' : 'اشتري واحصل'
}

export default function AdminPromotionsPage() {
  const { user } = useAuth()
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | PromoType>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<PromoForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('فشل تحميل العروض')
      console.error(error)
      setPromos([])
    } else {
      setPromos((data as Promotion[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchPromos()
  }, [fetchPromos])

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return promos.filter((p) => {
      if (typeFilter !== 'all' && p.promo_type !== typeFilter) return false
      if (!term) return true
      return (
        p.name.toLowerCase().includes(term) ||
        (p.item_name ?? '').toLowerCase().includes(term) ||
        (p.item_category ?? '').toLowerCase().includes(term) ||
        (p.branch_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [promos, searchTerm, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, pageSize])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (promo: Promotion) => {
    setEditing(promo)
    setForm({
      name: promo.name,
      promo_type: promo.promo_type,
      branch_name: promo.branch_name ?? '',
      item_name: promo.item_name ?? '',
      item_category: promo.item_category ?? '',
      max_discount_pct:
        promo.max_discount_pct != null ? String(promo.max_discount_pct) : '',
      buy_qty: promo.buy_qty != null ? String(promo.buy_qty) : '2',
      get_qty: promo.get_qty != null ? String(promo.get_qty) : '1',
      valid_from: promo.valid_from,
      valid_to: promo.valid_to,
      is_active: promo.is_active,
    })
    setDialogOpen(true)
  }

  const openDelete = (promo: Promotion) => {
    setEditing(promo)
    setDeleteOpen(true)
  }

  const validateForm = (): string | null => {
    if (!form.name.trim()) return 'اسم العرض مطلوب'
    if (!form.valid_from || !form.valid_to) return 'تاريخ البداية والنهاية مطلوبان'
    if (form.valid_to < form.valid_from) return 'تاريخ النهاية يجب أن يكون بعد البداية'
    if (!form.item_name.trim() && !form.item_category.trim()) {
      return 'حدد اسم الصنف أو مجموعة الصنف على الأقل'
    }
    if (form.promo_type === 'max_percent') {
      const pct = Number(form.max_discount_pct)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return 'نسبة الخصم القصوى يجب أن تكون بين 0 و 100'
      }
    } else {
      const buy = Number(form.buy_qty)
      const get = Number(form.get_qty)
      if (!Number.isInteger(buy) || buy <= 0) return 'كمية الشراء يجب أن تكون رقماً موجباً'
      if (!Number.isInteger(get) || get <= 0) return 'كمية المجاني يجب أن تكون رقماً موجباً'
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateForm()
    if (err) {
      toast.error(err)
      return
    }

    const payload = {
      name: form.name.trim(),
      promo_type: form.promo_type,
      branch_name: form.branch_name.trim() || null,
      item_name: form.item_name.trim() || null,
      item_category: form.item_category.trim() || null,
      max_discount_pct:
        form.promo_type === 'max_percent' ? Number(form.max_discount_pct) : null,
      buy_qty: form.promo_type === 'buy_x_get_y' ? Number(form.buy_qty) : null,
      get_qty: form.promo_type === 'buy_x_get_y' ? Number(form.get_qty) : null,
      valid_from: form.valid_from,
      valid_to: form.valid_to,
      is_active: form.is_active,
      ...(editing ? {} : { created_by: user?.id ?? null }),
    }

    setSubmitting(true)
    if (editing) {
      const { error } = await supabase.from('promotions').update(payload).eq('id', editing.id)
      if (error) {
        toast.error('فشل تحديث العرض')
        console.error(error)
      } else {
        toast.success('تم تحديث العرض')
        setDialogOpen(false)
        await fetchPromos()
      }
    } else {
      const { error } = await supabase.from('promotions').insert(payload)
      if (error) {
        toast.error('فشل إضافة العرض')
        console.error(error)
      } else {
        toast.success('تمت إضافة العرض')
        setDialogOpen(false)
        await fetchPromos()
      }
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!editing) return
    setSubmitting(true)
    const { error } = await supabase.from('promotions').delete().eq('id', editing.id)
    if (error) {
      toast.error('فشل حذف العرض')
      console.error(error)
    } else {
      toast.success('تم حذف العرض')
      setDeleteOpen(false)
      setEditing(null)
      await fetchPromos()
    }
    setSubmitting(false)
  }

  const toggleActive = async (promo: Promotion) => {
    const { error } = await supabase
      .from('promotions')
      .update({ is_active: !promo.is_active })
      .eq('id', promo.id)
    if (error) {
      toast.error('فشل تحديث الحالة')
      console.error(error)
    } else {
      await fetchPromos()
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة العروض</h1>
          <p className="mt-1 text-sm text-gray-500">
            عرّف نسب الخصم القصوى وعروض اشتري واحصل لمقارنة خصومات الكاشير
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchPromos()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            تحديث
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            عرض جديد
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label htmlFor="promo-search">بحث</Label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="promo-search"
                className="pr-9"
                placeholder="اسم العرض، الصنف، الفرع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full space-y-1.5 sm:w-48">
            <Label>نوع العرض</Label>
            <Select
              value={typeFilter}
              onValueChange={(v) => setTypeFilter(v as 'all' | PromoType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="max_percent">نسبة خصم قصوى</SelectItem>
                <SelectItem value="buy_x_get_y">اشتري واحصل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600">
              <Tag className="h-8 w-8" />
            </div>
            <p className="text-base font-medium text-gray-700">لا توجد عروض</p>
            <p className="mt-1 text-sm text-gray-500">أضف عرضاً جديداً للبدء</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-right text-gray-500">
                    <th className="px-4 py-3 font-medium">العرض</th>
                    <th className="px-4 py-3 font-medium">النوع</th>
                    <th className="px-4 py-3 font-medium">المطابقة</th>
                    <th className="px-4 py-3 font-medium">التفاصيل</th>
                    <th className="px-4 py-3 font-medium">الفترة</th>
                    <th className="px-4 py-3 font-medium">الحالة</th>
                    <th className="px-4 py-3 font-medium">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((promo) => (
                    <tr key={promo.id} className="border-b border-gray-100 hover:bg-blue-50/20">
                      <td className="px-4 py-3 font-medium text-gray-900">{promo.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={promo.promo_type === 'max_percent' ? 'info' : 'purple'}>
                          {promoTypeLabel(promo.promo_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="space-y-0.5 text-xs">
                          {promo.branch_name ? (
                            <div>فرع: {promo.branch_name}</div>
                          ) : (
                            <div>كل الفروع</div>
                          )}
                          {promo.item_name && <div>صنف: {promo.item_name}</div>}
                          {promo.item_category && <div>مجموعة: {promo.item_category}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {promo.promo_type === 'max_percent'
                          ? `حد أقصى ${promo.max_discount_pct}%`
                          : `اشتري ${promo.buy_qty} واحصل على ${promo.get_qty}`}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {formatDateMDY(promo.valid_from)} — {formatDateMDY(promo.valid_to)}
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => void toggleActive(promo)}>
                          <Badge variant={promo.is_active ? 'success' : 'default'}>
                            {promo.is_active ? 'نشط' : 'متوقف'}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(promo)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openDelete(promo)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageRows.map((promo) => (
                <div
                  key={promo.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{promo.name}</p>
                      <Badge
                        className="mt-1"
                        variant={promo.promo_type === 'max_percent' ? 'info' : 'purple'}
                      >
                        {promoTypeLabel(promo.promo_type)}
                      </Badge>
                    </div>
                    <Badge variant={promo.is_active ? 'success' : 'default'}>
                      {promo.is_active ? 'نشط' : 'متوقف'}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {promo.promo_type === 'max_percent'
                      ? `حد أقصى ${promo.max_discount_pct}%`
                      : `اشتري ${promo.buy_qty} واحصل على ${promo.get_qty}`}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDateMDY(promo.valid_from)} — {formatDateMDY(promo.valid_to)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(promo)}>
                      <Pencil className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDelete(promo)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                      حذف
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <TablePagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.promo_type === 'max_percent' ? (
                <Percent className="h-5 w-5" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}
              {editing ? 'تعديل عرض' : 'عرض جديد'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="promo-name">اسم العرض</Label>
              <Input
                id="promo-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>نوع العرض</Label>
              <Select
                value={form.promo_type}
                onValueChange={(v) => setForm((f) => ({ ...f, promo_type: v as PromoType }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max_percent">نسبة خصم قصوى</SelectItem>
                  <SelectItem value="buy_x_get_y">اشتري N واحصل على مجاني</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.promo_type === 'max_percent' ? (
              <div className="space-y-1.5">
                <Label htmlFor="max-pct">نسبة الخصم القصوى (%)</Label>
                <Input
                  id="max-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.max_discount_pct}
                  onChange={(e) => setForm((f) => ({ ...f, max_discount_pct: e.target.value }))}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="buy-qty">اشتري (كمية)</Label>
                  <Input
                    id="buy-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={form.buy_qty}
                    onChange={(e) => setForm((f) => ({ ...f, buy_qty: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="get-qty">احصل مجاناً</Label>
                  <Input
                    id="get-qty"
                    type="number"
                    min={1}
                    step={1}
                    value={form.get_qty}
                    onChange={(e) => setForm((f) => ({ ...f, get_qty: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="branch">الفرع (فارغ = كل الفروع)</Label>
              <Input
                id="branch"
                value={form.branch_name}
                onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))}
                placeholder="مثال: الفرع الرئيسي"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="item-name">اسم الصنف</Label>
                <Input
                  id="item-name"
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="item-cat">مجموعة الصنف</Label>
                <Input
                  id="item-cat"
                  value={form.item_category}
                  onChange={(e) => setForm((f) => ({ ...f, item_category: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="from" className="flex items-center gap-1">
                  <CalendarRange className="h-3.5 w-3.5" />
                  من
                </Label>
                <Input
                  id="from"
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">إلى</Label>
                <Input
                  id="to"
                  type="date"
                  value={form.valid_to}
                  onChange={(e) => setForm((f) => ({ ...f, valid_to: e.target.value }))}
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              عرض نشط
            </label>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : editing ? 'حفظ التعديلات' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف العرض</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف العرض «{editing?.name}»؟
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={submitting} onClick={() => void handleDelete()}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
