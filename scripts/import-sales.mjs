/**
 * Import sales Excel (Sheet1) into public.sales_details.
 *
 * Usage:
 *   node --env-file=.env scripts/import-sales.mjs
 *   node --env-file=.env scripts/import-sales.mjs "New Microsoft Excel Worksheet (4).xlsx"
 *   npm run import:sales
 *   npm run import:sales -- "path/to/file.xlsx"
 *
 * Env:
 *   SUPABASE_URL (fallback: VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Default mode replaces all rows. Pass --append to skip delete and dedupe before insert.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import {
  SALES_BATCH_SIZE,
  SALES_XLSX_READ_OPTS,
  parseSalesWorkbook,
  salesDedupeKey,
  transformSalesRawRows,
} from '../src/lib/salesImport.ts'

const DEFAULT_FILE = 'New Microsoft Excel Worksheet (4).xlsx'

function resolveEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) in environment / .env')
    process.exit(1)
  }
  if (!key) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment / .env')
    console.error('Get it from: Supabase Dashboard → Project Settings → API → service_role')
    process.exit(1)
  }
  return { url, key }
}

function invoicePrefix(invoiceNumber) {
  const m = String(invoiceNumber).match(/^(\d+-\d+)/)
  return m ? m[1] : '(other)'
}

async function deleteAllRows(supabase) {
  const { error } = await supabase.from('sales_details').delete().gte('id', 0)
  if (error) {
    throw new Error(`Failed to delete existing sales_details rows: ${error.message}`)
  }
}

async function fetchExistingDedupeKeys(supabase, invoiceNumbers) {
  const keys = new Set()
  const uniqueInvoices = [...new Set(invoiceNumbers.filter(Boolean))]
  const chunkSize = 100

  for (let i = 0; i < uniqueInvoices.length; i += chunkSize) {
    const chunk = uniqueInvoices.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('sales_details')
      .select('invoice_number, item_name, color, size, sold_qty')
      .in('invoice_number', chunk)

    if (error) throw new Error(`Dedupe lookup failed: ${error.message}`)
    for (const row of data ?? []) {
      keys.add(salesDedupeKey(row))
    }
  }

  return keys
}

async function insertBatches(supabase, rows) {
  let inserted = 0
  for (let i = 0; i < rows.length; i += SALES_BATCH_SIZE) {
    const batch = rows.slice(i, i + SALES_BATCH_SIZE)
    const { error } = await supabase.from('sales_details').insert(batch)
    if (error) {
      throw new Error(
        `Insert failed at batch starting index ${i} (size ${batch.length}): ${error.message}`,
      )
    }
    inserted += batch.length
    console.log(`Inserted batch ${Math.floor(i / SALES_BATCH_SIZE) + 1}: ${batch.length} rows (total ${inserted})`)
  }
  return inserted
}

async function main() {
  const { url, key } = resolveEnv()
  const appendMode = process.argv.includes('--append')
  const fileArg = process.argv.find((arg) => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1])
  const filePath = path.resolve(process.cwd(), fileArg || DEFAULT_FILE)

  if (!fs.existsSync(filePath)) {
    console.error(`Excel file not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Reading: ${filePath}`)
  const workbook = XLSX.readFile(filePath, SALES_XLSX_READ_OPTS)
  const { sheetName, rawRows } = parseSalesWorkbook(workbook)
  console.log(`Sheet "${sheetName}": ${rawRows.length} data rows`)

  const { rows: mapped, skipped, warnings } = transformSalesRawRows(rawRows)

  const saleDateCounts = new Map()
  for (const row of mapped) {
    const d = row.sale_date || '(null)'
    saleDateCounts.set(d, (saleDateCounts.get(d) || 0) + 1)
  }
  console.log('sale_date distribution (parsed):')
  for (const [d, count] of [...saleDateCounts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
    console.log(`  ${d}: ${count}`)
  }

  const prefixCounts = new Map()
  for (const row of mapped) {
    const p = invoicePrefix(row.invoice_number)
    prefixCounts.set(p, (prefixCounts.get(p) || 0) + 1)
  }

  console.log('invoice_number prefix distribution after rebuild:')
  for (const [prefix, count] of [...prefixCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${prefix}: ${count}`)
  }
  console.log(`invoice_number warnings: ${warnings.length}`)
  for (const w of warnings.slice(0, 20)) console.warn(`  WARN: ${w}`)
  if (warnings.length > 20) console.warn(`  ... and ${warnings.length - 20} more`)

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let skippedDuplicate = 0
  let toInsert = mapped

  if (appendMode) {
    console.log('Append mode: checking duplicates...')
    const existingKeys = await fetchExistingDedupeKeys(
      supabase,
      mapped.map((r) => r.invoice_number),
    )
    toInsert = []
    for (const row of mapped) {
      const key = salesDedupeKey(row)
      if (existingKeys.has(key)) {
        skippedDuplicate += 1
        continue
      }
      existingKeys.add(key)
      toInsert.push(row)
    }
    console.log(`Skipped duplicates: ${skippedDuplicate}`)
  } else {
    console.log('Deleting existing sales_details rows...')
    await deleteAllRows(supabase)
  }

  console.log(`Inserting ${toInsert.length} rows in batches of ${SALES_BATCH_SIZE}...`)
  const inserted = await insertBatches(supabase, toInsert)

  const { count: totalRows, error: countErr } = await supabase
    .from('sales_details')
    .select('*', { count: 'exact', head: true })
  if (countErr) throw new Error(`count(*) failed: ${countErr.message}`)

  const { data: invoiceRows, error: invErr } = await supabase
    .from('sales_details')
    .select('invoice_number')
  if (invErr) throw new Error(`invoice distinct query failed: ${invErr.message}`)
  const totalInvoices = new Set(invoiceRows.map((r) => r.invoice_number)).size

  const { data: mobileSample } = await supabase
    .from('sales_details')
    .select('customer_mobile')
    .not('customer_mobile', 'is', null)
    .limit(5)

  console.log('---')
  console.log(`Inserted: ${inserted}`)
  console.log(`Skipped (missing invoice_number): ${skipped}`)
  console.log(`Skipped (duplicate): ${skippedDuplicate}`)
  console.log(`Warnings (invoice_number): ${warnings.length}`)
  console.log(`total_rows=${totalRows} total_invoices=${totalInvoices}`)
  console.log(
    'mobile sample:',
    (mobileSample || []).map((r) => r.customer_mobile).join(', ') || '(none)',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
