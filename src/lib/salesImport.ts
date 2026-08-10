import * as XLSXImport from 'xlsx'
import type { CellObject, ParsingOptions, WorkBook, WorkSheet } from 'xlsx'

// Vite: named exports on the namespace (incl. SSF). Node CJS interop: API lives on `.default`.
const XLSX = (() => {
  const ns = XLSXImport as unknown as {
    SSF?: { parse_date_code: (n: number) => unknown }
    default?: typeof XLSXImport
  }
  return ns.SSF ? (XLSXImport as typeof XLSXImport) : (ns.default ?? XLSXImport)
})()

export const SALES_COLUMN_MAP = {
  'اسم الفرع': 'branch_name',
  'مجموعة الصنف': 'item_category',
  مبيعات: 'sales_amount',
  'كمية صافى المبيعات': 'net_sales_qty',
  'سعر البيع': 'unit_price',
  'صافى المبيعات': 'net_sales_amount',
  'اسم الموسم': 'season_name',
  التاريخ: 'sale_date',
  'اسم البائع': 'seller_name',
  '%الخصم': 'discount_pct',
  المورد: 'supplier_name',
  'كمية المباع': 'sold_qty',
  الخصم: 'discount_amount',
  'رقم الموبايل': 'customer_mobile',
  مرتجعات: 'returns_amount',
  '% مرتجعات': 'returns_pct',
  'اسم الصنف': 'item_name',
  'رقم إذن البيع': 'invoice_number',
  'كمية المرتجع': 'returned_qty',
  اللون: 'color',
  المقاس: 'size',
  'مدة الارتجاع': 'return_duration_days',
} as const

export const SALES_EXPECTED_HEADERS = Object.keys(SALES_COLUMN_MAP)

export const SALES_BATCH_SIZE = 400

/** Arabic header for the sale date column in sales Excel exports. */
export const SALES_DATE_HEADER = 'التاريخ'

const NUMERIC_FIELDS = new Set([
  'sales_amount',
  'unit_price',
  'net_sales_amount',
  'discount_pct',
  'discount_amount',
  'returns_amount',
  'returns_pct',
])

const INTEGER_FIELDS = new Set([
  'net_sales_qty',
  'sold_qty',
  'returned_qty',
  'return_duration_days',
])

export type SalesDetailInsert = {
  branch_name: string | null
  item_category: string | null
  sales_amount: number | null
  net_sales_qty: number | null
  unit_price: number | null
  net_sales_amount: number | null
  season_name: string | null
  sale_date: string | null
  seller_name: string | null
  discount_pct: number | null
  supplier_name: string | null
  sold_qty: number | null
  discount_amount: number | null
  customer_mobile: string | null
  returns_amount: number | null
  returns_pct: number | null
  item_name: string | null
  invoice_number: string | null
  returned_qty: number | null
  color: string | null
  size: string | null
  return_duration_days: number | null
}

export type SalesImportResult = {
  rows: SalesDetailInsert[]
  skipped: number
  warnings: string[]
}

export type SalesImportSummary = {
  added: number
  skippedMissingInvoice: number
  skippedDuplicate: number
  warnings: string[]
}

export function salesImportValidRowCount(summary: SalesImportSummary): number {
  return summary.added + summary.skippedDuplicate
}

export function isFullDuplicateImport(summary: SalesImportSummary): boolean {
  const validRows = salesImportValidRowCount(summary)
  return summary.added === 0 && summary.skippedDuplicate > 0 && summary.skippedDuplicate === validRows
}

export function formatSalesImportHeadline(summary: SalesImportSummary): string {
  const dup = summary.skippedDuplicate.toLocaleString('ar-EG')
  const added = summary.added.toLocaleString('ar-EG')

  if (isFullDuplicateImport(summary)) {
    return `تم رفض ${dup} صف مكرر — جميع الصفوف موجودة مسبقاً`
  }

  if (summary.added > 0 && summary.skippedDuplicate > 0) {
    return `تمت إضافة ${added} صف، تم رفض ${dup} صف مكرر`
  }

  if (summary.added > 0) {
    return `تمت إضافة ${added} صف بنجاح`
  }

  if (summary.skippedMissingInvoice > 0 && summary.skippedDuplicate === 0) {
    const invalid = summary.skippedMissingInvoice.toLocaleString('ar-EG')
    return `لم تُضف أي صف — ${invalid} صف بدون رقم فاتورة`
  }

  return 'لا توجد صفوف جديدة للإضافة'
}

