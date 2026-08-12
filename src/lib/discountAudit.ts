import { supabase } from './supabase'

/** Stored in promotions.item_name — matches any sales line item. */
export const PROMO_ALL_ITEMS = 'كل الاصناف'

/** Stored in promotions.item_category — matches any sales line category. */
export const PROMO_ALL_CATEGORIES = 'كل مجموعة الصنف'

/** Tolerance when comparing applied vs allowed discount (% points). */
export const DISCOUNT_TOLERANCE_PCT = 0.5

/** Fallback when DB setting is missing or invalid. */
export const DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT = 20

export const HIGH_DISCOUNT_NO_PROMO_SETTING_KEY = 'high_discount_no_promo_threshold_pct'

/** @deprecated Use fetchHighDiscountThreshold() or DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT */
export const HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT = DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT

export type PromoType = 'max_percent' | 'buy_x_get_y'
export type FlagReason =
  | 'over_max_discount'
  | 'buy_x_get_y_mismatch'
  | 'no_matching_promo_but_high_discount'

export type Promotion = {
  id: string
  name: string
  promo_type: PromoType
  branch_name: string | null
  item_name: string | null
  item_category: string | null
  max_discount_pct: number | null
  buy_qty: number | null
  get_qty: number | null
  valid_from: string
  valid_to: string
  is_active: boolean
  created_by: string | null
  created_at: string
}

export type DiscountFlag = {
  id: string
  sales_detail_id: number | null
  invoice_number: string
  seller_name: string | null
  branch_name: string | null
  sale_date: string | null
  item_name: string | null
  applied_discount_pct: number | null
  allowed_discount_pct: number | null
  flag_reason: FlagReason
  promotion_id: string | null
  reviewed: boolean
  reviewed_at: string | null
  created_at: string
}

export type DiscountFlagInsert = Omit<DiscountFlag, 'id' | 'created_at' | 'reviewed' | 'reviewed_at'> & {
  reviewed?: boolean
  reviewed_at?: string | null
}

type SalesDetailRow = {
  id: number
  invoice_number: string
  seller_name: string | null
  branch_name: string | null
  sale_date: string | null
  item_name: string | null
  item_category: string | null
  sold_qty: number | null
  unit_price: number | null
  net_sales_amount: number | null
  discount_pct: number | null
  discount_amount: number | null
}

export type ScanRange = {
  dateFrom?: string | null
  dateTo?: string | null
  invoiceNumbers?: string[] | null
}

export type ScanResult = {
  scanned: number
  flagged: number
  cleared: number
}

/** Normalize stored discount to percentage points (0–100). */
export function toDiscountPercent(discountPct: number | null | undefined): number {
  if (discountPct == null || !Number.isFinite(discountPct)) return 0
  // Excel / POS often stores 0.15 for 15%; sometimes already 15.
  if (Math.abs(discountPct) <= 1) return discountPct * 100
  return discountPct
}

function datesOverlap(
  saleDate: string | null,
  validFrom: string,
  validTo: string,
): boolean {
  if (!saleDate) return false
  return saleDate >= validFrom && saleDate <= validTo
}

function branchMatches(promoBranch: string | null, saleBranch: string | null): boolean {
  if (!promoBranch) return true
  if (!saleBranch) return false
  return promoBranch.trim() === saleBranch.trim()
}

export function isPromoAllItems(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return value.trim() === PROMO_ALL_ITEMS
}

export function isPromoAllCategories(value: string | null | undefined): boolean {
  if (!value?.trim()) return true
  return value.trim() === PROMO_ALL_CATEGORIES
}

function itemMatches(promo: Promotion, row: SalesDetailRow): boolean {
  const nameOk =
    isPromoAllItems(promo.item_name) ||
    (!!row.item_name && promo.item_name!.trim() === row.item_name.trim())
  const catOk =
    isPromoAllCategories(promo.item_category) ||
    (!!row.item_category && promo.item_category!.trim() === row.item_category.trim())
  return nameOk && catOk
}

