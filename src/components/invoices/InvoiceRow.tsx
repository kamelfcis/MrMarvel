import { ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { supabase, type InvoiceSummary, type SalesDetailLine } from '../../lib/supabase'

type InvoiceRowProps = {
  invoice: InvoiceSummary
  formatCurrency: (value: number | null | undefined) => string
  formatDate: (value: string | null | undefined) => string
  variant: 'table' | 'card'
}

function LineItemsTable({
  items,
  formatCurrency,
}: {
  items: SalesDetailLine[]
  formatCurrency: (value: number | null | undefined) => string
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-100 bg-gray-50/60">
      <table className="w-full min-w-[640px] text-xs">
        <thead>
          <tr className="border-b border-gray-200 text-right text-gray-500">
            <th className="px-3 py-2 font-medium">الصنف</th>
            <th className="px-3 py-2 font-medium">المجموعة</th>
            <th className="px-3 py-2 font-medium">اللون</th>
            <th className="px-3 py-2 font-medium">المقاس</th>
            <th className="px-3 py-2 font-medium">الكمية</th>
            <th className="px-3 py-2 font-medium">السعر</th>
            <th className="px-3 py-2 font-medium">صافي المبيعات</th>
            <th className="px-3 py-2 font-medium">الخصم</th>
            <th className="px-3 py-2 font-medium">المرتجعات</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-gray-100 last:border-0">
              <td className="px-3 py-2 font-medium text-gray-900">{item.item_name ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{item.item_category ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{item.color ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{item.size ?? '—'}</td>
              <td className="px-3 py-2">{item.sold_qty?.toLocaleString('ar-EG') ?? '—'}</td>
              <td className="px-3 py-2">{formatCurrency(item.unit_price)}</td>
              <td className="px-3 py-2 font-medium text-green-700">
                {formatCurrency(item.net_sales_amount)}
              </td>
              <td className="px-3 py-2 text-amber-700">
                {item.discount_pct != null
                  ? `${(item.discount_pct * 100).toFixed(1)}%`
                  : item.discount_amount
                    ? formatCurrency(item.discount_amount)
                    : '—'}
              </td>
              <td className="px-3 py-2 text-red-600">
                {item.returns_amount ? formatCurrency(item.returns_amount) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LineItemsPanel({
  loadingItems,
  itemsError,
  lineItems,
  formatCurrency,
  onRetry,
}: {
  loadingItems: boolean
  itemsError: string | null
  lineItems: SalesDetailLine[]
  formatCurrency: (value: number | null | undefined) => string
  onRetry: () => void
}) {
  if (loadingItems) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
        جاري تحميل البنود...
      </div>
    )
  }

  if (itemsError) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-sm">
        <p className="text-red-600">{itemsError}</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-gray-700 transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (lineItems.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-500">لا توجد بنود</p>
  }

  return <LineItemsTable items={lineItems} formatCurrency={formatCurrency} />
}

function useInvoiceLineItems(invoiceNumber: string, open: boolean) {
  const [lineItems, setLineItems] = useState<SalesDetailLine[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const fetchLineItems = useCallback(async () => {
    setLoadingItems(true)
    setItemsError(null)
    const { data, error } = await supabase
      .from('sales_details')
      .select(
        'id, item_name, item_category, color, size, sold_qty, unit_price, net_sales_amount, discount_pct, discount_amount, returns_amount',
      )
      .eq('invoice_number', invoiceNumber)
      .order('id', { ascending: true })

    if (error) {
      setItemsError('فشل تحميل بنود الفاتورة')
      setLineItems([])
    } else {
      setLineItems((data as SalesDetailLine[]) ?? [])
    }
    setLoadingItems(false)
  }, [invoiceNumber])

  useEffect(() => {
    if (open && lineItems.length === 0 && !loadingItems && !itemsError) {
      void fetchLineItems()
    }
  }, [open, lineItems.length, loadingItems, itemsError, fetchLineItems])

  return { lineItems, loadingItems, itemsError, fetchLineItems }
}

export function InvoiceRow({ invoice, formatCurrency, formatDate, variant }: InvoiceRowProps) {
  const [open, setOpen] = useState(false)
  const { lineItems, loadingItems, itemsError, fetchLineItems } = useInvoiceLineItems(
    invoice.invoice_number,
    open,
  )

  const panel = (
    <LineItemsPanel
      loadingItems={loadingItems}
      itemsError={itemsError}
      lineItems={lineItems}
      formatCurrency={formatCurrency}
      onRetry={() => void fetchLineItems()}
    />
  )

  const chevronClass = cn(
    'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 motion-reduce:transition-none',
    open && 'rotate-180',
  )

  const contentClass = cn(
    'overflow-hidden',
    'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
    'motion-reduce:transition-none motion-reduce:animate-none',
  )

  if (variant === 'card') {
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start justify-between gap-3 p-4 text-right transition hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 active:bg-blue-50/50"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                <Badge variant="default">
                  {invoice.line_items_count?.toLocaleString('ar-EG')} بند
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>الفرع: {invoice.branch_name ?? '—'}</span>
                <span>البائع: {invoice.seller_name ?? '—'}</span>
                <span>التاريخ: {formatDate(invoice.invoice_date)}</span>
                <span className="text-green-700">
                  صافي: {formatCurrency(invoice.total_net_sales)}
                </span>
              </div>
            </div>
            <ChevronDown className={cn(chevronClass, 'mt-1 h-5 w-5')} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn(contentClass, 'border-t border-gray-100 bg-slate-50/50 px-4 py-3')}>
          {panel}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <>
      <tr className="border-b border-gray-100 transition hover:bg-blue-50/20">
        <td className="px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md text-right transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-expanded={open}
          >
            <ChevronDown className={chevronClass} />
            <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
          </button>
        </td>
        <td className="px-5 py-3 text-gray-600">{invoice.branch_name ?? '—'}</td>
        <td className="px-5 py-3 text-gray-600">{invoice.seller_name ?? '—'}</td>
        <td className="px-5 py-3 text-gray-600">{formatDate(invoice.invoice_date)}</td>
        <td className="px-5 py-3">{invoice.line_items_count?.toLocaleString('ar-EG') ?? '—'}</td>
        <td className="px-5 py-3 font-medium text-green-700">
          {formatCurrency(invoice.total_net_sales)}
        </td>
        <td className="px-5 py-3 text-red-600">{formatCurrency(invoice.total_returns)}</td>
      </tr>
      <tr>
        <td colSpan={7} className="p-0">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent className={contentClass}>
              <div className="border-t border-gray-100 bg-slate-50/50 px-5 py-3">{panel}</div>
            </CollapsibleContent>
          </Collapsible>
        </td>
      </tr>
    </>
  )
}