export function formatSalesImportToast(summary: SalesImportSummary): {
  variant: 'success' | 'warning' | 'info'
  message: string
} {
  if (isFullDuplicateImport(summary)) {
    const dup = summary.skippedDuplicate.toLocaleString('ar-EG')
    return {
      variant: 'warning',
      message: `تم رفض ${dup} صفوف مكرر — جميع الصفوف موجودة مسبقاً`,
    }
  }

  if (summary.added > 0 && summary.skippedDuplicate > 0) {
    const added = summary.added.toLocaleString('ar-EG')
    const dup = summary.skippedDuplicate.toLocaleString('ar-EG')
    return {
      variant: 'success',
      message: `تمت إضافة ${added} صف، تم رفض ${dup} صف مكرر`,
    }
  }

  if (summary.added > 0) {
    return {
      variant: 'success',
      message: `تمت إضافة ${summary.added.toLocaleString('ar-EG')} صف`,
    }
  }

  if (summary.skippedDuplicate > 0) {
    const dup = summary.skippedDuplicate.toLocaleString('ar-EG')
    return {
      variant: 'warning',
      message: `تم رفض ${dup} صف مكرر`,
    }
  }

  return {
    variant: 'info',
    message: 'لم تُضف أي صفوف جديدة',
  }
}

export function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

export function toInteger(value: unknown): number | null {
  const n = toNumber(value)
  if (n == null) return null
  return Math.trunc(n)
}

export function padMobile(value: unknown): string | null {
  if (value == null || value === '') return null
  let s = String(value).trim()
  if (s.includes('e') || s.includes('E')) {
    const n = Number(s)
    if (Number.isFinite(n)) s = Math.trunc(n).toString()
  }
  s = s.replace(/\.0+$/, '').replace(/\D/g, '')
  if (!s) return null
  if (s.length < 11) s = s.padStart(11, '0')
  return s
}

export function fixInvoiceNumber(value: unknown, warnings: string[]): string | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const day = value.getDate()
    const month = value.getMonth() + 1
    const year = value.getFullYear()
    const rebuilt = `${day}-${month}/${year}`
    if (day > 31 || month > 12) {
      warnings.push(
        `invoice_number Date rebuild looks invalid (day=${day}, month=${month}): ${rebuilt}`,
      )
    }
    return rebuilt
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      const day = parsed.d
      const month = parsed.m
      const year = parsed.y
      const rebuilt = `${day}-${month}/${year}`
      if (day > 31 || month > 12) {
        warnings.push(
          `invoice_number serial rebuild looks invalid (day=${day}, month=${month}): ${rebuilt}`,
        )
      }
      return rebuilt
    }
  }

  const asString = String(value).trim()
  return asString || null
}

/** Build ISO date-only string from calendar parts (no timezone). */
function toIsoDateParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Parse mm/dd/yyyy slash strings (month first, day second — never swap).
 * Examples: "08/09/2026" → 2026-08-09, "9/8/26" → 2026-09-08.
 */
export function parseUsSlashDateString(trimmed: string): string | null {
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!match) return null

  const month = Number(match[1])
  const day = Number(match[2])
  let year = Number(match[3])
  if (match[3].length === 2) {
    year += year >= 70 ? 1900 : 2000
  }

  return toIsoDateParts(year, month, day)
}

function parseSaleDateFromSerial(serial: number): string | null {
  if (!XLSX.SSF?.format) {
    const parsed = XLSX.SSF?.parse_date_code(serial)
    return parsed ? toIsoDateParts(parsed.y, parsed.m, parsed.d) : null
  }

  // Excel often shows dd/mm/yyyy (e.g. 08/09/2026) while the raw serial is US m/d.
  // Format as dd/mm/yyyy, then parse that display text as mm/dd/yyyy.
  const display = XLSX.SSF.format('dd/mm/yyyy', serial)
  const fromDisplay = parseUsSlashDateString(display)
  if (fromDisplay) return fromDisplay

  const parsed = XLSX.SSF.parse_date_code(serial)
  return parsed ? toIsoDateParts(parsed.y, parsed.m, parsed.d) : null
}

export function parseSaleDate(value: unknown): string | null {
  if (value == null || value === '') return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    // ISO date-only: take as-is, no new Date() round-trip.
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10)
    const slashParsed = parseUsSlashDateString(trimmed)
    if (slashParsed) return slashParsed
    const asNum = Number(trimmed)
    if (Number.isFinite(asNum) && asNum > 20000 && asNum < 80000) {
      return parseSaleDateFromSerial(asNum)
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return parseSaleDateFromSerial(value)
  }

  // Fallback only: SheetJS Date objects are UTC-based for Excel serials.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDateParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate())
  }

  return null
}

