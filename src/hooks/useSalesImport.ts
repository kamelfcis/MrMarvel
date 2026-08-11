import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  SALES_BATCH_SIZE,
  SALES_EXPECTED_HEADERS,
  SALES_XLSX_READ_OPTS,
  salesDedupeKey,
  readSalesExcelFile,
  validateSalesColumns,
  formatSalesImportHeadline,
  formatSalesImportToast,
  type SalesDetailInsert,
  type SalesImportSummary,
} from '../lib/salesImport'
import { clearAllSalesData } from '../lib/clearSales'
import { scanDiscountFlagsForInvoices } from '../lib/discountAudit'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

export type UploadProgress = {
  phase: 'idle' | 'parsing' | 'deduping' | 'inserting' | 'done' | 'error'
  percent: number
  message: string
}

const initialProgress: UploadProgress = {
  phase: 'idle',
  percent: 0,
  message: '',
}

async function fetchExistingDedupeKeys(invoiceNumbers: string[]): Promise<Set<string>> {
  const keys = new Set<string>()
  const uniqueInvoices = [...new Set(invoiceNumbers.filter(Boolean))]
  const chunkSize = 100

  for (let i = 0; i < uniqueInvoices.length; i += chunkSize) {
    const chunk = uniqueInvoices.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('sales_details')
      .select('invoice_number, item_name, color, size, sold_qty')
      .in('invoice_number', chunk)

    if (error) throw error
    for (const row of data ?? []) {
      keys.add(salesDedupeKey(row as SalesDetailInsert))
    }
  }

  return keys
}

async function insertSalesBatches(
  rows: SalesDetailInsert[],
  onProgress: (inserted: number, total: number) => void,
): Promise<number> {
  let inserted = 0
  for (let i = 0; i < rows.length; i += SALES_BATCH_SIZE) {
    const batch = rows.slice(i, i + SALES_BATCH_SIZE)
    const { error } = await supabase.from('sales_details').insert(batch)
    if (error) throw error
    inserted += batch.length
    onProgress(inserted, rows.length)
  }
  return inserted
}

export function useSalesImport(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [progress, setProgress] = useState<UploadProgress>(initialProgress)
  const [lastSummary, setLastSummary] = useState<SalesImportSummary | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true)
      setLastSummary(null)
      setProgress({ phase: 'parsing', percent: 5, message: 'جاري قراءة الملف...' })

      try {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, SALES_XLSX_READ_OPTS)
        const sheetName = workbook.SheetNames.includes('Sheet1')
          ? 'Sheet1'
          : workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const headerRow = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })[0] ?? []
        const headers = headerRow.map((h) => String(h).trim())
        const validation = validateSalesColumns(headers)

        if (!validation.valid) {
          toast.error(`أعمدة ناقصة: ${validation.missing.slice(0, 3).join('، ')}${validation.missing.length > 3 ? '...' : ''}`)
          setProgress({ phase: 'error', percent: 0, message: 'تنسيق الملف غير صالح' })
          return
        }

        // Shared parser: cellDates false + SSF serial → YYYY-MM-DD
        const { rows, skipped, warnings } = await readSalesExcelFile(file)

        setProgress({ phase: 'deduping', percent: 25, message: 'جاري التحقق من التكرار...' })

        const existingKeys = await fetchExistingDedupeKeys(rows.map((r) => r.invoice_number!))
        const toInsert: SalesDetailInsert[] = []
        let skippedDuplicate = 0

        for (const row of rows) {
          const key = salesDedupeKey(row)
          if (existingKeys.has(key)) {
            skippedDuplicate += 1
            continue
          }
          existingKeys.add(key)
          toInsert.push(row)
        }

        if (toInsert.length === 0) {
          const summary: SalesImportSummary = {
            added: 0,
            skippedMissingInvoice: skipped,
            skippedDuplicate,
            warnings,
          }
          setLastSummary(summary)
          const headline = formatSalesImportHeadline(summary)
          setProgress({ phase: 'done', percent: 100, message: headline })
          const toastResult = formatSalesImportToast(summary)
          if (toastResult.variant === 'warning') {
            toast.warning(toastResult.message)
          } else {
            toast.info(toastResult.message)
          }
          return
        }

        setProgress({ phase: 'inserting', percent: 40, message: 'جاري رفع البيانات...' })

        const added = await insertSalesBatches(toInsert, (inserted, total) => {
          const pct = 40 + Math.round((inserted / total) * 55)
          setProgress({
            phase: 'inserting',
            percent: pct,
            message: `تم رفع ${inserted.toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')} صف`,
          })
        })

        const summary: SalesImportSummary = {
          added,
          skippedMissingInvoice: skipped,
          skippedDuplicate,
          warnings,
        }
        setLastSummary(summary)

        setProgress({
          phase: 'inserting',
          percent: 96,
          message: 'جاري فحص خصومات الكاشير...',
        })
        try {
          const invoiceNumbers = [
            ...new Set(toInsert.map((r) => r.invoice_number).filter(Boolean) as string[]),
          ]
          const scan = await scanDiscountFlagsForInvoices(invoiceNumbers)
          if (scan.flagged > 0) {
            toast.warning(
              `تنبيه خصم: ${scan.flagged.toLocaleString('ar-EG')} سطر مشبوه بعد الاستيراد`,
            )
          }
        } catch (scanErr) {
          console.error(scanErr)
          toast.warning('تم الاستيراد لكن فشل فحص الخصومات — يمكن إعادة الفحص لاحقاً')
        }

        const headline = formatSalesImportHeadline(summary)
        setProgress({ phase: 'done', percent: 100, message: headline })
        const toastResult = formatSalesImportToast(summary)
        if (toastResult.variant === 'success') {
          toast.success(toastResult.message)
        } else if (toastResult.variant === 'warning') {
          toast.warning(toastResult.message)
        } else {
          toast.info(toastResult.message)
        }
        onSuccess?.()
      } catch (err) {
        console.error(err)
        const message = err instanceof Error ? err.message : 'فشل رفع الملف'
        setProgress({ phase: 'error', percent: 0, message })
        toast.error(message)
      } finally {
        setUploading(false)
      }
    },
    [onSuccess],
  )

  const resetProgress = useCallback(() => {
    setProgress(initialProgress)
    setLastSummary(null)
  }, [])

  const clearAllSales = useCallback(async () => {
    setClearing(true)
    try {
      await clearAllSalesData()
      resetProgress()
      toast.success('تم مسح كل بيانات جرد الفواتير')
      onSuccess?.()
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'فشل مسح البيانات'
      toast.error(message)
      throw err
    } finally {
      setClearing(false)
    }
  }, [onSuccess, resetProgress])

  return {
    uploading,
    clearing,
    progress,
    lastSummary,
    uploadFile,
    clearAllSales,
    resetProgress,
    expectedHeaders: SALES_EXPECTED_HEADERS,
  }
}
