import type { InvoiceSummary } from './supabase'

export type InvoiceSortField =
  | 'invoice_number'
  | 'branch_name'
  | 'seller_name'
  | 'invoice_date'
  | 'line_items_count'
  | 'total_net_sales'
  | 'total_returns'

export type SortDirection = 'asc' | 'desc'

export const DEFAULT_INVOICE_SORT_FIELD: InvoiceSortField = 'invoice_date'
export const DEFAULT_INVOICE_SORT_DIRECTION: SortDirection = 'desc'

export const INVOICE_SORT_OPTIONS: { value: InvoiceSortField; label: string }[] = [
  { value: 'invoice_number', label: 'رقم الفاتورة' },
  { value: 'branch_name', label: 'الفرع' },
  { value: 'seller_name', label: 'البائع' },
  { value: 'invoice_date', label: 'التاريخ' },
  { value: 'line_items_count', label: 'البنود' },
  { value: 'total_net_sales', label: 'صافي المبيعات' },
  { value: 'total_returns', label: 'المرتجعات' },
]

function compareStrings(a: string | null | undefined, b: string | null | undefined) {
  return (a ?? '').localeCompare(b ?? '', 'ar')
}

function compareNumbers(a: number | null | undefined, b: number | null | undefined) {
  return (a ?? 0) - (b ?? 0)
}

export function compareInvoices(
  a: InvoiceSummary,
  b: InvoiceSummary,
  sortField: InvoiceSortField,
  sortDirection: SortDirection,
): number {
  let comparison = 0

  switch (sortField) {
    case 'invoice_number':
      comparison = compareStrings(a.invoice_number, b.invoice_number)
      break
    case 'branch_name':
      comparison = compareStrings(a.branch_name, b.branch_name)
      break
    case 'seller_name':
      comparison = compareStrings(a.seller_name, b.seller_name)
      break
    case 'invoice_date':
      comparison = compareStrings(a.invoice_date, b.invoice_date)
      break
    case 'line_items_count':
      comparison = compareNumbers(a.line_items_count, b.line_items_count)
      break
    case 'total_net_sales':
      comparison = compareNumbers(a.total_net_sales, b.total_net_sales)
      break
    case 'total_returns':
      comparison = compareNumbers(a.total_returns, b.total_returns)
      break
  }

  return sortDirection === 'asc' ? comparison : -comparison
}

export function sortInvoices(
  invoices: InvoiceSummary[],
  sortField: InvoiceSortField,
  sortDirection: SortDirection,
): InvoiceSummary[] {
  return [...invoices].sort((a, b) => compareInvoices(a, b, sortField, sortDirection))
}