function matchingPromos(promos: Promotion[], row: SalesDetailRow): Promotion[] {
  return promos.filter(
    (p) =>
      p.is_active &&
      datesOverlap(row.sale_date, p.valid_from, p.valid_to) &&
      branchMatches(p.branch_name, row.branch_name) &&
      itemMatches(p, row),
  )
}

function bestMaxPercentPromo(promos: Promotion[]): Promotion | null {
  const maxOnes = promos.filter((p) => p.promo_type === 'max_percent' && p.max_discount_pct != null)
  if (maxOnes.length === 0) return null
  return maxOnes.reduce((best, cur) =>
    (cur.max_discount_pct ?? 0) > (best.max_discount_pct ?? 0) ? cur : best,
  )
}

/** Invoice total discount % from line amounts: sum(discount) / sum(unit_price × qty) × 100. */
export function computeInvoiceDiscountPct(lines: SalesDetailRow[]): number {
  let gross = 0
  let totalDiscount = 0
  for (const row of lines) {
    const qty = row.sold_qty ?? 0
    const unit = row.unit_price ?? 0
    gross += unit * qty
    totalDiscount += row.discount_amount ?? 0
  }
  if (gross <= 0) return 0
  return (totalDiscount / gross) * 100
}

function evaluateInvoiceDiscount(
  rows: SalesDetailRow[],
  promotions: Promotion[],
  highDiscountNoPromoThresholdPct: number,
): DiscountFlagInsert[] {
  const byInvoice = new Map<string, SalesDetailRow[]>()
  for (const row of rows) {
    const key = row.invoice_number
    if (!key) continue
    const list = byInvoice.get(key) ?? []
    list.push(row)
    byInvoice.set(key, list)
  }

  const flags: DiscountFlagInsert[] = []

  for (const [, lines] of byInvoice) {
    const head = lines[0]
    if (!head) continue

    const appliedInvoicePct = computeInvoiceDiscountPct(lines)

    let bestPromo: Promotion | null = null
    for (const row of lines) {
      const matches = matchingPromos(promotions, row)
      const maxPromo = bestMaxPercentPromo(matches)
      if (!maxPromo) continue
      if (
        !bestPromo ||
        (maxPromo.max_discount_pct ?? 0) > (bestPromo.max_discount_pct ?? 0)
      ) {
        bestPromo = maxPromo
      }
    }

    const hasPromoMatch = bestPromo != null && bestPromo.max_discount_pct != null
    const allowed = hasPromoMatch
      ? Number(bestPromo!.max_discount_pct)
      : highDiscountNoPromoThresholdPct

    if (appliedInvoicePct <= allowed + DISCOUNT_TOLERANCE_PCT) continue

    flags.push({
      sales_detail_id: null,
      invoice_number: head.invoice_number,
      seller_name: head.seller_name,
      branch_name: head.branch_name,
      sale_date: head.sale_date,
      item_name: null,
      applied_discount_pct: appliedInvoicePct,
      allowed_discount_pct: allowed,
      flag_reason: hasPromoMatch ? 'over_max_discount' : 'no_matching_promo_but_high_discount',
      promotion_id: hasPromoMatch ? bestPromo!.id : null,
    })
  }

  return flags
}

function parseThresholdValue(value: unknown): number | null {
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num) || num < 0 || num > 100) return null
  return num
}

export async function fetchHighDiscountThreshold(): Promise<number> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', HIGH_DISCOUNT_NO_PROMO_SETTING_KEY)
    .maybeSingle()

  if (error) throw error
  const parsed = parseThresholdValue(data?.value)
  return parsed ?? DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT
}

export async function saveHighDiscountThreshold(pct: number): Promise<void> {
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    throw new Error('يجب أن تكون النسبة بين 0 و 100')
  }

  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('app_settings').upsert(
    {
      key: HIGH_DISCOUNT_NO_PROMO_SETTING_KEY,
      value: pct,
      updated_at: new Date().toISOString(),
      updated_by: userData.user?.id ?? null,
    },
    { onConflict: 'key' },
  )

  if (error) throw error
}

