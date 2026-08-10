import type { InvoiceLineItemSummary, InvoiceSummary } from './supabase'

function lineItemHasReturn(item: InvoiceLineItemSummary): boolean {
  if ((item.returned_qty ?? 0) > 0) return true
  if ((item.returns_amount ?? 0) > 0) return true
  if ((item.qty ?? 0) < 0) return true
  if ((item.net_amount ?? 0) < 0) return true
  return false
}

/** True when the invoice has any returns (مرتجع) at summary or line-item level. */
export function invoiceHasReturn(invoice: InvoiceSummary): boolean {
  if ((invoice.total_returns ?? 0) > 0) return true
  const items = invoice.line_items ?? []
  return items.some(lineItemHasReturn)
}
