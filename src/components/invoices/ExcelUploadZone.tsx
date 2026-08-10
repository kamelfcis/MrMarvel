import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { cn } from '../ui/utils'
import {
  formatSalesImportHeadline,
  isFullDuplicateImport,
  type SalesImportSummary,
} from '../../lib/salesImport'
import type { UploadProgress } from '../../hooks/useSalesImport'

type ExcelUploadZoneProps = {
  uploading: boolean
  progress: UploadProgress
  lastSummary: SalesImportSummary | null
  onUpload: (file: File) => void
  onReset: () => void
}

export function ExcelUploadZone({
  uploading,
  progress,
  lastSummary,
  onUpload,
  onReset,
}: ExcelUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') return
    onUpload(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const fullDuplicate = lastSummary ? isFullDuplicateImport(lastSummary) : false
  const partialSuccess =
    lastSummary != null && lastSummary.added > 0 && lastSummary.skippedDuplicate > 0

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
          dragOver ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-white',
          uploading && 'pointer-events-none opacity-70',
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700">
          <FileSpreadsheet className="h-7 w-7" />
        </div>
        <p className="text-base font-medium text-gray-900">رفع ملف Excel للفواتير</p>
        <p className="mt-1 text-sm text-gray-500">
          اسحب الملف هنا أو اختر ملفاً بصيغة Sheet1 المتوافقة مع النظام
        </p>
        <Button
          type="button"
          className="mt-4"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          اختيار ملف
        </Button>
      </div>

      {uploading && progress.phase !== 'idle' && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-gray-700">{progress.message}</span>
            <span className="font-medium text-blue-700">{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
        </div>
      )}

      {lastSummary && !uploading && (
        <div
          className={cn(
            'rounded-xl border p-4 shadow-sm',
            fullDuplicate
              ? 'border-amber-300 bg-amber-50/80'
              : partialSuccess
                ? 'border-blue-200 bg-white'
                : lastSummary.added > 0
                  ? 'border-green-200 bg-white'
                  : 'border-gray-200 bg-white',
          )}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              {fullDuplicate ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              ) : lastSummary.added > 0 ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : null}
              <div>
                <h3 className="font-semibold text-gray-900">ملخص الرفع</h3>
                <p
                  className={cn(
                    'mt-1 text-sm font-medium',
                    fullDuplicate ? 'text-amber-800' : 'text-gray-700',
                  )}
                >
                  {formatSalesImportHeadline(lastSummary)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="إغلاق الملخص"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg bg-green-50 px-3 py-2">
              <dt className="text-green-700">صفوف مضافة</dt>
              <dd className="text-lg font-bold text-green-900">
                {lastSummary.added.toLocaleString('ar-EG')}
              </dd>
            </div>
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <dt className="text-amber-700">صفوف مكررة (مرفوضة)</dt>
              <dd className="text-lg font-bold text-amber-900">
                {lastSummary.skippedDuplicate.toLocaleString('ar-EG')}
              </dd>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-gray-600">صفوف غير صالحة</dt>
              <dd className="text-lg font-bold text-gray-900">
                {lastSummary.skippedMissingInvoice.toLocaleString('ar-EG')}
              </dd>
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <dt className="text-blue-700">تحذيرات</dt>
              <dd className="text-lg font-bold text-blue-900">
                {lastSummary.warnings.length.toLocaleString('ar-EG')}
              </dd>
            </div>
          </dl>

          {lastSummary.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <p className="font-medium">تفاصيل التحذيرات</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {lastSummary.warnings.slice(0, 5).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {lastSummary.warnings.length > 5 && (
                  <li className="list-none text-amber-700">
                    … و{lastSummary.warnings.length - 5} تحذيراً إضافياً
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