export function evaluateSalesRows(
  rows: SalesDetailRow[],
  promotions: Promotion[],
  highDiscountNoPromoThresholdPct: number = DEFAULT_HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT,
): DiscountFlagInsert[] {
  return evaluateInvoiceDiscount(rows, promotions, highDiscountNoPromoThresholdPct)
}

async function fetchActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)

  if (error) throw error
  return (data as Promotion[]) ?? []
}

async function fetchSalesDetails(range: ScanRange): Promise<SalesDetailRow[]> {
  const selectCols =
    'id, invoice_number, seller_name, branch_name, sale_date, item_name, item_category, sold_qty, unit_price, net_sales_amount, discount_pct, discount_amount'

  if (range.invoiceNumbers && range.invoiceNumbers.length > 0) {
    const rows: SalesDetailRow[] = []
    const chunkSize = 100
    for (let i = 0; i < range.invoiceNumbers.length; i += chunkSize) {
      const chunk = range.invoiceNumbers.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('sales_details')
        .select(selectCols)
        .in('invoice_number', chunk)
      if (error) throw error
      rows.push(...((data as SalesDetailRow[]) ?? []))
    }
    return rows
  }

  let query = supabase.from('sales_details').select(selectCols)
  if (range.dateFrom) query = query.gte('sale_date', range.dateFrom)
  if (range.dateTo) query = query.lte('sale_date', range.dateTo)

  const { data, error } = await query
  if (error) throw error
  return (data as SalesDetailRow[]) ?? []
}

async function clearUnreviewedFlags(
  range: ScanRange,
  salesDetailIds: number[],
  invoiceNumbers: string[],
): Promise<number> {
  let cleared = 0
  const chunkSize = 200

  // Invoice-level flags use sales_detail_id null — clear by invoice_number
  const uniqueInvoices = [...new Set(invoiceNumbers.filter(Boolean))]
  if (uniqueInvoices.length > 0) {
    for (let i = 0; i < uniqueInvoices.length; i += chunkSize) {
      const chunk = uniqueInvoices.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('discount_flags')
        .delete()
        .eq('reviewed', false)
        .in('invoice_number', chunk)
        .select('id')
      if (error) throw error
      cleared += data?.length ?? 0
    }
    return cleared
  }

  // Legacy: per-line flags tied to sales_detail_id
  if (salesDetailIds.length > 0) {
    for (let i = 0; i < salesDetailIds.length; i += chunkSize) {
      const chunk = salesDetailIds.slice(i, i + chunkSize)
      const { data, error } = await supabase
        .from('discount_flags')
        .delete()
        .eq('reviewed', false)
        .in('sales_detail_id', chunk)
        .select('id')
      if (error) throw error
      cleared += data?.length ?? 0
    }
    return cleared
  }

  if (range.dateFrom || range.dateTo) {
    let query = supabase.from('discount_flags').delete().eq('reviewed', false)
    if (range.dateFrom) query = query.gte('sale_date', range.dateFrom)
    if (range.dateTo) query = query.lte('sale_date', range.dateTo)
    const { data, error } = await query.select('id')
    if (error) throw error
    return data?.length ?? 0
  }

  return 0
}

async function insertFlags(flags: DiscountFlagInsert[]): Promise<number> {
  if (flags.length === 0) return 0
  let inserted = 0
  const chunkSize = 200
  for (let i = 0; i < flags.length; i += chunkSize) {
    const chunk = flags.slice(i, i + chunkSize)
    const { error } = await supabase.from('discount_flags').insert(chunk)
    if (error) throw error
    inserted += chunk.length
  }
  return inserted
}

/**
 * Scan sales_details in the given range against active promotions and
 * rewrite unreviewed discount_flags.
 */
export async function scanDiscountFlags(range: ScanRange = {}): Promise<ScanResult> {
  const [promotions, rows, threshold] = await Promise.all([
    fetchActivePromotions(),
    fetchSalesDetails(range),
    fetchHighDiscountThreshold(),
  ])

  const salesDetailIds = rows.map((r) => r.id)
  const invoiceNumbers = [...new Set(rows.map((r) => r.invoice_number).filter(Boolean))]
  const cleared = await clearUnreviewedFlags(range, salesDetailIds, invoiceNumbers)
  const flags = evaluateSalesRows(rows, promotions, threshold)
  const flagged = await insertFlags(flags)

  return { scanned: rows.length, flagged, cleared }
}

