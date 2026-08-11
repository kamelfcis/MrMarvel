import type { NamedValue } from '../../lib/invoiceStats'
import { cn } from '../ui/utils'

export type StatsAccent = 'blue' | 'green' | 'amber' | 'teal' | 'rose' | 'indigo'

export type StatsValueFormat = 'currency' | 'qty' | 'count'

export type StatsColumn = {
  key: 'label' | 'meta' | 'value'
  header: string
  align?: 'start' | 'end'
  dir?: 'ltr' | 'rtl'
}

const ACCENT = {
  blue: {
    header: 'from-blue-600/90 to-blue-500/80',
    bar: 'bg-blue-500',
    pill: 'bg-blue-100 text-blue-800 border-blue-200',
    soft: 'bg-blue-50/60',
    ring: 'ring-blue-200',
  },
  green: {
    header: 'from-green-600/90 to-green-500/80',
    bar: 'bg-green-500',
    pill: 'bg-green-100 text-green-800 border-green-200',
    soft: 'bg-green-50/60',
    ring: 'ring-green-200',
  },
  amber: {
    header: 'from-amber-600/90 to-amber-500/80',
    bar: 'bg-amber-500',
    pill: 'bg-amber-100 text-amber-900 border-amber-200',
    soft: 'bg-amber-50/60',
    ring: 'ring-amber-200',
  },
  teal: {
    header: 'from-teal-600/90 to-teal-500/80',
    bar: 'bg-teal-500',
    pill: 'bg-teal-100 text-teal-800 border-teal-200',
    soft: 'bg-teal-50/60',
    ring: 'ring-teal-200',
  },
  rose: {
    header: 'from-rose-600/90 to-rose-500/80',
    bar: 'bg-rose-500',
    pill: 'bg-rose-100 text-rose-800 border-rose-200',
    soft: 'bg-rose-50/60',
    ring: 'ring-rose-200',
  },
  indigo: {
    header: 'from-indigo-600/90 to-indigo-500/80',
    bar: 'bg-indigo-500',
    pill: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    soft: 'bg-indigo-50/60',
    ring: 'ring-indigo-200',
  },
} as const

function formatValue(value: number, format: StatsValueFormat) {
  if (format === 'currency') {
    return `${value.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`
  }
  return value.toLocaleString('ar-EG')
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-bold text-amber-950 shadow-sm ring-1 ring-amber-400/50">
        1
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-400 text-xs font-bold text-slate-800 shadow-sm ring-1 ring-slate-400/40">
        2
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-500 text-xs font-bold text-orange-950 shadow-sm ring-1 ring-orange-400/50">
        3
      </span>
    )
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
      {rank}
    </span>
  )
}

function ValueCell({
  value,
  max,
  format,
  accent,
  showBar,
}: {
  value: number
  max: number
  format: StatsValueFormat
  accent: StatsAccent
  showBar: boolean
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="min-w-[8rem]">
      <div className="font-semibold tabular-nums text-slate-900">{formatValue(value, format)}</div>
      {showBar && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full rounded-full transition-all', ACCENT[accent].bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export function StatsDataTable({
  title,
  rows,
  columns,
  valueFormat = 'currency',
  accent = 'blue',
  emptyMessage = 'لا توجد بيانات في الفترة المحددة',
  className,
}: {
  title: string
  rows: NamedValue[]
  columns: StatsColumn[]
  valueFormat?: StatsValueFormat
  accent?: StatsAccent
  emptyMessage?: string
  className?: string
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0)
  const tones = ACCENT[accent]
  const hasMetaCol = columns.some((c) => c.key === 'meta')

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
        className,
      )}
      dir="rtl"
    >
      <div className={cn('bg-gradient-to-l px-5 py-3.5 text-white', tones.header)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
            {rows.length.toLocaleString('ar-EG')} صف
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex items-center justify-center px-6 py-16 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="max-h-[32rem] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className={cn('border-b border-slate-200 text-slate-600', tones.soft)}>
                    <th className="w-14 px-4 py-3 text-center font-semibold">#</th>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={cn(
                          'px-4 py-3 font-semibold',
                          col.align === 'end' ? 'text-left' : 'text-right',
                        )}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const rank = idx + 1
                    return (
                      <tr
                        key={`${row.label}-${row.meta ?? ''}-${idx}`}
                        className={cn(
                          'border-b border-slate-100 transition-colors hover:bg-slate-50/90',
                          idx % 2 === 1 && 'bg-slate-50/50',
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <RankBadge rank={rank} />
                        </td>
                        {columns.map((col) => {
                          if (col.key === 'value') {
                            return (
                              <td key={col.key} className="px-4 py-3 text-left">
                                <ValueCell
                                  value={row.value}
                                  max={max}
                                  format={valueFormat}
                                  accent={accent}
                                  showBar
                                />
                              </td>
                            )
                          }
                          const text = col.key === 'meta' ? (row.meta ?? '—') : row.label
                          return (
                            <td
                              key={col.key}
                              className={cn(
                                'px-4 py-3 text-slate-800',
                                col.align === 'end' ? 'text-left' : 'text-right',
                              )}
                              dir={col.dir}
                            >
                              {text}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2.5 p-3 md:hidden">
            {rows.map((row, idx) => {
              const rank = idx + 1
              const pct = max > 0 ? Math.max(0, Math.min(100, (row.value / max) * 100)) : 0
              return (
                <div
                  key={`m-${row.label}-${row.meta ?? ''}-${idx}`}
                  className={cn(
                    'rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-3.5 shadow-sm ring-1',
                    tones.ring,
                  )}
                >
                  <div className="flex items-start gap-3">
                    <RankBadge rank={rank} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className="truncate font-semibold text-slate-900"
                            dir={columns.find((c) => c.key === 'label')?.dir}
                          >
                            {row.label}
                          </p>
                          {hasMetaCol && row.meta && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">{row.meta}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
                            tones.pill,
                          )}
                        >
                          {formatValue(row.value, valueFormat)}
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', tones.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
