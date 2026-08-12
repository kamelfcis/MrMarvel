import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { Badge } from '../ui/badge'
import { cn } from '../ui/utils'
import { invoiceHasReturn } from '../../lib/invoiceReturns'
import type { InvoiceSummary } from '../../lib/supabase'
import { CustomerMobileCell } from './CustomerMobileCell'
import { InvoiceLineItemsPanel } from './InvoiceLineItemsPanel'

type InvoiceRowProps = {
  invoice: InvoiceSummary
  formatCurrency: (value: number | null | undefined) => string
  formatDate: (value: string | null | undefined) => string
  variant: 'table' | 'card'
  /** Unreviewed discount_flags exist for this invoice */
  suspiciousDiscount?: boolean
}

export function InvoiceRow({
  invoice,
  formatCurrency,
  formatDate,
  variant,
  suspiciousDiscount = false,
}: InvoiceRowProps) {
  const [open, setOpen] = useState(false)
  const hasReturn = invoiceHasReturn(invoice)

  const suspiciousBadge = suspiciousDiscount ? (
    <Badge
      variant="destructive"
      className={hasReturn ? 'bg-amber-400 text-amber-950' : undefined}
    >
      خصم مشبوه
    </Badge>
  ) : null

  const panel = (
    <InvoiceLineItemsPanel
      invoiceNumber={invoice.invoice_number}
      open={open}
      formatCurrency={formatCurrency}
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
                {suspiciousBadge}
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
            {suspiciousBadge}
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
