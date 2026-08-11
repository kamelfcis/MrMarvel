export type SalesDetailStatsRow = {
  branch_name: string | null
  item_name: string | null
  item_category: string | null
  seller_name: string | null
  customer_mobile: string | null
  sale_date: string | null
  sold_qty: number | null
  net_sales_amount: number | null
  returns_amount: number | null
  invoice_number: string | null
}

export type NamedValue = {
  label: string
  value: number
  meta?: string
}

export type InvoiceStatsKpis = {
  totalInvoices: number
  totalNetSales: number
  totalReturns: number
  totalCustomers: number
}

const UNKNOWN = 'غير محدد'

function n(value: number | null | undefined) {
  return value ?? 0
}

function labelOf(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : UNKNOWN
}

function dateKey(value: string | null | undefined) {
  if (!value) return null
  return value.slice(0, 10)
}

function topEntries(
  map: Map<string, number>,
  limit = 10,
): NamedValue[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }))
}

/** Distinct invoices, net sales, returns, and unique customers in range. */
export function buildInvoiceStatsKpis(rows: SalesDetailStatsRow[]): InvoiceStatsKpis {
  const invoices = new Set<string>()
  const customers = new Set<string>()
  let totalNetSales = 0
  let totalReturns = 0

  for (const row of rows) {
    totalNetSales += n(row.net_sales_amount)
    totalReturns += n(row.returns_amount)
    if (row.invoice_number) invoices.add(row.invoice_number)
    const mobile = row.customer_mobile?.trim()
    if (mobile) customers.add(mobile)
  }

  return {
    totalInvoices: invoices.size,
    totalNetSales,
    totalReturns,
    totalCustomers: customers.size,
  }
}

/** Daily net sales sorted ascending by date. */
export function buildDailySales(rows: SalesDetailStatsRow[]): NamedValue[] {
  const byDate = new Map<string, number>()

  for (const row of rows) {
    const key = dateKey(row.sale_date)
    if (!key) continue
    byDate.set(key, (byDate.get(key) ?? 0) + n(row.net_sales_amount))
  }

  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value }))
}

/** For each branch: top product by sold qty (label = branch, meta = product). */
export function topProductsPerBranch(rows: SalesDetailStatsRow[]): NamedValue[] {
  const byBranch = new Map<string, Map<string, number>>()

  for (const row of rows) {
    const branch = labelOf(row.branch_name)
    const item = labelOf(row.item_name)
    let items = byBranch.get(branch)
    if (!items) {
      items = new Map()
      byBranch.set(branch, items)
    }
    items.set(item, (items.get(item) ?? 0) + n(row.sold_qty))
  }

  const result: NamedValue[] = []
  for (const [branch, items] of byBranch) {
    let topItem = UNKNOWN
    let topQty = -Infinity
    for (const [item, qty] of items) {
      if (qty > topQty || (qty === topQty && item.localeCompare(topItem, 'ar') < 0)) {
        topQty = qty
        topItem = item
      }
    }
    if (Number.isFinite(topQty) && topQty > -Infinity) {
      result.push({ label: branch, value: topQty, meta: topItem })
    }
  }

  return result.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ar'))
}

export function topProductsByQty(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row.item_name)
    map.set(key, (map.get(key) ?? 0) + n(row.sold_qty))
  }
  return topEntries(map, limit)
}

export function topProductsByNetSales(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row.item_name)
    map.set(key, (map.get(key) ?? 0) + n(row.net_sales_amount))
  }
  return topEntries(map, limit)
}

/** Top customers by distinct invoice count. */
export function topCustomersByInvoices(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const invoicesByCustomer = new Map<string, Set<string>>()

  for (const row of rows) {
    const mobile = row.customer_mobile?.trim()
    if (!mobile || !row.invoice_number) continue
    let set = invoicesByCustomer.get(mobile)
    if (!set) {
      set = new Set()
      invoicesByCustomer.set(mobile, set)
    }
    set.add(row.invoice_number)
  }

  return [...invoicesByCustomer.entries()]
    .map(([label, invoices]) => ({ label, value: invoices.size }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ar'))
    .slice(0, limit)
}

export function topCustomersBySpend(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const mobile = row.customer_mobile?.trim()
    if (!mobile) continue
    map.set(mobile, (map.get(mobile) ?? 0) + n(row.net_sales_amount))
  }
  return topEntries(map, limit)
}

export function topBranchesByNetSales(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row.branch_name)
    map.set(key, (map.get(key) ?? 0) + n(row.net_sales_amount))
  }
  return topEntries(map, limit)
}

export function topSellersByNetSales(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row.seller_name)
    map.set(key, (map.get(key) ?? 0) + n(row.net_sales_amount))
  }
  return topEntries(map, limit)
}

/** Top sellers by count of distinct items sold (excludes empty seller/item). */
export function topSellersByDistinctItems(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const itemsBySeller = new Map<string, Set<string>>()

  for (const row of rows) {
    const seller = row.seller_name?.trim()
    const item = row.item_name?.trim()
    if (!seller || !item) continue
    let set = itemsBySeller.get(seller)
    if (!set) {
      set = new Set()
      itemsBySeller.set(seller, set)
    }
    set.add(item)
  }

  return [...itemsBySeller.entries()]
    .map(([label, items]) => ({ label, value: items.size }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ar'))
    .slice(0, limit)
}

export function topCategoriesByQty(rows: SalesDetailStatsRow[], limit = 10): NamedValue[] {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = labelOf(row.item_category)
    map.set(key, (map.get(key) ?? 0) + n(row.sold_qty))
  }
  return topEntries(map, limit)
}

function toIsoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Normalize any date-like string to YYYY-MM-DD, or null if invalid. */
export function toYmd(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const sliced = trimmed.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return sliced
  return null
}

/** Fallback date range: last 30 days ending today (YYYY-MM-DD). */
export function defaultDateRange(today = new Date()): { dateFrom: string; dateTo: string } {
  const end = new Date(today)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) }
}

/** Plan API aliases */
export type SalesDetailRow = SalesDetailStatsRow
export type BarChartItem = NamedValue
export const computeKpis = buildInvoiceStatsKpis
export const topProducts = topProductsByQty
export const topCustomersByOrders = topCustomersByInvoices
export const topBranches = topBranchesByNetSales
export const topSellers = topSellersByNetSales
export const topSellersByItems = topSellersByDistinctItems
export const topCategories = topCategoriesByQty
