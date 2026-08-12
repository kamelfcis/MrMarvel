import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Filter,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanSearch,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { DiscountAuditInvoiceRow } from '../components/invoices/DiscountAuditInvoiceRow'
import { TablePagination, type PageSize } from '../components/TablePagination'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  attachInvoiceSummaries,
  DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT,
  fetchHighDiscountThreshold,
  FLAG_REASON_LABELS,
  groupFlagsByInvoice,
  scanDiscountFlags,
  type DiscountFlag,
  type FlagReason,
  type InvoiceDiscountAudit,
} from '../lib/discountAudit'
import { supabase } from '../lib/supabase'
import { formatDateMDY } from '../lib/utils'
import { cn } from '../components/ui/utils'

type Filters = {
  branch: string
  seller: string
  dateFrom: string
  dateTo: string
  reason: string
  reviewed: 'all' | 'pending' | 'reviewed'
}

const emptyFilters: Filters = {
  branch: '',
  seller: '',
  dateFrom: '',
  dateTo: '',
  reason: '',
  reviewed: 'pending',
}

function formatPct(value: number | null | undefined) {
  if (value == null) return '—'
  return `${Number(value).toFixed(1)}%`
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
}

function LoadingSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse gap-4 border-b border-gray-100 px-5 py-4 motion-reduce:animate-none"
        >
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

