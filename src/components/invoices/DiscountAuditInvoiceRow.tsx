import { CheckCircle2, ChevronDown, ExternalLink, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  FLAG_REASON_LABELS,
  type InvoiceDiscountAudit,
} from '../../lib/discountAudit'
import { supabase } from '../../lib/supabase'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
import { cn } from '../ui/utils'
import { CustomerMobileCell } from './CustomerMobileCell'
import { InvoiceLineItemsPanel } from './InvoiceLineItemsPanel'

type DiscountAuditInvoiceRowProps = {
  invoice: InvoiceDiscountAudit
  formatCurrency: (value: number | null | undefined) => string
  formatDate: (value: string | null | undefined) => string
  formatPct: (value: number | null | undefined) => string
  variant: 'table' | 'card'
  onReviewedChange: () => void | Promise<void>
}

function InvoiceSummaryCard({
  invoice,
  formatCurrency,
  formatPct,
}: {
  invoice: InvoiceDiscountAudit
  formatCurrency: (value: number | null | undefined) => string
  formatPct: (value: number | null | undefined) => string
}) {
  const head = invoice.flags[0]
  const reason = head ? FLAG_REASON_LABELS[head.flag_reason] ?? head.flag_reason : '—'

  return (
    <div className="grid gap-3 p-4 text-sm sm:grid-cols-2">
      <div>
        <p className="text-xs text-gray-500">مطبق</p>
        <p className="font-semibold text-red-700">
          {formatPct(invoice.appliedDiscountPct)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">مسموح</p>
        <p className="font-semibold text-green-700">
          {formatPct(invoice.allowedDiscountPct)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">السبب</p>
        <Badge variant="destructive" className="mt-0.5">
          {reason}
        </Badge>
      </div>
      <div>
        <p className="text-xs text-gray-500">إجمالي الخصم</p>
        <p className="font-semibold text-amber-700">
          {formatCurrency(invoice.total_discount)}
        </p>
      </div>
    </div>
  )
}

function InvoiceTotalsStrip({
  invoice,
  formatCurrency,
}: {
  invoice: InvoiceDiscountAudit
  formatCurrency: (value: number | null | undefined) => string
}) {
  return (
    <div className="grid gap-3 border-t border-gray-100 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <p className="text-xs text-gray-500">إجمالي الفاتورة</p>
        <p className="font-semibold text-green-700">
          {formatCurrency(invoice.total_net_sales)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">إجمالي الخصم</p>
        <p className="font-semibold text-amber-700">
          {formatCurrency(invoice.total_discount)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">المرتجعات</p>
        <p className="font-semibold text-red-600">
          {formatCurrency(invoice.total_returns)}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">عدد البنود</p>
        <p className="font-semibold text-gray-900">
          {invoice.line_items_count?.toLocaleString('ar-EG') ?? '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">إجمالي الكمية</p>
        <p className="font-semibold text-gray-900">
          {invoice.total_qty?.toLocaleString('ar-EG') ?? '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500">موبيل العميل</p>
        <p className="font-semibold text-gray-900" dir="ltr">
          <CustomerMobileCell mobile={invoice.customer_mobile} />
        </p>
      </div>
    </div>
  )
}

function ExpandPanel({
  invoice,
  open,
  formatCurrency,
  formatPct,
}: {
  invoice: InvoiceDiscountAudit
  open: boolean
  formatCurrency: (value: number | null | undefined) => string
  formatPct: (value: number | null | undefined) => string
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-gray-200/90 bg-white/90 shadow-sm">
        <p className="border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-xs font-medium text-gray-600">
          مراجعة الخصم
        </p>
        <InvoiceSummaryCard
          invoice={invoice}
          formatCurrency={formatCurrency}
          formatPct={formatPct}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200/90 bg-white/90 shadow-sm">
        <p className="border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-xs font-medium text-gray-600">
          ملخص الفاتورة
        </p>
        <InvoiceTotalsStrip invoice={invoice} formatCurrency={formatCurrency} />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200/90 bg-white/90 shadow-sm">
        <p className="border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-xs font-medium text-gray-600">
          بنود الفاتورة
        </p>
        <InvoiceLineItemsPanel
          invoiceNumber={invoice.invoice_number}
          open={open}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  )
}

export function DiscountAuditInvoiceRow({
  invoice,
  formatCurrency,
  formatDate,
  formatPct,
  variant,
  onReviewedChange,
}: DiscountAuditInvoiceRowProps) {
  const [open, setOpen] = useState(false)
  const [updatingInvoice, setUpdatingInvoice] = useState(false)

  const pending = !invoice.reviewedAll
  const statusBadge = pending ? (
    <Badge variant="destructive">قيد المراجعة</Badge>
  ) : (
    <Badge variant="default">تمت المراجعة</Badge>
  )

  const markInvoiceReviewed = async (reviewed: boolean) => {
    const targetIds = invoice.flags
      .filter((f) => f.reviewed !== reviewed)
      .map((f) => f.id)
    if (targetIds.length === 0) return

    setUpdatingInvoice(true)
    try {
      const chunkSize = 200
      for (let i = 0; i < targetIds.length; i += chunkSize) {
        const chunk = targetIds.slice(i, i + chunkSize)
        const { error } = await supabase
          .from('discount_flags')
          .update({
            reviewed,
            reviewed_at: reviewed ? new Date().toISOString() : null,
          })
          .in('id', chunk)
        if (error) throw error
      }
      toast.success(
        reviewed ? 'تم تعليم الفاتورة كمراجعة' : 'أُعيدت تنبيهات الفاتورة للمراجعة',
      )
      await onReviewedChange()
    } catch (err) {
      console.error(err)
      toast.error('فشل تحديث حالة مراجعة الفاتورة')
    } finally {
      setUpdatingInvoice(false)
    }
  }

  const invoiceLink = (
    <Link
      to={`/admin/invoices?invoice=${encodeURIComponent(invoice.invoice_number)}`}
      className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {invoice.invoice_number}
      <ExternalLink className="h-3.5 w-3.5" />
    </Link>
  )

  const reviewAction = pending ? (
    <Button
      size="sm"
      disabled={updatingInvoice}
      onClick={(e) => {
        e.stopPropagation()
        void markInvoiceReviewed(true)
      }}
    >
      {updatingInvoice ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      تمت المراجعة
    </Button>
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled={updatingInvoice}
      onClick={(e) => {
        e.stopPropagation()
        void markInvoiceReviewed(false)
      }}
    >
      إعادة فتح
    </Button>
  )

  const expandPanel = (
    <ExpandPanel
      invoice={invoice}
      open={open}
      formatCurrency={formatCurrency}
      formatPct={formatPct}
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
      <Collapsible
        open={open}
        onOpenChange={setOpen}
        className={cn(
          'rounded-xl border shadow-sm transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none',
          pending
            ? cn(
                'border-red-200 bg-red-50/70',
                open && 'shadow-md ring-1 ring-red-100/80',
              )
            : cn(
                'border-gray-200 bg-white',
                open && 'border-blue-200/90 shadow-md ring-1 ring-blue-100/80',
              ),
        )}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex w-full items-start justify-between gap-3 p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
              open ? 'bg-blue-50/25 hover:bg-blue-50/35' : 'hover:bg-blue-50/30',
            )}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                <Badge variant="destructive">خصم مشبوه</Badge>
                {statusBadge}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                <span>الكاشير: {invoice.seller_name ?? '—'}</span>
                <span>الفرع: {invoice.branch_name ?? '—'}</span>
                <span>التاريخ: {formatDate(invoice.sale_date)}</span>
                <span className="font-medium text-green-700">
                  إجمالي الفاتورة: {formatCurrency(invoice.total_net_sales)}
                </span>
                <span className="font-medium text-red-700">
                  نسبة الخصم: {formatPct(invoice.appliedDiscountPct)}
                </span>
                <span className="font-medium text-green-700">
                  مسموح: {formatPct(invoice.allowedDiscountPct)}
                </span>
                <span className="font-medium text-amber-700">
                  إجمالي الخصم: {formatCurrency(invoice.total_discount)}
                </span>
              </div>
            </div>
            <ChevronDown className={cn(chevronClass, 'mt-1 h-5 w-5')} aria-hidden />
          </button>
        </CollapsibleTrigger>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2">
          {invoiceLink}
          {reviewAction}
        </div>
        <CollapsibleContent
          className={cn(
            contentClass,
            'border-t border-blue-100/80 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3',
          )}
        >
          {expandPanel}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <>
      <tr
        className={cn(
          'border-b transition',
          pending
            ? cn(
                'bg-red-50/60 hover:bg-red-50',
                open && 'border-x border-t border-red-200/80 shadow-sm',
              )
            : cn(
                'hover:bg-blue-50/20',
                open
                  ? 'border-x border-t border-blue-200/80 bg-blue-50/20 shadow-sm'
                  : 'border-gray-100',
              ),
        )}
      >
        <td className="px-4 py-3">
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
        <td className="px-4 py-3 text-gray-700">{invoice.seller_name ?? '—'}</td>
        <td className="px-4 py-3 text-gray-600">{invoice.branch_name ?? '—'}</td>
        <td className="px-4 py-3 text-gray-600">{formatDate(invoice.sale_date)}</td>
        <td className="px-4 py-3 font-medium text-green-700">
          {formatCurrency(invoice.total_net_sales)}
        </td>
        <td className="px-4 py-3 font-medium text-red-700">
          {formatPct(invoice.appliedDiscountPct)}
        </td>
        <td className="px-4 py-3 font-medium text-green-700">
          {formatPct(invoice.allowedDiscountPct)}
        </td>
        <td className="px-4 py-3 font-medium text-amber-700">
          {formatCurrency(invoice.total_discount)}
        </td>
        <td className="px-4 py-3">{statusBadge}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {reviewAction}
            <Link
              to={`/admin/invoices?invoice=${encodeURIComponent(invoice.invoice_number)}`}
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              الفاتورة
            </Link>
          </div>
        </td>
      </tr>
      <tr className={cn(open && (pending ? 'border-x border-b border-red-200/80' : 'border-x border-b border-blue-200/80'))}>
        <td colSpan={10} className="p-0">
          <Collapsible open={open} onOpenChange={setOpen}>
            <CollapsibleContent className={contentClass}>
              <div className="border-t border-blue-100/80 bg-gradient-to-b from-slate-50/80 to-white px-4 pb-4 pt-3">
                {expandPanel}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </td>
      </tr>
    </>
  )
}
