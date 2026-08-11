import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { ExcelUploadZone } from '../components/invoices/ExcelUploadZone'
import { InvoiceRow } from '../components/invoices/InvoiceRow'
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
import { cn } from '../components/ui/utils'
import { useSalesImport } from '../hooks/useSalesImport'
import { filterInvoicesBySearch } from '../lib/invoiceSearch'
import {
  DEFAULT_INVOICE_SORT_DIRECTION,
  DEFAULT_INVOICE_SORT_FIELD,
  INVOICE_SORT_OPTIONS,
  sortInvoices,
  type InvoiceSortField,
  type SortDirection,
} from '../lib/invoiceSort'
import { supabase, type InvoiceSummary } from '../lib/supabase'
import { formatDateMDY } from '../lib/utils'

type InvoiceFilters = {
  branch: string
  seller: string
  dateFrom: string
  dateTo: string
  search: string
}

const emptyFilters: InvoiceFilters = {
  branch: '',
  seller: '',
  dateFrom: '',
  dateTo: '',
  search: '',
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
}

function TableSkeleton() {
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
          <div className="h-4 w-16 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}

function SortableHeader({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  field: InvoiceSortField
  label: string
  sortField: InvoiceSortField
  sortDirection: SortDirection
  onSort: (field: InvoiceSortField) => void
  className?: string
}) {
  const active = sortField === field
  const centered = className?.includes('text-center')

  return (
    <th className={cn('px-5 py-3 font-medium align-middle', className)}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          centered && 'w-full justify-center',
          active ? 'text-blue-700' : 'text-gray-500 hover:text-gray-800',
        )}
        aria-sort={
          active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <span>{label}</span>
        {active ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
          )
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
        )}
      </button>
    </th>
  )
}