/**
 * After Excel import: scan only the invoice numbers that were just inserted.
 */
export async function scanDiscountFlagsForInvoices(invoiceNumbers: string[]): Promise<ScanResult> {
  const unique = [...new Set(invoiceNumbers.filter(Boolean))]
  if (unique.length === 0) {
    return { scanned: 0, flagged: 0, cleared: 0 }
  }
  return scanDiscountFlags({ invoiceNumbers: unique })
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  over_max_discount: 'خصم أعلى من العرض',
  buy_x_get_y_mismatch: 'عدم تطابق اشتري واحصل',
  no_matching_promo_but_high_discount: 'خصم عالي بدون عرض',
}

export type InvoiceDiscountAudit = {
  invoice_number: string
  seller_name: string | null
  branch_name: string | null
  sale_date: string | null
  flags: DiscountFlag[]
  flagCount: number
  pendingCount: number
  reviewedAll: boolean
  appliedDiscountPct: number | null
  allowedDiscountPct: number | null
  total_discount: number | null
}

/** Group discount_flags by invoice_number (metadata from the newest flag). */
export function groupFlagsByInvoice(flags: DiscountFlag[]): InvoiceDiscountAudit[] {
  const byInvoice = new Map<string, DiscountFlag[]>()
  for (const flag of flags) {
    const key = flag.invoice_number
    if (!key) continue
    const list = byInvoice.get(key) ?? []
    list.push(flag)
    byInvoice.set(key, list)
  }

  const rows: InvoiceDiscountAudit[] = []
  for (const [invoice_number, invoiceFlags] of byInvoice) {
    const sorted = [...invoiceFlags].sort((a, b) => {
      const dateCmp = (b.sale_date ?? '').localeCompare(a.sale_date ?? '')
      if (dateCmp !== 0) return dateCmp
      return (b.created_at ?? '').localeCompare(a.created_at ?? '')
    })
    const head = sorted[0]
    const pendingCount = sorted.filter((f) => !f.reviewed).length
    rows.push({
      invoice_number,
      seller_name: head?.seller_name ?? null,
      branch_name: head?.branch_name ?? null,
      sale_date: head?.sale_date ?? null,
      flags: sorted,
      flagCount: sorted.length > 0 ? 1 : 0,
      pendingCount,
      reviewedAll: pendingCount === 0,
      appliedDiscountPct: head?.applied_discount_pct ?? null,
      allowedDiscountPct: head?.allowed_discount_pct ?? null,
      total_discount: null,
    })
  }

  rows.sort((a, b) => {
    const dateCmp = (b.sale_date ?? '').localeCompare(a.sale_date ?? '')
    if (dateCmp !== 0) return dateCmp
    return b.invoice_number.localeCompare(a.invoice_number)
  })
  return rows
}

/** Fetch total_discount from invoice_summary for the given invoice numbers. */
export async function fetchInvoiceTotalDiscounts(
  invoiceNumbers: string[],
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  const unique = [...new Set(invoiceNumbers.filter(Boolean))]
  if (unique.length === 0) return result

  const chunkSize = 100
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('invoice_summary')
      .select('invoice_number, total_discount')
      .in('invoice_number', chunk)
    if (error) throw error
    for (const row of data ?? []) {
      result.set(row.invoice_number, row.total_discount ?? null)
    }
  }
  return result
}

/** Merge invoice_summary.total_discount into grouped audit rows. */
export async function attachInvoiceTotalDiscounts(
  rows: InvoiceDiscountAudit[],
): Promise<InvoiceDiscountAudit[]> {
  if (rows.length === 0) return rows
  const discounts = await fetchInvoiceTotalDiscounts(rows.map((r) => r.invoice_number))
  return rows.map((row) => ({
    ...row,
    total_discount: discounts.get(row.invoice_number) ?? null,
  }))
}
