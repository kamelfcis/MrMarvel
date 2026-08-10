import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  AlertCircle,
  BarChart3,
  CalendarRange,
  RefreshCw,
  RotateCcw,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react'
import { StatsChartCard } from '../components/invoices/StatsChartCard'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { cn } from '../components/ui/utils'
import {
  buildDailySales,
  buildInvoiceStatsKpis,
  defaultDateRange,
  toYmd,
  topBranchesByNetSales,
  topCategoriesByQty,
  topCustomersByInvoices,
  topCustomersBySpend,
  topProductsByNetSales,
  topProductsByQty,
  topProductsPerBranch,
  topSellersByNetSales,
  type NamedValue,
  type SalesDetailStatsRow,
} from '../lib/invoiceStats'
import { supabase } from '../lib/supabase'
import { formatDateMDY } from '../lib/utils'

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
)

const SELECT_FIELDS =
  'branch_name, item_name, item_category, seller_name, customer_mobile, sale_date, sold_qty, net_sales_amount, returns_amount, invoice_number'

const PAGE_SIZE = 1000

const CHART_BLUE = 'rgba(37, 99, 235, 0.75)'
const CHART_BLUE_BORDER = 'rgba(37, 99, 235, 1)'
const CHART_GREEN = 'rgba(22, 163, 74, 0.75)'
const CHART_GREEN_BORDER = 'rgba(22, 163, 74, 1)'
const CHART_AMBER = 'rgba(217, 119, 6, 0.75)'
const CHART_AMBER_BORDER = 'rgba(217, 119, 6, 1)'
const CHART_TEAL = 'rgba(13, 148, 136, 0.75)'
const CHART_TEAL_BORDER = 'rgba(13, 148, 136, 1)'
const CHART_ROSE = 'rgba(225, 29, 72, 0.75)'
const CHART_ROSE_BORDER = 'rgba(225, 29, 72, 1)'
const CHART_INDIGO = 'rgba(79, 70, 229, 0.75)'
const CHART_INDIGO_BORDER = 'rgba(79, 70, 229, 1)'

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
}

function formatNumber(value: number) {
  return value.toLocaleString('ar-EG')
}

