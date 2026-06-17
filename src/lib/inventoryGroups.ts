import { supabase, type InventoryGroup } from './supabase'

export async function fetchInventoryGroups(): Promise<InventoryGroup[]> {
  const { data, error } = await supabase
    .from('inventory_groups')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) throw error
  return (data as InventoryGroup[]) ?? []
}

export function findGroupName(
  groups: InventoryGroup[],
  id: number | string | undefined
): string | undefined {
  if (id === undefined || id === '') return undefined
  return groups.find((g) => g.id === Number(id))?.name
}

export function normalizeGroupName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isDuplicateGroupName(
  groups: InventoryGroup[],
  name: string,
  excludeId?: number
): boolean {
  const normalized = normalizeGroupName(name).toLowerCase()
  return groups.some(
    (g) => g.id !== excludeId && g.name.trim().toLowerCase() === normalized
  )
}

export async function countInventoryGroupUsage(groupId: number): Promise<number> {
  const { count, error } = await supabase
    .from('inventory_counts')
    .select('*', { count: 'exact', head: true })
    .eq('inventory_group_id', groupId)

  if (error) throw error
  return count ?? 0
}

export function getInventoryGroupDeleteError(error: unknown): string | null {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === '23503'
  ) {
    return 'لا يمكن حذف هذه المجموعة لأنها مستخدمة في جرد محفوظ'
  }
  return null
}