function StatsCards({
  loading,
  totalInvoices,
  totalNetSales,
  totalReturns,
  avgInvoice,
}: {
  loading: boolean
  totalInvoices: number
  totalNetSales: number
  totalReturns: number
  avgInvoice: number
}) {
  const cards = [
    {
      label: 'إجمالي الفواتير',
      value: totalInvoices.toLocaleString('ar-EG'),
      icon: Receipt,
      tone: 'blue',
    },
    {
      label: 'صافي المبيعات',
      value: formatCurrency(totalNetSales),
      icon: TrendingUp,
      tone: 'green',
    },
    {
      label: 'إجمالي المرتجعات',
      value: formatCurrency(totalReturns),
      icon: RotateCcw,
      tone: 'red',
    },
    {
      label: 'متوسط قيمة الفاتورة',
      value: formatCurrency(avgInvoice),
      icon: FileText,
      tone: 'purple',
    },
  ] as const

  const toneClasses = {
    blue: 'border-blue-100 from-white to-blue-50/50 text-blue-700 bg-blue-100',
    green: 'border-green-100 from-white to-green-50/50 text-green-700 bg-green-100',
    red: 'border-red-100 from-white to-red-50/50 text-red-700 bg-red-100',
    purple: 'border-purple-100 from-white to-purple-50/50 text-purple-700 bg-purple-100',
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <Card
          key={label}
          className={cn('overflow-hidden bg-gradient-to-br shadow-sm', toneClasses[tone].split(' ').slice(0, 2).join(' '))}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <div className={cn('rounded-xl p-3', toneClasses[tone].split(' ').slice(2).join(' '))}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-bold text-gray-900">{loading ? '—' : value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default function AdminInvoicesPage() {
  const [searchParams] = useSearchParams()
  const [allInvoices, setAllInvoices] = useState<InvoiceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InvoiceFilters>(emptyFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [branches, setBranches] = useState<string[]>([])
  const [sellers, setSellers] = useState<string[]>([])
  const [suspiciousInvoices, setSuspiciousInvoices] = useState<Set<string>>(new Set())
  const [uploadOpen, setUploadOpen] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(25)
  const [sortField, setSortField] = useState<InvoiceSortField>(DEFAULT_INVOICE_SORT_FIELD)
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_INVOICE_SORT_DIRECTION)

  useEffect(() => {
    const invoiceParam = searchParams.get('invoice')
    if (invoiceParam) {
      setFilters((prev) => ({ ...prev, search: invoiceParam }))
    }
  }, [searchParams])

  const fetchFilterOptions = useCallback(async () => {
    const [branchRes, sellerRes] = await Promise.all([
      supabase.from('branch_stats').select('branch_name').order('branch_name'),
      supabase.from('seller_stats').select('seller_name').order('seller_name'),
    ])
    setBranches(
      [...new Set((branchRes.data ?? []).map((r) => r.branch_name).filter(Boolean))] as string[],
    )
    setSellers(
      [...new Set((sellerRes.data ?? []).map((r) => r.seller_name).filter(Boolean))] as string[],
    )
  }, [])

  const fetchSuspiciousInvoices = useCallback(async () => {
    const { data, error: flagError } = await supabase
      .from('discount_flags')
      .select('invoice_number')
      .eq('reviewed', false)

    if (flagError) {
      console.error(flagError)
      setSuspiciousInvoices(new Set())
      return
    }
    setSuspiciousInvoices(
      new Set((data ?? []).map((r) => r.invoice_number).filter(Boolean) as string[]),
    )
  }, [])

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('invoice_summary')
        .select('*')
        .order('invoice_date', { ascending: false })

      if (filters.branch) query = query.eq('branch_name', filters.branch)
      if (filters.seller) query = query.eq('seller_name', filters.seller)
      if (filters.dateFrom) query = query.gte('invoice_date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('invoice_date', filters.dateTo)

      const { data, error: queryError } = await query

      if (queryError) throw queryError

      setAllInvoices((data as InvoiceSummary[]) ?? [])
    } catch (err) {
      console.error(err)
      setError('فشل تحميل بيانات الفواتير')
      setAllInvoices([])
    } finally {
      setLoading(false)
    }
  }, [filters.branch, filters.seller, filters.dateFrom, filters.dateTo])

  const { uploading, clearing, progress, lastSummary, uploadFile, clearAllSales, resetProgress } =
    useSalesImport(() => {
      void fetchInvoices()
      void fetchFilterOptions()
      void fetchSuspiciousInvoices()
    })

  useEffect(() => {
    void fetchFilterOptions()
    void fetchSuspiciousInvoices()
  }, [fetchFilterOptions, fetchSuspiciousInvoices])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [filters.search])

  useEffect(() => {
    void fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters, debouncedSearch, pageSize, sortField, sortDirection])

  const filteredInvoices = useMemo(
    () => filterInvoicesBySearch(allInvoices, debouncedSearch),
    [allInvoices, debouncedSearch],
  )

  const isSearching = debouncedSearch.trim().length > 0

  const sortedInvoices = useMemo(
    () => sortInvoices(filteredInvoices, sortField, sortDirection),
    [filteredInvoices, sortField, sortDirection],
  )

  const stats = useMemo(() => {
    const totalInvoices = filteredInvoices.length
    const totalNetSales = filteredInvoices.reduce((s, i) => s + (i.total_net_sales ?? 0), 0)
    const totalReturns = filteredInvoices.reduce((s, i) => s + (i.total_returns ?? 0), 0)
    const avgInvoice = totalInvoices > 0 ? totalNetSales / totalInvoices : 0
    return { totalInvoices, totalNetSales, totalReturns, avgInvoice }
  }, [filteredInvoices])

  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedInvoices = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedInvoices.slice(start, start + pageSize)
  }, [sortedInvoices, safePage, pageSize])

  const handleSort = (field: InvoiceSortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDirection(field === 'invoice_date' ? 'desc' : 'asc')
  }

  const activeFilters = useMemo(() => {
    const chips: Array<{ key: keyof InvoiceFilters; label: string }> = []
    if (filters.branch) chips.push({ key: 'branch', label: `الفرع: ${filters.branch}` })
    if (filters.seller) chips.push({ key: 'seller', label: `البائع: ${filters.seller}` })
    if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `من: ${formatDateMDY(filters.dateFrom)}` })
    if (filters.dateTo) chips.push({ key: 'dateTo', label: `إلى: ${formatDateMDY(filters.dateTo)}` })
    if (filters.search) chips.push({ key: 'search', label: `بحث: ${filters.search}` })
    return chips
  }, [filters])

  const clearFilters = () => setFilters(emptyFilters)

  const removeFilter = (key: keyof InvoiceFilters) => {
    setFilters((prev) => ({ ...prev, [key]: '' }))
  }

  const hasAnyData =
    !loading && !error && allInvoices.length === 0 && activeFilters.length === 0

  const hasInvoiceData = allInvoices.length > 0

  const handleClearAll = async () => {
    try {
      await clearAllSales()
      setClearOpen(false)
    } catch {
      // toast shown in hook
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">جرد الفواتير</h1>
          <p className="mt-1 text-sm text-gray-500">
            استعراض فواتير المبيعات ورفع ملفات Excel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchInvoices()} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin motion-reduce:animate-none')} />
            تحديث
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            disabled={loading || uploading || clearing || !hasInvoiceData}
            onClick={() => setClearOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            مسح كل البيانات
          </Button>
          <Button onClick={() => setUploadOpen(true)} disabled={uploading || clearing}>
            <Upload className="h-4 w-4" />
            رفع Excel
          </Button>
        </div>
      </div>

      <StatsCards loading={loading} {...stats} />

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Filter className="h-4 w-4 text-blue-600" />
            تصفية وبحث
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="branch-filter">الفرع</Label>
              <Select
                value={filters.branch || '__all__'}
                onValueChange={(v) => setFilters((p) => ({ ...p, branch: v === '__all__' ? '' : v }))}
              >
                <SelectTrigger id="branch-filter">
                  <SelectValue placeholder="كل الفروع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">كل الفروع</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seller-filter">البائع</Label>
              <Select
                value={filters.seller || '__all__'}
                onValueChange={(v) => setFilters((p) => ({ ...p, seller: v === '__all__' ? '' : v }))}
              >
                <SelectTrigger id="seller-filter">
                  <SelectValue placeholder="كل البائعين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">كل البائعين</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-from">من تاريخ</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters((p) => ({ ...p, dateFrom: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date-to">إلى تاريخ</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters((p) => ({ ...p, dateTo: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice-search">بحث</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="invoice-search"
                  placeholder="بحث في جميع الأعمدة..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  className="pr-10"
                />
              </div>
            </div>
          </div>

          {(activeFilters.length > 0 || isSearching) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeFilters.map(({ key, label }) => (
                <Badge key={key} variant="info" className="gap-1 pr-1">
                  {label}
                  <button
                    type="button"
                    onClick={() => removeFilter(key)}
                    className="rounded p-0.5 transition hover:bg-blue-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`إزالة ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {isSearching && !loading && (
                <span className="text-sm text-gray-600">
                  {filteredInvoices.length.toLocaleString('ar-EG')} نتيجة
                </span>
              )}
              {activeFilters.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  مسح الكل
                </Button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="text-gray-700">{error}</p>
            <Button variant="outline" onClick={() => void fetchInvoices()}>
              إعادة المحاولة
            </Button>
          </div>
        ) : paginatedInvoices.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-20 text-center">
            <div className="rounded-full bg-blue-50 p-4 text-blue-600">
              <Receipt className="h-8 w-8" />
            </div>
            <div>
              <p className="text-base font-medium text-gray-700">
                {hasAnyData ? 'لا توجد فواتير بعد' : 'لا توجد نتائج مطابقة'}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {hasAnyData
                  ? 'ارفع ملف Excel للبدء في جرد الفواتير.'
                  : 'جرّب تعديل عوامل التصفية أو مسح البحث.'}
              </p>
            </div>
            {hasAnyData && (
              <Button onClick={() => setUploadOpen(true)}>
                <Upload className="h-4 w-4" />
                رفع أول ملف
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-right text-gray-500">
                    {INVOICE_SORT_OPTIONS.map(({ value, label }) => (
                      <SortableHeader
                        key={value}
                        field={value}
                        label={label}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        className={value === 'customer_mobile' ? 'text-center' : undefined}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.map((invoice) => (
                    <InvoiceRow
                      key={`${invoice.invoice_number}-${invoice.branch_name}-${invoice.seller_name}`}
                      invoice={invoice}
                      formatCurrency={formatCurrency}
                      formatDate={formatDateMDY}
                      variant="table"
                      suspiciousDiscount={suspiciousInvoices.has(invoice.invoice_number)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="mobile-invoice-sort">ترتيب حسب</Label>
                  <Select
                    value={sortField}
                    onValueChange={(value) => {
                      const field = value as InvoiceSortField
                      setSortField(field)
                      if (field === 'invoice_date') {
                        setSortDirection('desc')
                      }
                    }}
                  >
                    <SelectTrigger id="mobile-invoice-sort">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INVOICE_SORT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="gap-2 border-blue-200 bg-white sm:mb-0.5"
                  aria-label={sortDirection === 'asc' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
                >
                  {sortDirection === 'asc' ? (
                    <ArrowDownAZ className="h-4 w-4" />
                  ) : (
                    <ArrowUpAZ className="h-4 w-4" />
                  )}
                  {sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'}
                </Button>
              </div>
              {paginatedInvoices.map((invoice) => (
                <InvoiceRow
                  key={`${invoice.invoice_number}-${invoice.branch_name}-${invoice.seller_name}`}
                  invoice={invoice}
                  formatCurrency={formatCurrency}
                  formatDate={formatDateMDY}
                  variant="card"
                  suspiciousDiscount={suspiciousInvoices.has(invoice.invoice_number)}
                />
              ))}
            </div>

            <TablePagination
              currentPage={safePage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={sortedInvoices.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}
      </div>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              رفع ملف فواتير Excel
            </DialogTitle>
          </DialogHeader>
          <ExcelUploadZone
            uploading={uploading}
            progress={progress}
            lastSummary={lastSummary}
            onUpload={(file) => void uploadFile(file)}
            onReset={resetProgress}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>مسح كل بيانات جرد الفواتير</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            سيتم حذف جميع الفواتير المستوردة وعلامات تدقيق الخصم نهائياً. لن يتم حذف العروض
            الترويجية. يمكنك إعادة رفع ملف Excel بعد المسح.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearing}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={clearing} onClick={() => void handleClearAll()}>
              {clearing ? 'جاري المسح...' : 'مسح الكل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
