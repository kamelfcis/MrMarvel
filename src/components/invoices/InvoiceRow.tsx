import { ChevronDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { buildWhatsAppChatUrl } from '../../lib/whatsapp'
import { invoiceHasReturn } from '../../lib/invoiceReturns'
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function CustomerMobileCell({
  mobile,
  isReturnRow = false,
}: {
  mobile: string | null | undefined
  isReturnRow?: boolean
}) {
  if (!mobile) return <>—</>

  const waUrl = buildWhatsAppChatUrl(mobile)

  return (
    <span className="inline-flex items-center justify-center gap-1.5">
      <span>{mobile}</span>
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`فتح واتساب مع ${mobile}`}
          className={cn(
            'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-2',
            isReturnRow
              ? 'text-white/90 hover:bg-white/15 hover:text-white focus-visible:ring-white/60'
              : 'text-green-600/90 hover:bg-green-50 hover:text-green-700 focus-visible:ring-green-500',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      )}
    </span>
  )
}

export function InvoiceRow({ invoice, formatCurrency, formatDate, variant }: InvoiceRowProps) {
  const [open, setOpen] = useState(false)
  const hasReturn = invoiceHasReturn(invoice)
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
    'h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
    hasReturn ? 'text-white/80' : 'text-gray-400',
    open && 'rotate-180',
  )

  const contentClass = cn(
    'overflow-hidden',
    'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
    'motion-reduce:transition-none motion-reduce:animate-none',
  )

  if (variant === 'card') {
    return (
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn(
          'rounded-xl border shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
          hasReturn
            ? cn(
                'border-red-700 bg-red-600 text-white',
                open && 'shadow-md ring-1 ring-red-400/80',
              )
            : cn(
                'border-gray-200 bg-white',
                open
                  ? 'border-blue-200/90 shadow-md ring-1 ring-blue-100/80'
                  : undefined,
              ),
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-start justify-between gap-3 p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
              hasReturn
                ? cn(
                    'focus-visible:ring-white/60',
                    open ? 'bg-red-600 hover:bg-red-700' : 'hover:bg-red-700 active:bg-red-800',
                  )
                : cn(
                    'focus-visible:ring-blue-500',
                    open ? 'bg-blue-50/25 hover:bg-blue-50/35' : 'hover:bg-blue-50/30 active:bg-blue-50/50',
                  ),
            )}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('font-semibold', hasReturn ? 'text-white' : 'text-gray-900')}>
                  {invoice.invoice_number}
                </span>
                <Badge
                  variant="default"
                  className={hasReturn ? 'bg-white/20 text-white' : undefined}
                >
                  {invoice.line_items_count?.toLocaleString('ar-EG')} بند
                </Badge>
              </div>
              <div
                className={cn(
                  'grid grid-cols-2 gap-x-4 gap-y-1 text-xs',
                  hasReturn ? 'text-white/90' : 'text-gray-600',
                )}
              >
                <span>الفرع: {invoice.branch_name ?? '—'}</span>
                <span>البائع: {invoice.seller_name ?? '—'}</span>
                <span dir="ltr" className="inline-flex items-center gap-1 text-center">
                  موبيل العميل:{' '}
                  <CustomerMobileCell mobile={invoice.customer_mobile} isReturnRow={hasReturn} />
                </span>
                <span>التاريخ: {formatDate(invoice.invoice_date)}</span>
                <span className={hasReturn ? 'text-white' : 'text-green-700'}>
                  صافي: {formatCurrency(invoice.total_net_sales)}
                </span>
              </div>
            </div>
            <ChevronDown className={cn(chevronClass, 'mt-1 h-5 w-5')} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent
          className={cn(
            contentClass,
            hasReturn
              ? 'border-t border-red-500/80 bg-red-700 px-4 py-3'
              : 'border-t border-blue-100/80 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3',
          )}
        >
          <div
            className={cn(
              'overflow-hidden rounded-lg border shadow-sm',
              hasReturn
                ? 'border-red-500/60 bg-white/95'
                : 'border-gray-200/90 bg-white/90',
            )}
          >
            {panel}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <>
      <tr
        className={cn(
          'border-b transition',
          hasReturn
            ? cn(
                'bg-red-600 text-white hover:bg-red-700',
                open
                  ? 'border-x border-t border-red-700 shadow-sm'
                  : 'border-red-700/40',
              )
            : cn(
                'hover:bg-blue-50/20',
                open
                  ? 'border-x border-t border-blue-200/80 bg-blue-50/20 shadow-sm'
                  : 'border-gray-100',
              ),
        )}
      >
        <td className="px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-md text-right transition focus-visible:outline-none focus-visible:ring-2',
              hasReturn
                ? 'text-white hover:text-white/90 focus-visible:ring-white/60'
                : 'hover:text-blue-700 focus-visible:ring-blue-500',
            )}
            aria-expanded={open}
          >
            <ChevronDown className={chevronClass} />
            <span className={cn('font-medium', hasReturn ? 'text-white' : 'text-gray-900')}>
              {invoice.invoice_number}
            </span>
          </button>
        </td>
        <td className={cn('px-5 py-3', hasReturn ? 'text-white/90' : 'text-gray-600')}>
          {invoice.branch_name ?? '—'}
        </td>
        <td className={cn('px-5 py-3', hasReturn ? 'text-white/90' : 'text-gray-600')}>
          {invoice.seller_name ?? '—'}
        </td>
        <td
          className={cn(
            'px-5 py-3 text-center align-middle',
            hasReturn ? 'text-white/90' : 'text-gray-600',
          )}
          dir="ltr"
        >
          <CustomerMobileCell mobile={invoice.customer_mobile} isReturnRow={hasReturn} />
        </td>
        <td className={cn('px-5 py-3', hasReturn ? 'text-white/90' : 'text-gray-600')}>
          {formatDate(invoice.invoice_date)}
        </td>
        <td className="px-5 py-3">
          {invoice.line_items_count?.toLocaleString('ar-EG') ?? '—'}
        </td>
        <td className={cn('px-5 py-3 font-medium', hasReturn ? 'text-white' : 'text-green-700')}>
          {formatCurrency(invoice.total_net_sales)}
        </td>
        <td className={cn('px-5 py-3', hasReturn ? 'text-white' : 'text-red-600')}>
          {formatCurrency(invoice.total_returns)}
        </td>
      </tr>
      <tr
        className={cn(
          hasReturn
            ? open && 'border-x border-b border-red-700 bg-red-700'
            : open && 'border-x border-b border-blue-200/80',
        )}
      >
        <td colSpan={8} className="p-0">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent className={contentClass}>
              <div
                className={cn(
                  'px-5 pb-4 pt-3',
                  hasReturn
                    ? 'border-t border-red-500/80 bg-red-700'
                    : 'border-t border-blue-100/80 bg-gradient-to-b from-slate-50/80 to-white',
                )}
              >
                <div
                  className={cn(
                    'overflow-hidden rounded-b-lg border shadow-sm',
                    hasReturn
                      ? 'border-red-500/60 bg-white/95'
                      : 'border-gray-200/90 bg-white/90',
                  )}
                >
                  {panel}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </td>
      </tr>
    </>
  )
}