function barData(
  items: NamedValue[],
  label: string,
  backgroundColor: string,
  borderColor: string,
) {
  return {
    labels: items.map((i) => i.label),
    datasets: [
      {
        label,
        data: items.map((i) => i.value),
        backgroundColor,
        borderColor,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  }
}

const horizontalBarOptions: ChartOptions<'bar'> = {
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: {
      beginAtZero: true,
      ticks: { font: { family: 'inherit' } },
      grid: { color: 'rgba(148, 163, 184, 0.2)' },
    },
    y: {
      ticks: { font: { family: 'inherit' } },
      grid: { display: false },
    },
  },
}

function ChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="overflow-hidden shadow-sm">
          <CardContent className="space-y-3 p-5">
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200 motion-reduce:animate-none" />
            <div className="h-64 animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function KpiCards({
  loading,
  totalInvoices,
  totalNetSales,
  totalReturns,
  totalCustomers,
}: {
  loading: boolean
  totalInvoices: number
  totalNetSales: number
  totalReturns: number
  totalCustomers: number
}) {
  const cards = [
    {
      label: 'إجمالي الفواتير',
      value: formatNumber(totalInvoices),
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
      label: 'عدد العملاء',
      value: formatNumber(totalCustomers),
      icon: Users,
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
          className={cn(
            'overflow-hidden bg-gradient-to-br shadow-sm',
            toneClasses[tone].split(' ').slice(0, 2).join(' '),
          )}
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

async function fetchSalesDateBounds(): Promise<{ dateFrom: string; dateTo: string } | null> {
  const [minRes, maxRes] = await Promise.all([
    supabase
      .from('sales_details')
      .select('sale_date')
      .not('sale_date', 'is', null)
      .order('sale_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sales_details')
      .select('sale_date')
      .not('sale_date', 'is', null)
      .order('sale_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (minRes.error) throw minRes.error
  if (maxRes.error) throw maxRes.error

  const dateFrom = toYmd(minRes.data?.sale_date)
  const dateTo = toYmd(maxRes.data?.sale_date)
  if (!dateFrom || !dateTo) return null
  return { dateFrom, dateTo }
}

async function fetchSalesDetailsInRange(
  dateFrom: string,
  dateTo: string,
): Promise<SalesDetailStatsRow[]> {
  const fromYmd = toYmd(dateFrom)
  const toYmdValue = toYmd(dateTo)
  if (!fromYmd || !toYmdValue) {
    throw new Error('Invalid date range')
  }

  const all: SalesDetailStatsRow[] = []
  let from = 0

  while (true) {
    const to = from + PAGE_SIZE - 1
    const { data, error, count } = await supabase
      .from('sales_details')
      .select(SELECT_FIELDS, { count: from === 0 ? 'exact' : undefined })
      .gte('sale_date', fromYmd)
      .lte('sale_date', toYmdValue)
      .order('sale_date', { ascending: true })
      .order('invoice_number', { ascending: true })
      .range(from, to)

    if (error) throw error

    const batch = (data as SalesDetailStatsRow[] | null) ?? []
    all.push(...batch)

    // First page: if count says there are rows but batch is empty, something is wrong
    if (from === 0 && (count ?? 0) > 0 && batch.length === 0) {
      throw new Error('Pagination returned 0 rows despite non-zero count')
    }

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export default function AdminInvoiceStatsPage() {
  const fallbackRange = useMemo(() => defaultDateRange(), [])
  const [dateFrom, setDateFrom] = useState(fallbackRange.dateFrom)
  const [dateTo, setDateTo] = useState(fallbackRange.dateTo)
  const [appliedFrom, setAppliedFrom] = useState(fallbackRange.dateFrom)
  const [appliedTo, setAppliedTo] = useState(fallbackRange.dateTo)
  const [rangeReady, setRangeReady] = useState(false)
  const [rows, setRows] = useState<SalesDetailStatsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const resolveDefaultRange = async () => {
      setLoading(true)
      setError(null)
      try {
        const bounds = await fetchSalesDateBounds()
        if (cancelled) return
        const range = bounds ?? fallbackRange
        setDateFrom(range.dateFrom)
        setDateTo(range.dateTo)
        setAppliedFrom(range.dateFrom)
        setAppliedTo(range.dateTo)
        setRangeReady(true)
      } catch (err) {
        console.error(err)
        if (cancelled) return
        // Still allow the page to load with the 30-day fallback
        setAppliedFrom(fallbackRange.dateFrom)
        setAppliedTo(fallbackRange.dateTo)
        setRangeReady(true)
      }
    }

    void resolveDefaultRange()
    return () => {
      cancelled = true
    }
  }, [fallbackRange])

  const fetchStats = useCallback(async () => {
    if (!rangeReady) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSalesDetailsInRange(appliedFrom, appliedTo)
      setRows(data)
    } catch (err) {
      console.error(err)
      setError('فشل تحميل إحصائيات الفواتير')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [appliedFrom, appliedTo, rangeReady])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const applyFilters = () => {
    const from = toYmd(dateFrom)
    const to = toYmd(dateTo)
    if (!from || !to) return
    setDateFrom(from)
    setDateTo(to)
    setAppliedFrom(from)
    setAppliedTo(to)
  }

  const kpis = useMemo(() => buildInvoiceStatsKpis(rows), [rows])
  const dailySales = useMemo(() => buildDailySales(rows), [rows])
  const perBranch = useMemo(() => topProductsPerBranch(rows), [rows])
  const productsQty = useMemo(() => topProductsByQty(rows), [rows])
  const productsSales = useMemo(() => topProductsByNetSales(rows), [rows])
  const customersByInvoices = useMemo(() => topCustomersByInvoices(rows), [rows])
  const customersBySpend = useMemo(() => topCustomersBySpend(rows), [rows])
  const branches = useMemo(() => topBranchesByNetSales(rows), [rows])
  const sellers = useMemo(() => topSellersByNetSales(rows), [rows])
  const categories = useMemo(() => topCategoriesByQty(rows), [rows])

  const lineData = useMemo(
    () => ({
      labels: dailySales.map((d) => formatDateMDY(d.label)),
      datasets: [
        {
          label: 'صافي المبيعات',
          data: dailySales.map((d) => d.value),
          borderColor: CHART_BLUE_BORDER,
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    }),
    [dailySales],
  )

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => formatCurrency(Number(ctx.raw ?? 0)),
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { family: 'inherit' }, maxRotation: 0 },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { family: 'inherit' },
          callback: (value) => Number(value).toLocaleString('ar-EG'),
        },
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
      },
    },
  }

  const perBranchOptions: ChartOptions<'bar'> = {
    ...horizontalBarOptions,
    plugins: {
      ...horizontalBarOptions.plugins,
      tooltip: {
        callbacks: {
          afterLabel: (ctx) => {
            const meta = perBranch[ctx.dataIndex]?.meta
            return meta ? `المنتج: ${meta}` : ''
          },
          label: (ctx) => `الكمية: ${formatNumber(Number(ctx.raw ?? 0))}`,
        },
      },
    },
  }

  const currencyBarOptions: ChartOptions<'bar'> = {
    ...horizontalBarOptions,
    plugins: {
      ...horizontalBarOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => formatCurrency(Number(ctx.raw ?? 0)),
        },
      },
    },
  }

  const qtyBarOptions: ChartOptions<'bar'> = {
    ...horizontalBarOptions,
    plugins: {
      ...horizontalBarOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => `الكمية: ${formatNumber(Number(ctx.raw ?? 0))}`,
        },
      },
    },
  }

  const countBarOptions: ChartOptions<'bar'> = {
    ...horizontalBarOptions,
    plugins: {
      ...horizontalBarOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => `الفواتير: ${formatNumber(Number(ctx.raw ?? 0))}`,
        },
      },
    },
  }

  const isEmpty = !loading && !error && rows.length === 0

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">احصائيات الفواتير</h1>
          <p className="mt-1 text-sm text-gray-500">
            تحليل المبيعات والفروع والعملاء حسب الفترة المحددة
          </p>
        </div>
        <Button variant="outline" onClick={() => void fetchStats()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin motion-reduce:animate-none')} />
          تحديث
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarRange className="h-4 w-4 text-blue-600" />
            تصفية بالتاريخ
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="stats-date-from">من تاريخ</Label>
              <Input
                id="stats-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stats-date-to">إلى تاريخ</Label>
              <Input
                id="stats-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={applyFilters} disabled={loading || !dateFrom || !dateTo}>
                <BarChart3 className="h-4 w-4" />
                تطبيق
              </Button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            الفترة الحالية: {formatDateMDY(appliedFrom)} — {formatDateMDY(appliedTo)}
          </p>
        </div>
      </div>

      <KpiCards loading={loading} {...kpis} />

      {loading ? (
        <ChartsSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-500" />
          <p className="text-gray-700">{error}</p>
          <Button variant="outline" onClick={() => void fetchStats()}>
            إعادة المحاولة
          </Button>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white px-6 py-20 text-center shadow-sm">
          <div className="rounded-full bg-blue-50 p-4 text-blue-600">
            <BarChart3 className="h-8 w-8" />
          </div>
          <p className="text-base font-medium text-gray-700">لا توجد بيانات في الفترة المحددة</p>
          <p className="text-sm text-gray-500">جرّب توسيع نطاق التاريخ أو رفع فواتير جديدة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StatsChartCard title="المبيعات اليومية" className="lg:col-span-2" empty={dailySales.length === 0}>
            <Line data={lineData} options={lineOptions} />
          </StatsChartCard>

          <StatsChartCard title="أكثر منتج مباع لكل فرع" empty={perBranch.length === 0}>
            <Bar data={barData(perBranch, 'الكمية', CHART_TEAL, CHART_TEAL_BORDER)} options={perBranchOptions} />
          </StatsChartCard>

          <StatsChartCard title="أكثر المنتجات مبيعاً (كمية)" empty={productsQty.length === 0}>
            <Bar data={barData(productsQty, 'الكمية', CHART_BLUE, CHART_BLUE_BORDER)} options={qtyBarOptions} />
          </StatsChartCard>

          <StatsChartCard title="أكثر المنتجات مبيعاً (صافي المبيعات)" empty={productsSales.length === 0}>
            <Bar
              data={barData(productsSales, 'صافي المبيعات', CHART_GREEN, CHART_GREEN_BORDER)}
              options={currencyBarOptions}
            />
          </StatsChartCard>

          <StatsChartCard title="أكثر العملاء طلباً" empty={customersByInvoices.length === 0}>
            <Bar
              data={barData(customersByInvoices, 'عدد الفواتير', CHART_AMBER, CHART_AMBER_BORDER)}
              options={countBarOptions}
            />
          </StatsChartCard>

          <StatsChartCard title="أعلى العملاء إنفاقاً" empty={customersBySpend.length === 0}>
            <Bar
              data={barData(customersBySpend, 'صافي المبيعات', CHART_ROSE, CHART_ROSE_BORDER)}
              options={currencyBarOptions}
            />
          </StatsChartCard>

          <StatsChartCard title="الفروع" empty={branches.length === 0}>
            <Bar
              data={barData(branches, 'صافي المبيعات', CHART_INDIGO, CHART_INDIGO_BORDER)}
              options={currencyBarOptions}
            />
          </StatsChartCard>

          <StatsChartCard title="البائعين" empty={sellers.length === 0}>
            <Bar
              data={barData(sellers, 'صافي المبيعات', CHART_TEAL, CHART_TEAL_BORDER)}
              options={currencyBarOptions}
            />
          </StatsChartCard>

          <StatsChartCard title="مجموعات الأصناف" empty={categories.length === 0} className="lg:col-span-2">
            <Bar
              data={barData(categories, 'الكمية', CHART_BLUE, CHART_BLUE_BORDER)}
              options={qtyBarOptions}
            />
          </StatsChartCard>
        </div>
      )}
    </div>
  )
}