export default function AdminDiscountAuditPage() {
  const [invoices, setInvoices] = useState<InvoiceDiscountAudit[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [branches, setBranches] = useState<string[]>([])
  const [sellers, setSellers] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(25)
  const [noPromoThreshold, setNoPromoThreshold] = useState(
    DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT,
  )

  const fetchFilterOptions = useCallback(async () => {
    const [branchRes, sellerRes] = await Promise.all([
      supabase.from('discount_flags').select('branch_name'),
      supabase.from('discount_flags').select('seller_name'),
    ])
    setBranches(
      [...new Set((branchRes.data ?? []).map((r) => r.branch_name).filter(Boolean))] as string[],
    )
    setSellers(
      [...new Set((sellerRes.data ?? []).map((r) => r.seller_name).filter(Boolean))] as string[],
    )
  }, [])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch flags without reviewed filter so invoice-level status is accurate.
      let query = supabase
        .from('discount_flags')
        .select('*')
        .order('sale_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (filters.branch) query = query.eq('branch_name', filters.branch)
      if (filters.seller) query = query.eq('seller_name', filters.seller)
      if (filters.dateFrom) query = query.gte('sale_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('sale_date', filters.dateTo)
      if (filters.reason) query = query.eq('flag_reason', filters.reason)

      const { data, error } = await query
      if (error) throw error

      const flags = (data as DiscountFlag[]) ?? []
      let grouped = groupFlagsByInvoice(flags)

      if (filters.reviewed === 'pending') {
        grouped = grouped.filter((inv) => !inv.reviewedAll)
      } else if (filters.reviewed === 'reviewed') {
        grouped = grouped.filter((inv) => inv.reviewedAll)
      }

      const withSummaries = await attachInvoiceSummaries(grouped)
      setInvoices(withSummaries)
    } catch (err) {
      console.error(err)
      toast.error('فشل تحميل تنبيهات الخصم')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void fetchFilterOptions()
  }, [fetchFilterOptions])

  useEffect(() => {
    void fetchHighDiscountThreshold()
      .then(setNoPromoThreshold)
      .catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    void fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, pageSize])

  const totalPages = Math.max(1, Math.ceil(invoices.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return invoices.slice(start, start + pageSize)
  }, [invoices, safePage, pageSize])

  const stats = useMemo(() => {
    const pending = invoices.filter((inv) => !inv.reviewedAll).length
    const reviewed = invoices.filter((inv) => inv.reviewedAll).length
    return { total: invoices.length, pending, reviewed }
  }, [invoices])

  const handleRescan = async () => {
    setScanning(true)
    try {
      const result = await scanDiscountFlags({
        dateFrom: filters.dateFrom || null,
        dateTo: filters.dateTo || null,
      })
      const threshold = await fetchHighDiscountThreshold()
      setNoPromoThreshold(threshold)
      toast.success(
        `تم الفحص: ${result.scanned.toLocaleString('ar-EG')} صف — ${result.flagged.toLocaleString('ar-EG')} تنبيه`,
      )
      await fetchInvoices()
      await fetchFilterOptions()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'فشل إعادة الفحص')
    } finally {
      setScanning(false)
    }
  }

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof Filters; label: string }> = []
    if (filters.branch) chips.push({ key: 'branch', label: `الفرع: ${filters.branch}` })
    if (filters.seller) chips.push({ key: 'seller', label: `الكاشير: ${filters.seller}` })
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `من: ${formatDateMDY(filters.dateFrom)}` })
    if (filters.dateTo) chips.push({ key: 'dateTo', label: `إلى: ${formatDateMDY(filters.dateTo)}` })
    if (filters.reason) {
      chips.push({
        key: 'reason',
        label: `السبب: ${FLAG_REASON_LABELS[filters.reason as FlagReason] ?? filters.reason}`,
      })
    }
    if (filters.reviewed !== 'all') {
      chips.push({
        key: 'reviewed',
        label: filters.reviewed === 'pending' ? 'قيد المراجعة' : 'تمت المراجعة',
      })
    }
    return chips
  }, [filters])

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">مراجعة خصومات الكاشير</h1>
          <p className="mt-1 text-sm text-gray-500">
            فواتير بخصومات تتجاوز العروض المعرّفة — الحد المسموح بدون عرض:{' '}
            {noPromoThreshold.toLocaleString('ar-EG')}%
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchInvoices()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            تحديث
          </Button>
          <Button onClick={() => void handleRescan()} disabled={scanning}>
            <ScanSearch className={cn('h-4 w-4', scanning && 'animate-pulse')} />
            {scanning ? 'جاري الفحص...' : 'إعادة فحص'}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Receipt className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-gray-500">الفواتير المعروضة</p>
              <p className="text-xl font-bold text-gray-900">
                {stats.total.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Filter className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-xs text-gray-500">قيد المراجعة</p>
              <p className="text-xl font-bold text-red-700">
                {stats.pending.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">تمت المراجعة</p>
              <p className="text-xl font-bold text-green-700">
                {stats.reviewed.toLocaleString('ar-EG')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label>الفرع</Label>
            <Select
              value={filters.branch || '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, branch: v === '__all__' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>الكاشير</Label>
            <Select
              value={filters.seller || '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, seller: v === '__all__' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {sellers.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-from">من تاريخ</Label>
            <Input
              id="audit-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="audit-to">إلى تاريخ</Label>
            <Input
              id="audit-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>السبب</Label>
            <Select
              value={filters.reason || '__all__'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, reason: v === '__all__' ? '' : v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">الكل</SelectItem>
                {(Object.keys(FLAG_REASON_LABELS) as FlagReason[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {FLAG_REASON_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>حالة المراجعة</Label>
            <Select
              value={filters.reviewed}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, reviewed: v as Filters['reviewed'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="reviewed">تمت المراجعة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  [chip.key]: chip.key === 'reviewed' ? 'all' : '',
                }))
              }
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-800"
            >
              {chip.label}
              <X className="h-3 w-3" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters(emptyFilters)}
            className="text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            مسح الفلاتر
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <LoadingSkeleton />
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 rounded-full bg-green-50 p-4 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="text-base font-medium text-gray-700">لا توجد فواتير مشبوهة</p>
            <p className="mt-1 max-w-md text-sm text-gray-500">
              جرّب تغيير الفلاتر أو اضغط «إعادة فحص» بعد استيراد الفواتير وتعريف العروض
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-right text-gray-500">
                    <th className="px-4 py-3 font-medium">الفاتورة</th>
                    <th className="px-4 py-3 font-medium">الكاشير</th>
                    <th className="px-4 py-3 font-medium">الفرع</th>
                    <th className="px-4 py-3 font-medium">التاريخ</th>
                    <th className="px-4 py-3 font-medium">إجمالي الفاتورة</th>
                    <th className="px-4 py-3 font-medium">نسبة الخصم</th>
                    <th className="px-4 py-3 font-medium">مسموح</th>
                    <th className="px-4 py-3 font-medium">إجمالي الخصم</th>
                    <th className="px-4 py-3 font-medium">حالة</th>
                    <th className="px-4 py-3 font-medium">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((invoice) => (
                    <DiscountAuditInvoiceRow
                      key={invoice.invoice_number}
                      invoice={invoice}
                      formatCurrency={formatCurrency}
                      formatDate={formatDateMDY}
                      formatPct={formatPct}
                      variant="table"
                      onReviewedChange={fetchInvoices}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {pageRows.map((invoice) => (
                <DiscountAuditInvoiceRow
                  key={invoice.invoice_number}
                  invoice={invoice}
                  formatCurrency={formatCurrency}
                  formatDate={formatDateMDY}
                  formatPct={formatPct}
                  variant="card"
                  onReviewedChange={fetchInvoices}
                />
              ))}
            </div>

            <TablePagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={invoices.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>
    </div>
  )
}
