import type { InventoryResultItem } from '../../lib/supabase'
import { Badge } from '../ui/badge'
import { TablePagination, type PageSize } from '../TablePagination'
import { cn } from '../ui/utils'

interface InventoryResultsTableProps {
  results: InventoryResultItem[]
  paginatedResults: InventoryResultItem[]
  filteredCount: number
  hasRawResults: boolean
  currentPage: number
  totalPages: number
  pageSize: PageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: PageSize) => void
}

function StatusBadge({ item }: { item: InventoryResultItem }) {
  return (
    <Badge
      variant={
        item.statusType === 'matched'
          ? 'success'
          : item.statusType === 'increase'
            ? 'info'
            : item.statusType === 'decrease'
              ? 'destructive'
              : 'purple'
      }
      className="whitespace-nowrap"
    >
      {item.status}
    </Badge>
  )
}

function DifferenceCell({ difference }: { difference: number }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-8 items-center justify-center rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums',
        difference === 0 && 'bg-green-50 text-green-700',
        difference > 0 && 'bg-blue-50 text-blue-700',
        difference < 0 && 'bg-red-50 text-red-700'
      )}
    >
      {difference > 0 ? `+${difference}` : difference}
    </span>
  )
}

function EmptyState({ hasRawResults }: { hasRawResults: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-8 w-8"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      </div>
      <p className="text-base font-medium text-gray-700">
        {hasRawResults ? 'لا توجد نتائج مطابقة للتصفية' : 'لا توجد نتائج بعد'}
      </p>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        {hasRawResults
          ? 'جرّب تعديل معايير التصفية أو مسح التصفيات النشطة.'
          : 'قم برفع الملفات ومعالجة البيانات لعرض نتائج الجرد.'}
      </p>
    </div>
  )
}

function MobileResultCard({ item }: { item: InventoryResultItem }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">{item.name}</p>
          <p className="mt-1 font-mono text-xs text-gray-500">{item.barcode}</p>
        </div>
        <StatusBadge item={item} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">اللون</p>
          <p className="font-medium text-gray-800">{item.color}</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">المقاس</p>
          <p className="font-medium text-gray-800">{item.size}</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">الرصيد النظامي</p>
          <p className="font-semibold tabular-nums text-gray-900">
            {item.systemQty.toLocaleString('ar-EG')}
          </p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">الرصيد الفعلي</p>
          <p className="font-semibold tabular-nums text-gray-900">
            {item.actualQty.toLocaleString('ar-EG')}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-gray-200 px-3 py-2">
        <span className="text-sm text-gray-600">الفرق</span>
        <DifferenceCell difference={item.difference} />
      </div>
    </article>
  )
}

function TabletResultRow({ item, index }: { item: InventoryResultItem; index: number }) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-blue-50/60',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
      )}
    >
      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
        {item.barcode}
      </td>
      <td className="max-w-[12rem] truncate px-4 py-3 text-sm font-medium text-gray-900">
        {item.name}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">{item.systemQty}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">{item.actualQty}</td>
      <td className="whitespace-nowrap px-4 py-3">
        <DifferenceCell difference={item.difference} />
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <StatusBadge item={item} />
      </td>
    </tr>
  )
}

function DesktopResultRow({ item, index }: { item: InventoryResultItem; index: number }) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-blue-50/60',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
      )}
    >
      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-gray-700">
        {item.barcode}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{item.name}</td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">{item.color}</td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">{item.size}</td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-gray-800">
        {item.systemQty.toLocaleString('ar-EG')}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-gray-800">
        {item.actualQty.toLocaleString('ar-EG')}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5">
        <DifferenceCell difference={item.difference} />
      </td>
      <td className="whitespace-nowrap px-5 py-3.5">
        <StatusBadge item={item} />
      </td>
    </tr>
  )
}

export function InventoryResultsTable({
  results,
  paginatedResults,
  filteredCount,
  hasRawResults,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: InventoryResultsTableProps) {
  const showEmpty = filteredCount === 0

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-1 border-b border-gray-100 bg-gradient-to-l from-blue-50/80 to-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">نتائج الجرد</h2>
          <p className="mt-1 text-sm text-gray-500">
            {hasRawResults
              ? `عرض ${filteredCount.toLocaleString('ar-EG')} صنف من أصل ${results.length.toLocaleString('ar-EG')}`
              : 'في انتظار معالجة البيانات'}
          </p>
        </div>
        {filteredCount > 0 && (
          <div className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800">
            {filteredCount.toLocaleString('ar-EG')} نتيجة
          </div>
        )}
      </div>

      {showEmpty ? (
        <EmptyState hasRawResults={hasRawResults} />
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            {paginatedResults.map((item) => (
              <MobileResultCard key={`${item.barcode}-${item.name}`} item={item} />
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block lg:hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                <tr>
                  {['الباركود', 'اسم الصنف', 'النظامي', 'الفعلي', 'الفرق', 'الحالة'].map(
                    (header) => (
                      <th
                        key={header}
                        className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedResults.map((item, index) => (
                  <TabletResultRow
                    key={`${item.barcode}-${item.name}`}
                    item={item}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                <tr>
                  {[
                    'الباركود',
                    'اسم الصنف',
                    'اللون',
                    'المقاس',
                    'الرصيد النظامي',
                    'الرصيد الفعلي',
                    'الفرق',
                    'الحالة',
                  ].map((header) => (
                    <th
                      key={header}
                      className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedResults.map((item, index) => (
                  <DesktopResultRow
                    key={`${item.barcode}-${item.name}`}
                    item={item}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {filteredCount > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredCount}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="rounded-b-2xl border-t border-gray-100 bg-slate-50/70"
        />
      )}
    </section>
  )
}
