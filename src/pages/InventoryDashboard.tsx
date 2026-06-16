import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js'
import { useEffect, useMemo, useState } from 'react'
import { Pie, Bar } from 'react-chartjs-2'
import { Link } from 'react-router-dom'
import {
  Calculator,
  DollarSign,
  Settings,
  Users,
  FileSpreadsheet,
  History,
  LogOut,
  Menu,
  Save,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../contexts/AuthContext'
import {
  supabase,
  type CurrentInventoryResults,
  type InventoryCount,
  type InventoryResultItem,
} from '../lib/supabase'
import {
  compareInventory,
  computeStats,
  exportInventoryToExcel,
  readExcelFile,
} from '../lib/inventory'
import { BRANCHES, INVENTORY_GROUPS } from '../lib/constants'
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
import { Progress } from '../components/ui/progress'
import { cn } from '../components/ui/utils'
import { type PageSize } from '../components/TablePagination'
import { InventoryFilters } from '../components/inventory/InventoryFilters'
import { InventoryResultsTable } from '../components/inventory/InventoryResultsTable'
import { SavedInventoriesModal } from '../components/inventory/SavedInventoriesModal'
import {
  applyInventoryFilters,
  clearFilterKey,
  countActiveFilters,
  DEFAULT_INVENTORY_FILTERS,
  getActiveFilterChips,
  type InventoryFilterState,
} from '../lib/inventoryFilters'

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function InventoryDashboard() {
  const { user, profile, signOut, isSuperAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [branchId, setBranchId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [systemFile, setSystemFile] = useState<File | null>(null)
  const [actualFile, setActualFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<InventoryResultItem[]>([])
  const [currentInventory, setCurrentInventory] = useState<CurrentInventoryResults | null>(null)
  const [filters, setFilters] = useState<InventoryFilterState>(DEFAULT_INVENTORY_FILTERS)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(25)
  const [saveOpen, setSaveOpen] = useState(false)
  const [savedOpen, setSavedOpen] = useState(false)
  const [inventoryName, setInventoryName] = useState('')
  const [savedInventories, setSavedInventories] = useState<InventoryCount[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [loadingModal, setLoadingModal] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const stats = useMemo(() => computeStats(results), [results])

  const filteredResults = useMemo(
    () => applyInventoryFilters(results, filters, currentInventory),
    [results, filters, currentInventory]
  )

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters])

  const filterChips = useMemo(() => {
    const branchName = BRANCHES.find((branch) => branch.id === Number(filters.branchId))?.name
    const groupName = INVENTORY_GROUPS.find(
      (group) => group.id === Number(filters.groupId)
    )?.name
    return getActiveFilterChips(filters, branchName, groupName)
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedResults = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredResults.slice(start, start + pageSize)
  }, [filteredResults, safeCurrentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const statusChartData = useMemo(
    () => ({
      labels: ['متطابقة', 'زيادة', 'نقص', 'جديدة'],
      datasets: [
        {
          data: [
            results.filter((i) => i.statusType === 'matched').length,
            results.filter((i) => i.statusType === 'increase').length,
            results.filter((i) => i.statusType === 'decrease').length,
            results.filter((i) => i.statusType === 'new').length,
          ],
          backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#8B5CF6'],
        },
      ],
    }),
    [results]
  )

  const topMismatches = useMemo(
    () =>
      [...results]
        .filter((i) => i.difference !== 0)
        .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
        .slice(0, 5),
    [results]
  )

  const handleProcess = async () => {
    if (!branchId || !groupId || !systemFile || !actualFile) {
      toast.error('الرجاء اختيار الفرع والمجموعة ورفع الملفين المطلوبين')
      return
    }

    setProcessing(true)
    try {
      const [systemData, actualData] = await Promise.all([
        readExcelFile(systemFile),
        readExcelFile(actualFile),
      ])
      const compared = compareInventory(systemData, actualData)
      setResults(compared)
      setFilters(DEFAULT_INVENTORY_FILTERS)
      setCurrentPage(1)
      setCurrentInventory({
        branchId: parseInt(branchId),
        inventoryGroupId: parseInt(groupId),
        results: compared,
      })
      toast.success('تمت معالجة البيانات بنجاح')
    } catch {
      toast.error('حدث خطأ أثناء معالجة الملفات')
    } finally {
      setProcessing(false)
    }
  }

  const handleSave = async () => {
    if (!currentInventory || !user) return

    const name = inventoryName.trim() || `جرد ${new Date().toLocaleString('ar-EG')}`
    setLoadingModal(true)
    setLoadingMessage('جاري حفظ الجرد...')
    setProgress(20)

    const s = computeStats(currentInventory.results)

    try {
      setProgress(40)
      const { data: inventoryCount, error: countError } = await supabase
        .from('inventory_counts')
        .insert([
          {
            branch_id: currentInventory.branchId,
            inventory_group_id: currentInventory.inventoryGroupId,
            created_by_id: user.id,
            created_by: profile?.full_name || user.email,
            total_items: s.totalItems,
            matching_items: s.matchingItems,
            mismatch_items: s.mismatchItems,
            new_items: s.newItems,
            total_increase: s.totalIncrease,
            total_decrease: s.totalDecrease,
            accuracy_rate: s.accuracyRate,
            name,
          },
        ])
        .select()
        .single()

      if (countError) throw countError

      setProgress(70)
      const inventoryItems = currentInventory.results.map((item) => ({
        inventory_id: inventoryCount.id,
        barcode: item.barcode,
        name: item.name || 'غير مسجل في النظام',
        color: item.color || 'غير معروف',
        size: item.size || 'غير معروف',
        system_qty: item.systemQty || 0,
        actual_qty: item.actualQty || 0,
        difference: item.difference || 0,
        status: item.status || 'صنف جديد',
        status_type: item.statusType || 'new',
      }))

      const { error: itemsError } = await supabase
        .from('inventory_items')
        .insert(inventoryItems)

      if (itemsError) throw itemsError

      setProgress(100)
      toast.success('تم حفظ الجرد بنجاح')
      setSaveOpen(false)
      setInventoryName('')
    } catch (error) {
      console.error(error)
      toast.error('حدث خطأ أثناء حفظ الجرد')
    } finally {
      setTimeout(() => {
        setLoadingModal(false)
        setProgress(0)
      }, 400)
    }
  }

  const loadSavedInventories = async () => {
    setLoadingSaved(true)
    try {
      const { data, error } = await supabase
        .from('inventory_counts')
        .select(
          `
          *,
          branches:branch_id(name),
          inventory_groups:inventory_group_id(name),
          profiles:created_by_id(full_name)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedInventories((data as InventoryCount[]) || [])
    } catch {
      toast.error('حدث خطأ أثناء تحميل الجرد المحفوظة')
    } finally {
      setLoadingSaved(false)
    }
  }

  const viewInventory = async (inventoryId: number) => {
    setLoadingModal(true)
    setLoadingMessage('جاري تحميل بيانات الجرد...')
    setProgress(10)

    try {
      const { data: inventory, error: invError } = await supabase
        .from('inventory_counts')
        .select('*')
        .eq('id', inventoryId)
        .single()

      if (invError) throw invError

      setProgress(40)
      let allItems: Array<{
        barcode: string
        name: string
        color: string
        size: string
        system_qty: number
        actual_qty: number
        difference: number
        status: string
        status_type: string
      }> = []
      let start = 0
      const batchSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('inventory_id', inventoryId)
          .range(start, start + batchSize - 1)

        if (error) throw error
        allItems = [...allItems, ...(data || [])]
        hasMore = (data?.length || 0) === batchSize
        start += batchSize
      }

      setProgress(80)
      const processed = allItems.map((item) => ({
        barcode: item.barcode,
        name: item.name,
        color: item.color,
        size: item.size,
        systemQty: item.system_qty,
        actualQty: item.actual_qty,
        difference: item.difference,
        status: item.status,
        statusClass: '',
        statusType: item.status_type as InventoryResultItem['statusType'],
      }))

      setResults(processed)
      setFilters(DEFAULT_INVENTORY_FILTERS)
      setCurrentPage(1)
      setCurrentInventory({
        branchId: inventory.branch_id,
        inventoryGroupId: inventory.inventory_group_id,
        results: processed,
      })
      setBranchId(String(inventory.branch_id))
      setGroupId(String(inventory.inventory_group_id))
      setSavedOpen(false)
      toast.success(`تم تحميل جرد ${inventory.name || ''} بنجاح`)
    } catch {
      toast.error('حدث خطأ أثناء تحميل الجرد')
    } finally {
      setTimeout(() => {
        setLoadingModal(false)
        setProgress(0)
      }, 400)
    }
  }

  const deleteInventory = async (inventoryId: number) => {
    setLoadingModal(true)
    setLoadingMessage('جاري حذف الجرد...')

    try {
      const { error: itemsError } = await supabase
        .from('inventory_items')
        .delete()
        .eq('inventory_id', inventoryId)
      if (itemsError) throw itemsError

      const { error: countError } = await supabase
        .from('inventory_counts')
        .delete()
        .eq('id', inventoryId)
      if (countError) throw countError

      toast.success('تم حذف الجرد بنجاح')
      await loadSavedInventories()
    } catch {
      toast.error('حدث خطأ أثناء حذف الجرد')
    } finally {
      setLoadingModal(false)
    }
  }

  const handleExport = () => {
    if (!currentInventory) {
      toast.error('لا توجد بيانات لتصديرها')
      return
    }
    const branchName = BRANCHES.find((b) => b.id === currentInventory.branchId)?.name || ''
    const groupName =
      INVENTORY_GROUPS.find((g) => g.id === currentInventory.inventoryGroupId)?.name || ''
    exportInventoryToExcel(results, branchName, groupName)
  }

  const statCards = [
    { title: 'إجمالي الأصناف', value: stats.totalItems, color: 'blue', subtitle: 'كل الأصناف المدرجة' },
    { title: 'متطابقة', value: stats.matchingItems, color: 'green', subtitle: 'أصناف متطابقة مع النظام' },
    { title: 'غير متطابقة', value: stats.mismatchItems, color: 'red', subtitle: 'أصناف مختلفة عن النظام' },
    { title: 'جديدة', value: stats.newItems, color: 'purple', subtitle: 'أصناف غير مسجلة في النظام' },
    { title: 'إجمالي زيادة', value: stats.totalIncrease, color: 'yellow', subtitle: 'كمية الزيادة الإجمالية' },
    { title: 'إجمالي نقص', value: stats.totalDecrease, color: 'orange', subtitle: 'كمية النقص الإجمالية' },
    { title: 'معدل الدقة', value: `${stats.accuracyRate}%`, color: 'indigo', subtitle: 'نسبة التطابق مع النظام' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'border-blue-100 bg-blue-50 text-blue-800',
    green: 'border-green-100 bg-green-50 text-green-800',
    red: 'border-red-100 bg-red-50 text-red-800',
    purple: 'border-purple-100 bg-purple-50 text-purple-800',
    yellow: 'border-yellow-100 bg-yellow-50 text-yellow-800',
    orange: 'border-orange-100 bg-orange-50 text-orange-800',
    indigo: 'border-indigo-100 bg-indigo-50 text-indigo-800',
  }

  return (
    <div className="flex min-h-screen bg-gray-100" dir="rtl">
      <button
        className="fixed left-4 top-4 z-50 rounded-lg bg-blue-600 p-2 text-white lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-40 w-64 overflow-y-auto bg-blue-800 p-4 text-white transition-transform lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="mb-8 flex justify-center">
          <img src="/logo.jpg" alt="Logo" className="h-16 w-16 rounded-full border-4 border-white" />
        </div>

        <div className="mb-8">
          <h2 className="mb-4 border-b border-blue-700 pb-2 text-lg font-bold">إعدادات الجرد</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm">اختر الفرع:</label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-lg border border-blue-600 bg-blue-700 p-2 text-white"
              >
                <option value="">-- اختر الفرع --</option>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm">اختر مجموعة الجرد:</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-blue-600 bg-blue-700 p-2 text-white"
              >
                <option value="">-- اختر المجموعة --</option>
                {INVENTORY_GROUPS.map((g) => (
                  <option key={g.id} value={String(g.id)}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 border-b border-blue-700 pb-2 text-lg font-bold">رفع الملفات</h2>
          <div className="space-y-4">
            <label className="block cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-center text-sm transition hover:bg-blue-600">
              {systemFile?.name || 'ملف الرصيد من النظام'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setSystemFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="block cursor-pointer rounded-lg bg-blue-700 px-4 py-2 text-center text-sm transition hover:bg-blue-600">
              {actualFile?.name || 'جرد البضاعة الفعلية'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setActualFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button variant="success" className="w-full" onClick={handleProcess} disabled={processing}>
              <Calculator className="h-4 w-4" />
              {processing ? 'جاري المعالجة...' : 'معالجة البيانات'}
            </Button>
          </div>
        </div>

        <div className="mb-4 space-y-2">
          {isSuperAdmin && (
            <>
              <Link
                to="/salary"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm transition hover:bg-blue-600"
              >
                <DollarSign className="h-4 w-4" />
                إدارة المرتبات
              </Link>
              <Link
                to="/admin/users"
                className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm transition hover:bg-blue-600"
              >
                <Users className="h-4 w-4" />
                إدارة المستخدمين
              </Link>
            </>
          )}
          <Link
            to="/settings"
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm transition hover:bg-blue-600"
          >
            <Settings className="h-4 w-4" />
            الإعدادات
          </Link>
        </div>

        <div className="border-t border-blue-700 pt-4">
          <p className="mb-2 text-center text-sm text-blue-200">{profile?.full_name}</p>
          <Button variant="destructive" className="w-full" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <main className="flex-1 overflow-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">نظام جرد MR Marvel</CardTitle>
            <p className="text-center text-sm text-gray-500">
              عرض جميع الجرد المحفوظة من جميع الموظفين
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.slice(0, 4).map((card) => (
                <div
                  key={card.title}
                  className={cn('rounded-xl border p-4 transition hover:-translate-y-1 hover:shadow-md', colorMap[card.color])}
                >
                  <h3 className="text-lg font-medium">{card.title}</h3>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="mt-1 text-sm opacity-80">{card.subtitle}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {statCards.slice(4).map((card) => (
                <div
                  key={card.title}
                  className={cn('rounded-xl border p-4 transition hover:-translate-y-1 hover:shadow-md', colorMap[card.color])}
                >
                  <h3 className="text-lg font-medium">{card.title}</h3>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="mt-1 text-sm opacity-80">{card.subtitle}</p>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">توزيع حالة الأصناف</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <Pie data={statusChartData} options={{ maintainAspectRatio: false, responsive: true }} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">أكثر الأصناف اختلافاً</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <Bar
                      data={{
                        labels: topMismatches.map((i) => i.name),
                        datasets: [
                          {
                            label: 'الفرق',
                            data: topMismatches.map((i) => i.difference),
                            backgroundColor: topMismatches.map((i) =>
                              i.difference > 0 ? '#3B82F6' : '#EF4444'
                            ),
                          },
                        ],
                      }}
                      options={{
                        indexAxis: 'y',
                        maintainAspectRatio: false,
                        responsive: true,
                        plugins: { legend: { display: false } },
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}

            <InventoryFilters
              filters={filters}
              onFiltersChange={setFilters}
              activeFilterCount={activeFilterCount}
              filterChips={filterChips}
              onClearAll={() => setFilters(DEFAULT_INVENTORY_FILTERS)}
              onRemoveChip={(key) => setFilters((current) => clearFilterKey(current, key))}
              hasResults={results.length > 0}
              currentBranchId={currentInventory?.branchId}
              currentGroupId={currentInventory?.inventoryGroupId}
            />

            <InventoryResultsTable
              results={results}
              paginatedResults={paginatedResults}
              filteredCount={filteredResults.length}
              hasRawResults={results.length > 0}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />

            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                className="bg-purple-600 text-white hover:bg-purple-500"
                onClick={() => {
                  setSavedOpen(true)
                  loadSavedInventories()
                }}
              >
                <History className="h-4 w-4" />
                الجرد المحفوظة
              </Button>
              <Button variant="success" onClick={() => setSaveOpen(true)} disabled={!currentInventory}>
                <Save className="h-4 w-4" />
                حفظ الجرد
              </Button>
              <Button onClick={handleExport} disabled={!currentInventory}>
                <FileSpreadsheet className="h-4 w-4" />
                تصدير إلى Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حفظ نتائج الجرد</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>اسم الجرد (اختياري):</Label>
            <Input
              value={inventoryName}
              onChange={(e) => setInventoryName(e.target.value)}
              placeholder={`جرد ${new Date().toLocaleString('ar-EG')}`}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSave}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SavedInventoriesModal
        open={savedOpen}
        onOpenChange={setSavedOpen}
        inventories={savedInventories}
        loading={loadingSaved}
        currentUserId={user?.id}
        isSuperAdmin={isSuperAdmin}
        onView={viewInventory}
        onDelete={deleteInventory}
      />

      {loadingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-center text-lg font-bold">{loadingMessage}</h3>
            <Progress value={progress} />
          </div>
        </div>
      )}
    </div>
  )
}