/** Prefer formatted cell text; for serials use dd/mm/yyyy display then mm/dd parse. */
export function saleDateValueFromCell(cell: CellObject | undefined): unknown {
  if (!cell) return null

  if (cell.t === 'n' && typeof cell.v === 'number' && Number.isFinite(cell.v)) {
    if (XLSX.SSF?.format) {
      return XLSX.SSF.format('dd/mm/yyyy', cell.v)
    }
    return cell.v
  }

  if (cell.w) return cell.w
  if (cell.v != null && cell.v !== '') return cell.v
  return null
}

function applyFormattedSaleDates(sheet: WorkSheet, rawRows: Record<string, unknown>[]): void {
  const ref = sheet['!ref']
  if (!ref) return

  const range = XLSX.utils.decode_range(ref)
  let dateCol = -1
  for (let c = range.s.c; c <= range.e.c; c++) {
    const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })]
    if (headerCell && String(headerCell.v).trim() === SALES_DATE_HEADER) {
      dateCol = c
      break
    }
  }
  if (dateCol < 0) return

  for (let i = 0; i < rawRows.length; i++) {
    const rowIndex = range.s.r + 1 + i
    const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: dateCol })]
    const formatted = saleDateValueFromCell(cell)
    if (formatted != null && formatted !== '') {
      rawRows[i][SALES_DATE_HEADER] = formatted
    }
  }
}

export function salesDedupeKey(row: Pick<SalesDetailInsert, 'invoice_number' | 'item_name' | 'color' | 'size' | 'sold_qty'>): string {
  return [
    row.invoice_number ?? '',
    row.item_name ?? '',
    row.color ?? '',
    row.size ?? '',
    row.sold_qty ?? '',
  ].join('\u0001')
}

export function mapSalesRow(raw: Record<string, unknown>, warnings: string[]): SalesDetailInsert {
  const row: Record<string, unknown> = {}
  for (const [arabic, field] of Object.entries(SALES_COLUMN_MAP)) {
    row[field] = raw[arabic] ?? null
  }

  row.invoice_number = fixInvoiceNumber(row.invoice_number, warnings)
  row.customer_mobile = padMobile(row.customer_mobile)
  row.sale_date = parseSaleDate(row.sale_date)

  for (const field of NUMERIC_FIELDS) {
    row[field] = toNumber(row[field])
  }
  for (const field of INTEGER_FIELDS) {
    row[field] = toInteger(row[field])
  }

  for (const field of Object.keys(row)) {
    if (
      typeof row[field] === 'string' ||
      NUMERIC_FIELDS.has(field) ||
      INTEGER_FIELDS.has(field) ||
      field === 'sale_date' ||
      field === 'invoice_number' ||
      field === 'customer_mobile'
    ) {
      continue
    }
    if (row[field] == null) continue
    if (row[field] instanceof Date) {
      row[field] = (row[field] as Date).toISOString()
      continue
    }
    row[field] = String(row[field]).trim() || null
  }

  return row as SalesDetailInsert
}

export function validateSalesColumns(headers: string[]): { valid: boolean; missing: string[] } {
  const headerSet = new Set(headers.map((h) => String(h).trim()))
  const missing = SALES_EXPECTED_HEADERS.filter((col) => !headerSet.has(col))
  return { valid: missing.length === 0, missing }
}

export function parseSalesWorkbook(
  workbook: WorkBook,
  sheetName?: string,
): { sheetName: string; rawRows: Record<string, unknown>[] } {
  const resolvedSheet =
    sheetName ??
    (workbook.SheetNames.includes('Sheet1') ? 'Sheet1' : workbook.SheetNames[0])
  const sheet = workbook.Sheets[resolvedSheet]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  })
  applyFormattedSaleDates(sheet, rawRows)
  return { sheetName: resolvedSheet, rawRows }
}

/** Shared SheetJS read options: formatted text for dates, no TZ Date objects. */
export const SALES_XLSX_READ_OPTS: ParsingOptions = {
  cellDates: false,
  cellNF: true,
  cellText: true,
}

export function parseSalesExcelBuffer(buffer: ArrayBuffer): SalesImportResult {
  const workbook = XLSX.read(buffer, SALES_XLSX_READ_OPTS)
  const { rawRows } = parseSalesWorkbook(workbook)
  return transformSalesRawRows(rawRows)
}

export function transformSalesRawRows(rawRows: Record<string, unknown>[]): SalesImportResult {
  const warnings: string[] = []
  const rows: SalesDetailInsert[] = []
  let skipped = 0

  for (const raw of rawRows) {
    const row = mapSalesRow(raw, warnings)
    if (!row.invoice_number) {
      skipped += 1
      continue
    }
    rows.push(row)
  }

  return { rows, skipped, warnings }
}

export async function readSalesExcelFile(file: File): Promise<SalesImportResult> {
  const buffer = await file.arrayBuffer()
  return parseSalesExcelBuffer(buffer)
}
