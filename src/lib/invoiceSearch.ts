import type { InvoiceLineItemSummary, InvoiceSummary } from './supabase'
import { formatDateMDY } from './utils'

const EASTERN_ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (ch) => {
    const eastern = EASTERN_ARABIC_DIGITS.indexOf(ch)
    if (eastern >= 0) return String(eastern)
    const persian = PERSIAN_DIGITS.indexOf(ch)
    if (persian >= 0) return String(persian)
    return ch
  })
}

function normalizeForSearch(value: string): string {
  return normalizeDigits(value.trim().toLocaleLowerCase('ar'))
}

function textMatches(value: string | null | undefined, normalizedTerm: string): boolean {
  if (value == null || value === '') return false
  return normalizeForSearch(value).includes(normalizedTerm)
}

function numberMatches(value: number | null | undefined, normalizedTerm: string): boolean {
  if (value == null) return false
  const candidates = [
    String(value),
    value.toLocaleString('ar-EG'),
    value.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  ]
  return candidates.some((c) => normalizeForSearch(c).includes(normalizedTerm))
}

function dateMatches(value: string | null | undefined, normalizedTerm: string): boolean {
  if (value == null || value === '') return false
  const formatted = formatDateMDY(value)
  const candidates = [value, formatted]
  return candidates.some((c) => c && c !== '—' && normalizeForSearch(c).includes(normalizedTerm))
}

function lineItemMatches(item: InvoiceLineItemSummary, normalizedTerm: string): boolean {
  return (
    textMatches(item.item_name, normalizedTerm) ||
    textMatches(item.item_category, normalizedTerm) ||
    textMatches(item.color, normalizedTerm) ||
    textMatches(item.size, normalizedTerm) ||
    textMatches(item.supplier_name, normalizedTerm) ||
    textMatches(item.season_name, normalizedTerm) ||
    numberMatches(item.qty, normalizedTerm) ||
    numberMatches(item.unit_price, normalizedTerm) ||
    numberMatches(item.net_amount, normalizedTerm)
  )
}

/** Case-insensitive, Arabic-friendly match against every displayed invoice + line-item field. */
export function invoiceMatchesSearch(invoice: InvoiceSummary, searchTerm: string): boolean {
  const term = searchTerm.trim()
  if (!term) return true

  const normalizedTerm = normalizeForSearch(term)

  if (textMatches(invoice.invoice_number, normalizedTerm)) return true
  if (textMatches(invoice.branch_name, normalizedTerm)) return true
  if (textMatches(invoice.seller_name, normalizedTerm)) return true
  if (textMatches(invoice.customer_mobile, normalizedTerm)) return true
  if (dateMatches(invoice.invoice_date, normalizedTerm)) return true
  if (numberMatches(invoice.line_items_count, normalizedTerm)) return true
  if (numberMatches(invoice.total_net_sales, normalizedTerm)) return true
  if (numberMatches(invoice.total_returns, normalizedTerm)) return true
  if (numberMatches(invoice.total_qty, normalizedTerm)) return true
  if (numberMatches(invoice.total_discount, normalizedTerm)) return true

  const items = invoice.line_items ?? []
  return items.some((item) => lineItemMatches(item, normalizedTerm))
}

export function filterInvoicesBySearch(
  invoices: InvoiceSummary[],
  searchTerm: string,
): InvoiceSummary[] {
  const term = searchTerm.trim()
  if (!term) return invoices
  return invoices.filter((invoice) => invoiceMatchesSearch(invoice, term))
}
