import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { supabase, type SalesDetailLine } from '../../lib/supabase'

function LineItemsTable({
  items,
  formatCurrency,
}: {
  items: SalesDetailLine[]
  formatCurrency: (value: number | null | undefined) => string
}) {
  return (
    <div className="overflow-x-auto">
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

export function useInvoiceLineItems(invoiceNumber: string, open: boolean) {
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

type InvoiceLineItemsPanelProps = {
  invoiceNumber: string
  open: boolean
  formatCurrency: (value: number | null | undefined) => string
}

export function InvoiceLineItemsPanel({
  invoiceNumber,
  open,
  formatCurrency,
}: InvoiceLineItemsPanelProps) {
  const { lineItems, loadingItems, itemsError, fetchLineItems } = useInvoiceLineItems(
    invoiceNumber,
    open,
  )

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
          onClick={() => void fetchLineItems()}
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
