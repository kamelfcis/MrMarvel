import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Layers,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
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
  countInventoryGroupUsage,
  getInventoryGroupDeleteError,
  isDuplicateGroupName,
  normalizeGroupName,
} from '../lib/inventoryGroups'
import { supabase, type InventoryGroup } from '../lib/supabase'
import { cn } from '../components/ui/utils'

type SortDirection = 'asc' | 'desc'

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-4"
        >
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200 mx-4" />
          <div className="h-8 w-20 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasGroups }: { hasGroups: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600">
        <Layers className="h-8 w-8" />
      </div>
      <p className="text-base font-medium text-gray-700">
        {hasGroups ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد مجموعات جرد'}
      </p>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        {hasGroups
          ? 'جرّب تعديل كلمة البحث أو مسح التصفية.'
          : 'أضف مجموعة جرد جديدة للبدء.'}
      </p>
    </div>
  )
}

export default function AdminInventoryGroupsPage() {
  const [groups, setGroups] = useState<InventoryGroup[]>([])
  const [usageCounts, setUsageCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(10)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<InventoryGroup | null>(null)
  const [formName, setFormName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchGroups = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventory_groups')
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      toast.error('فشل تحميل مجموعات الجرد')
      console.error(error)
      setGroups([])
      setUsageCounts({})
    } else {
      const rows = (data as InventoryGroup[]) ?? []
      setGroups(rows)

      const counts: Record<number, number> = {}
      await Promise.all(
        rows.map(async (group) => {
          try {
            counts[group.id] = await countInventoryGroupUsage(group.id)
          } catch {
            counts[group.id] = 0
          }
        })
      )
      setUsageCounts(counts)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const filtered = term
      ? groups.filter((g) => g.name.toLowerCase().includes(term))
      : groups

    return [...filtered].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, 'ar')
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [groups, searchTerm, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedGroups = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredGroups.slice(start, start + pageSize)
  }, [filteredGroups, safeCurrentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, sortDirection])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const resetForm = () => {
    setFormName('')
    setSelectedGroup(null)
  }

  const openEditDialog = (group: InventoryGroup) => {
    setSelectedGroup(group)
    setFormName(group.name)
    setEditOpen(true)
  }

  const openDeleteDialog = (group: InventoryGroup) => {
    setSelectedGroup(group)
    setDeleteOpen(true)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = normalizeGroupName(formName)

    if (!name) {
      toast.error('اسم المجموعة مطلوب')
      return
    }

    if (isDuplicateGroupName(groups, name)) {
      toast.error('يوجد مجموعة بنفس الاسم بالفعل')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('inventory_groups').insert({ name })

    if (error) {
      toast.error('فشل إضافة المجموعة')
      console.error(error)
    } else {
      toast.success('تمت إضافة المجموعة بنجاح')
      setAddOpen(false)
      resetForm()
      await fetchGroups()
    }
    setSubmitting(false)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroup) return

    const name = normalizeGroupName(formName)

    if (!name) {
      toast.error('اسم المجموعة مطلوب')
      return
    }

    if (isDuplicateGroupName(groups, name, selectedGroup.id)) {
      toast.error('يوجد مجموعة بنفس الاسم بالفعل')
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('inventory_groups')
      .update({ name })
      .eq('id', selectedGroup.id)

    if (error) {
      toast.error('فشل تحديث المجموعة')
      console.error(error)
    } else {
      toast.success('تم تحديث المجموعة بنجاح')
      setEditOpen(false)
      resetForm()
      await fetchGroups()
    }
    setSubmitting(false)
  }

  const handleDelete = async () => {
    if (!selectedGroup) return

    const usage = usageCounts[selectedGroup.id] ?? 0
    if (usage > 0) {
      toast.error(`لا يمكن الحذف — المجموعة مستخدمة في ${usage.toLocaleString('ar-EG')} جرد`)
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('inventory_groups')
      .delete()
      .eq('id', selectedGroup.id)

    if (error) {
      const friendly = getInventoryGroupDeleteError(error)
      toast.error(friendly ?? 'فشل حذف المجموعة')
      console.error(error)
    } else {
      toast.success('تم حذف المجموعة بنجاح')
      setDeleteOpen(false)
      resetForm()
      await fetchGroups()
    }
    setSubmitting(false)
  }

  const totalUsage = useMemo(
    () => Object.values(usageCounts).reduce((sum, count) => sum + count, 0),
    [usageCounts]
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة مجموعات الجرد</h1>
          <p className="mt-1 text-sm text-gray-500">
            إضافة وتعديل وحذف مجموعات الجرد المستخدمة في النظام
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchGroups} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            تحديث
          </Button>
          <Button onClick={() => { resetForm(); setAddOpen(true) }}>
            <Plus className="h-4 w-4" />
            إضافة مجموعة
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">إجمالي المجموعات</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : groups.length.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-green-100 bg-gradient-to-br from-white to-green-50/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-green-100 p-3 text-green-700">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">جرد مرتبط</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : totalUsage.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-purple-100 bg-gradient-to-br from-white to-purple-50/50 shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">نتائج البحث</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : filteredGroups.length.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="بحث باسم المجموعة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pr-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="gap-2 border-blue-200 bg-white"
          >
            {sortDirection === 'asc' ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
            {sortDirection === 'asc' ? 'أ → ي' : 'ي → أ'}
          </Button>
        </div>

        {loading ? (
          <LoadingSkeleton />
        ) : paginatedGroups.length === 0 ? (
          <EmptyState hasGroups={groups.length > 0} />
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-right text-gray-500">
                      <th className="px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">اسم المجموعة</th>
                      <th className="px-5 py-3 font-medium">جرد مرتبط</th>
                      <th className="px-5 py-3 font-medium">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedGroups.map((group) => {
                      const usage = usageCounts[group.id] ?? 0
                      return (
                        <tr
                          key={group.id}
                          className="border-b border-gray-100 transition hover:bg-blue-50/30"
                        >
                          <td className="px-5 py-3 text-gray-500">
                            {group.id.toLocaleString('ar-EG')}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">{group.name}</td>
                          <td className="px-5 py-3">
                            {usage > 0 ? (
                              <Badge variant="info">
                                {usage.toLocaleString('ar-EG')} جرد
                              </Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(group)}
                              >
                                <Pencil className="h-4 w-4" />
                                تعديل
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(group)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                                حذف
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {paginatedGroups.map((group) => {
                const usage = usageCounts[group.id] ?? 0
                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{group.name}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          رقم: {group.id.toLocaleString('ar-EG')}
                        </p>
                      </div>
                      {usage > 0 && (
                        <Badge variant="info">{usage.toLocaleString('ar-EG')} جرد</Badge>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditDialog(group)}
                      >
                        <Pencil className="h-4 w-4" />
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => openDeleteDialog(group)}
                      >
                        <Trash2 className="h-4 w-4" />
                        حذف
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>

            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredGroups.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              إضافة مجموعة جرد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-group-name">اسم المجموعة</Label>
              <Input
                id="add-group-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="مثال: بنطلون"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              تعديل مجموعة الجرد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">اسم المجموعة</Label>
              <Input
                id="edit-group-name"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          {selectedGroup && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                هل أنت متأكد من حذف المجموعة{' '}
                <span className="font-semibold text-gray-900">{selectedGroup.name}</span>؟
              </p>
              {(usageCounts[selectedGroup.id] ?? 0) > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  تحذير: هذه المجموعة مستخدمة في{' '}
                  {(usageCounts[selectedGroup.id] ?? 0).toLocaleString('ar-EG')} جرد محفوظ ولا
                  يمكن حذفها.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                submitting ||
                (selectedGroup ? (usageCounts[selectedGroup.id] ?? 0) > 0 : false)
              }
            >
              {submitting ? 'جاري الحذف...' : 'حذف المجموعة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
