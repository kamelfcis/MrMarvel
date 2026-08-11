import { supabase } from './supabase'

/** Stored in promotions.item_name — matches any sales line item. */
export const PROMO_ALL_ITEMS = 'كل الاصناف'

/** Stored in promotions.item_category — matches any sales line category. */
export const PROMO_ALL_CATEGORIES = 'كل مجموعة الصنف'

/** Tolerance when comparing applied vs allowed discount (% points). */
export const DISCOUNT_TOLERANCE_PCT = 0.5

/** Flag lines with discount above this % when no matching promo exists. */
export const HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT = 20

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

function isNearlyFree(row: SalesDetailRow): boolean {
  const pct = toDiscountPercent(row.discount_pct)
  if (pct >= 99.5 - DISCOUNT_TOLERANCE_PCT) return true
  const unit = row.unit_price ?? 0
  const qty = row.sold_qty ?? 0
  const net = row.net_sales_amount ?? 0
  if (qty > 0 && unit > 0 && net / (unit * qty) <= 0.01) return true
  return false
}

function evaluateBuyXGetY(
  promo: Promotion,
  groupRows: SalesDetailRow[],
): DiscountFlagInsert | null {
  const buy = promo.buy_qty ?? 0
  const get = promo.get_qty ?? 0
  if (buy <= 0 || get <= 0) return null

  const cycle = buy + get
  const totalQty = groupRows.reduce((s, r) => s + (r.sold_qty ?? 0), 0)
  if (totalQty < cycle) return null

  const expectedFree = Math.floor(totalQty / cycle) * get
  const freeQty = groupRows
    .filter(isNearlyFree)
    .reduce((s, r) => s + (r.sold_qty ?? 0), 0)

  // Also treat high effective discount across the group as partial free units
  const avgPct =
    groupRows.reduce((s, r) => s + toDiscountPercent(r.discount_pct) * (r.sold_qty ?? 0), 0) /
    Math.max(totalQty, 1)
  const impliedFreeFromAvg = Math.round((avgPct / 100) * totalQty)

  const observedFree = Math.max(freeQty, impliedFreeFromAvg >= expectedFree ? expectedFree : freeQty)

  if (observedFree + 0.01 >= expectedFree) return null

  // Flag the line with the highest discount in the group
  const target = [...groupRows].sort(
    (a, b) => toDiscountPercent(b.discount_pct) - toDiscountPercent(a.discount_pct),
  )[0]
  if (!target) return null

  const allowedPct = (get / cycle) * 100
  return {
    sales_detail_id: target.id,
    invoice_number: target.invoice_number,
    seller_name: target.seller_name,
    branch_name: target.branch_name,
    sale_date: target.sale_date,
    item_name: target.item_name,
    applied_discount_pct: toDiscountPercent(target.discount_pct),
    allowed_discount_pct: allowedPct,
    flag_reason: 'buy_x_get_y_mismatch',
    promotion_id: promo.id,
  }
}

export function evaluateSalesRows(
  rows: SalesDetailRow[],
  promotions: Promotion[],
): DiscountFlagInsert[] {
  const flags: DiscountFlagInsert[] = []
  const seenDetailIds = new Set<number>()

  // Per-line max_percent / high-discount checks
  for (const row of rows) {
    const applied = toDiscountPercent(row.discount_pct)
    const matches = matchingPromos(promotions, row)
    const maxPromo = bestMaxPercentPromo(matches)

    if (maxPromo && maxPromo.max_discount_pct != null) {
      const allowed = Number(maxPromo.max_discount_pct)
      if (applied > allowed + DISCOUNT_TOLERANCE_PCT) {
        flags.push({
          sales_detail_id: row.id,
          invoice_number: row.invoice_number,
          seller_name: row.seller_name,
          branch_name: row.branch_name,
          sale_date: row.sale_date,
          item_name: row.item_name,
          applied_discount_pct: applied,
          allowed_discount_pct: allowed,
          flag_reason: 'over_max_discount',
          promotion_id: maxPromo.id,
        })
        seenDetailIds.add(row.id)
        continue
      }
    }

    const hasAnyMatch = matches.length > 0
    if (!hasAnyMatch && applied > HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT + DISCOUNT_TOLERANCE_PCT) {
      flags.push({
        sales_detail_id: row.id,
        invoice_number: row.invoice_number,
        seller_name: row.seller_name,
        branch_name: row.branch_name,
        sale_date: row.sale_date,
        item_name: row.item_name,
        applied_discount_pct: applied,
        allowed_discount_pct: HIGH_DISCOUNT_NO_PROMO_THRESHOLD_PCT,
        flag_reason: 'no_matching_promo_but_high_discount',
        promotion_id: null,
      })
      seenDetailIds.add(row.id)
    }
  }

  // buy_x_get_y: group by invoice + item_name
  const byInvoiceItem = new Map<string, SalesDetailRow[]>()
  for (const row of rows) {
    const key = `${row.invoice_number}||${(row.item_name ?? '').trim()}`
    const list = byInvoiceItem.get(key) ?? []
    list.push(row)
    byInvoiceItem.set(key, list)
  }

  for (const group of byInvoiceItem.values()) {
    const sample = group[0]
    if (!sample) continue
    const matches = matchingPromos(promotions, sample).filter((p) => p.promo_type === 'buy_x_get_y')
    for (const promo of matches) {
      const flag = evaluateBuyXGetY(promo, group)
      if (flag && flag.sales_detail_id != null && !seenDetailIds.has(flag.sales_detail_id)) {
        flags.push(flag)
        seenDetailIds.add(flag.sales_detail_id)
      }
    }
  }

  return flags
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

async function clearUnreviewedFlags(range: ScanRange, salesDetailIds: number[]): Promise<number> {
  // Delete unreviewed flags for scanned sales_detail rows (or date range)
  if (salesDetailIds.length > 0) {
    let cleared = 0
    const chunkSize = 200
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
  const [promotions, rows] = await Promise.all([
    fetchActivePromotions(),
    fetchSalesDetails(range),
  ])

  const salesDetailIds = rows.map((r) => r.id)
  const cleared = await clearUnreviewedFlags(range, salesDetailIds)
  const flags = evaluateSalesRows(rows, promotions)
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
