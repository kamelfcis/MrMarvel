import * as XLSX from 'xlsx'
import type { InventoryResultItem } from './supabase'
import { getStatusClass } from './utils'

export async function readExcelFile(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
      }) as unknown[][]
      resolve(jsonData)
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function compareInventory(
  systemData: unknown[][],
  actualData: unknown[][]
): InventoryResultItem[] {
  const systemItems: Record<
    string,
    { name: string; color: string; size: string; systemQty: number }
  > = {}

  for (let i = 1; i < systemData.length; i++) {
    const row = systemData[i]
    if (row && row.length >= 5) {
      const barcode = row[3] ? String(row[3]) : ''
      if (barcode) {
        systemItems[barcode] = {
          name: String(row[0] || 'غير معروف'),
          color: String(row[1] || 'غير معروف'),
          size: String(row[2] || 'غير معروف'),
          systemQty: parseInt(String(row[4])) || 0,
        }
      }
    }
  }

  const actualItems: Record<string, { actualQty: number }> = {}

  for (let i = 1; i < actualData.length; i++) {
    const row = actualData[i]
    if (row && row.length >= 2) {
      const barcode = row[0] ? String(row[0]) : ''
      const qty = parseInt(String(row[1])) || 0
      if (barcode) {
        if (actualItems[barcode]) {
          actualItems[barcode].actualQty += qty
        } else {
          actualItems[barcode] = { actualQty: qty }
        }
      }
    }
  }

  const results: InventoryResultItem[] = []

  for (const barcode in systemItems) {
    const systemItem = systemItems[barcode]
    const actualItem = actualItems[barcode] || { actualQty: 0 }
    const difference = actualItem.actualQty - systemItem.systemQty
    let status = ''
    let statusType: InventoryResultItem['statusType'] = 'matched'

    if (difference === 0) {
      status = 'متطابق'
      statusType = 'matched'
    } else if (difference > 0) {
      status = `زيادة ${Math.abs(difference)}`
      statusType = 'increase'
    } else {
      status = `نقص ${Math.abs(difference)}`
      statusType = 'decrease'
    }

    results.push({
      barcode,
      name: systemItem.name,
      color: systemItem.color,
      size: systemItem.size,
      systemQty: systemItem.systemQty,
      actualQty: actualItem.actualQty,
      difference,
      status,
      statusClass: getStatusClass(statusType, difference),
      statusType,
    })
  }

  for (const barcode in actualItems) {
    if (!systemItems[barcode]) {
      results.push({
        barcode,
        name: 'غير مسجل في النظام',
        color: 'غير معروف',
        size: 'غير معروف',
        systemQty: 0,
        actualQty: actualItems[barcode].actualQty,
        difference: actualItems[barcode].actualQty,
        status: 'صنف جديد',
        statusClass: getStatusClass('new'),
        statusType: 'new',
      })
    }
  }

  return results
}

export function exportInventoryToExcel(
  results: InventoryResultItem[],
  branchName: string,
  groupName: string
) {
  const wsData = [
    [
      'الباركود',
      'اسم الصنف',
      'اللون',
      'المقاس',
      'الرصيد النظامي',
      'الرصيد الفعلي',
      'الفرق',
      'الحالة',
    ],
    ...results.map((item) => [
      item.barcode,
      item.name,
      item.color,
      item.size,
      item.systemQty,
      item.actualQty,
      item.difference,
      item.status,
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'نتائج الجرد')
  const fileName = `جرد_${branchName}_${groupName}_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, fileName)
}

export function computeStats(results: InventoryResultItem[]) {
  const totalItems = results.length
  const matchingItems = results.filter((item) => item.difference === 0).length
  const mismatchItems = results.filter(
    (item) => item.difference !== 0 && item.statusType !== 'new'
  ).length
  const newItems = results.filter((item) => item.statusType === 'new').length
  const totalIncrease = results
    .filter((item) => item.difference > 0)
    .reduce((sum, item) => sum + item.difference, 0)
  const totalDecrease = results
    .filter((item) => item.difference < 0)
    .reduce((sum, item) => sum + Math.abs(item.difference), 0)
  const accuracyRate =
    totalItems > 0 ? Math.round((matchingItems / totalItems) * 100) : 0

  return {
    totalItems,
    matchingItems,
    mismatchItems,
    newItems,
    totalIncrease,
    totalDecrease,
    accuracyRate,
  }
}
