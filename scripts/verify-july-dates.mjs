/**
 * Verify July sales Excel date parsing (m/d/yy format).
 *
 * Usage:
 *   node --experimental-strip-types scripts/verify-july-dates.mjs "path/to/july.xlsx"
 */

import fs from 'node:fs'
import process from 'node:process'
import XLSX from 'xlsx'
import {
  SALES_XLSX_READ_OPTS,
  parseSaleDate,
  parseSalesWorkbook,
  saleDateValueFromCell,
  transformSalesRawRows,
} from '../src/lib/salesImport.ts'

const filePath =
  process.argv[2] ??
  'C:\\Users\\Administrator\\Downloads\\تقرير صافى المبيعات شهر 7.xlsx'

if (!fs.existsSync(filePath)) {
  console.error('File not found:', filePath)
  process.exit(1)
}

const buffer = fs.readFileSync(filePath)
const workbook = XLSX.read(buffer, SALES_XLSX_READ_OPTS)
const { sheetName, rawRows } = parseSalesWorkbook(workbook)
const { rows } = transformSalesRawRows(rawRows)

let nullDates = 0
for (const row of rows) {
  if (!row.sale_date) nullDates += 1
}

// Simulate old behavior: always format serials as dd/mm/yyyy
const sheet = workbook.Sheets[sheetName]
const ref = sheet['!ref']
const range = XLSX.utils.decode_range(ref)
let dateCol = -1
for (let c = range.s.c; c <= range.e.c; c++) {
  const headerCell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c })]
  if (headerCell && String(headerCell.v).trim() === 'التاريخ') {
    dateCol = c
    break
  }
}

let oldNullDates = 0
for (let i = 0; i < rawRows.length; i++) {
  const rowIndex = range.s.r + 1 + i
  const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: dateCol })]
  let value = null
  if (cell?.t === 'n' && typeof cell.v === 'number' && XLSX.SSF?.format) {
    value = XLSX.SSF.format('dd/mm/yyyy', cell.v)
  } else {
    value = cell?.w ?? cell?.v ?? null
  }
  if (!parseSaleDate(value)) oldNullDates += 1
}

// Sample cells
const samples = [
  { label: '7/1/26', serial: 46204 },
  { label: '7/13/26', serial: 46216 },
]
console.log('Sheet:', sheetName)
console.log('Total rows:', rows.length)
console.log('Null sale_date (old dd/mm hack):', oldNullDates)
console.log('Null sale_date (fixed):', nullDates)

for (const { label, serial } of samples) {
  const cell = Object.values(sheet).find(
    (c) => c && typeof c === 'object' && c.t === 'n' && c.v === serial,
  )
  const formatted = saleDateValueFromCell(cell)
  const parsed = parseSaleDate(formatted)
  console.log(`Sample ${label}: cell.w=${cell?.w ?? '—'} → ${formatted} → ${parsed}`)
}

if (nullDates > 0) {
  console.error('FAIL: expected 0 null sale_date rows')
  process.exit(1)
}

console.log('PASS: all sale dates parsed successfully')
