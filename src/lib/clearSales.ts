import { supabase } from './supabase'

export type ClearSalesResult = {
  clearedDiscountFlags: boolean
  clearedSalesDetails: boolean
}

/**
 * Delete all invoice import data (discount_flags then sales_details).
 * Does not touch promotions — mirrors scripts/clear-sales.mjs.
 */
export async function clearAllSalesData(): Promise<ClearSalesResult> {
  const { error: flagsError } = await supabase
    .from('discount_flags')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (flagsError) {
    throw new Error(`فشل مسح علامات الخصم: ${flagsError.message}`)
  }

  const { error: salesError } = await supabase.from('sales_details').delete().gte('id', 0)

  if (salesError) {
    throw new Error(`فشل مسح بيانات الفواتير: ${salesError.message}`)
  }

  return { clearedDiscountFlags: true, clearedSalesDetails: true }
}
