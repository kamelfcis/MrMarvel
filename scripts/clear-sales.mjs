/**
 * Clear all invoice/sales import data (invoice inventory).
 * Removes rows from discount_flags and sales_details. Does not touch promotions.
 *
 * Usage:
 *   node --env-file=.env scripts/clear-sales.mjs
 *   npm run clear:sales
 *
 * Env:
 *   SUPABASE_URL (fallback: VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

function resolveEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) in environment / .env')
    process.exit(1)
  }
  if (!key) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY in environment / .env')
    process.exit(1)
  }
  return { url, key }
}

async function countTable(supabase, table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

async function deleteAllDiscountFlags(supabase) {
  const { error } = await supabase
    .from('discount_flags')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(`discount_flags delete failed: ${error.message}`)
}

async function deleteAllSalesDetails(supabase) {
  const { error } = await supabase.from('sales_details').delete().gte('id', 0)
  if (error) throw new Error(`sales_details delete failed: ${error.message}`)
}

const { url, key } = resolveEnv()
const supabase = createClient(url, key)

const beforeSales = await countTable(supabase, 'sales_details')
const beforeFlags = await countTable(supabase, 'discount_flags')
const beforePromos = await countTable(supabase, 'promotions')

console.log('Before:', { sales_details: beforeSales, discount_flags: beforeFlags, promotions: beforePromos })

await deleteAllDiscountFlags(supabase)
await deleteAllSalesDetails(supabase)

const afterSales = await countTable(supabase, 'sales_details')
const afterFlags = await countTable(supabase, 'discount_flags')
const afterPromos = await countTable(supabase, 'promotions')

console.log('After:', { sales_details: afterSales, discount_flags: afterFlags, promotions: afterPromos })

if (afterSales !== 0 || afterFlags !== 0) {
  console.error('Clear incomplete — verify RLS/service role and retry.')
  process.exit(1)
}

console.log('Done. Re-import with: npm run import:sales')