import { supabase } from './supabase'

const PAGE_SIZE = 1000

async function fetchDistinctColumn(
  column: 'item_name' | 'item_category'
): Promise<string[]> {
  const values = new Set<string>()
  let from = 0

  for (;;) {
    const to = from + PAGE_SIZE - 1
    const { data, error } = await supabase
      .from('sales_details')
      .select(column)
      .not(column, 'is', null)
      .range(from, to)

    if (error) {
      console.error(`Failed to fetch distinct ${column}:`, error)
      throw error
    }

    const batch = data ?? []
    for (const row of batch) {
      const raw = (row as Record<string, string | null>)[column]
      const trimmed = typeof raw === 'string' ? raw.trim() : ''
      if (trimmed) values.add(trimmed)
    }

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return Array.from(values).sort((a, b) => a.localeCompare(b, 'ar'))
}

/** Distinct item names from imported sales_details (exact Excel strings). */
export function fetchDistinctItemNames(): Promise<string[]> {
  return fetchDistinctColumn('item_name')
}

/** Distinct item categories from imported sales_details (exact Excel strings). */
export function fetchDistinctItemCategories(): Promise<string[]> {
  return fetchDistinctColumn('item_category')
}
