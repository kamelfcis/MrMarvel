import type { InventoryCount, InventoryGroup } from './supabase'
import { BRANCHES } from './constants'
import { findGroupName } from './inventoryGroups'

export type SavedInventorySort = 'newest' | 'oldest' | 'name' | 'branch'

export interface SavedInventoryFilterState {
  searchTerm: string
  branchId: string
  groupId: string
  creatorId: string
  dateFrom: string
  dateTo: string
  sortBy: SavedInventorySort
}

export const DEFAULT_SAVED_INVENTORY_FILTERS: SavedInventoryFilterState = {
  searchTerm: '',
  branchId: 'all',
  groupId: 'all',
  creatorId: 'all',
  dateFrom: '',
  dateTo: '',
  sortBy: 'newest',
}

export const SAVED_INVENTORY_SORT_OPTIONS: { value: SavedInventorySort; label: string }[] = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'oldest', label: 'الأقدم أولاً' },
  { value: 'name', label: 'حسب الاسم' },
  { value: 'branch', label: 'حسب الفرع' },
]

function getCreatorName(inv: InventoryCount): string {
  return inv.profiles?.full_name || inv.created_by || ''
}

function matchesSearch(inv: InventoryCount, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true
  const term = searchTerm.trim().toLowerCase()
  const fields = [
    inv.name,
    inv.branches?.name,
    inv.inventory_groups?.name,
    getCreatorName(inv),
  ]
  return fields.some((field) => field?.toLowerCase().includes(term))
}

function matchesDateRange(inv: InventoryCount, dateFrom: string, dateTo: string): boolean {
  const created = new Date(inv.created_at)
  if (dateFrom) {
    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    if (created < from) return false
  }
  if (dateTo) {
    const to = new Date(dateTo)
    to.setHours(23, 59, 59, 999)
    if (created > to) return false
  }
  return true
}

function sortInventories(
  items: InventoryCount[],
  sortBy: SavedInventorySort
): InventoryCount[] {
  return [...items].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'name':
        return (a.name || '').localeCompare(b.name || '', 'ar')
      case 'branch':
        return (a.branches?.name || '').localeCompare(b.branches?.name || '', 'ar')
      default:
        return 0
    }
  })
}

export function applySavedInventoryFilters(
  inventories: InventoryCount[],
  filters: SavedInventoryFilterState
): InventoryCount[] {
  const filtered = inventories.filter((inv) => {
    if (filters.branchId !== 'all' && String(inv.branch_id) !== filters.branchId) return false
    if (filters.groupId !== 'all' && String(inv.inventory_group_id) !== filters.groupId) return false
    if (filters.creatorId !== 'all' && inv.created_by_id !== filters.creatorId) return false
    if (!matchesSearch(inv, filters.searchTerm)) return false
    if (!matchesDateRange(inv, filters.dateFrom, filters.dateTo)) return false
    return true
  })

  return sortInventories(filtered, filters.sortBy)
}

export function countSavedInventoryActiveFilters(filters: SavedInventoryFilterState): number {
  let count = 0
  if (filters.searchTerm.trim()) count += 1
  if (filters.branchId !== 'all') count += 1
  if (filters.groupId !== 'all') count += 1
  if (filters.creatorId !== 'all') count += 1
  if (filters.dateFrom) count += 1
  if (filters.dateTo) count += 1
  if (filters.sortBy !== DEFAULT_SAVED_INVENTORY_FILTERS.sortBy) count += 1
  return count
}

export interface SavedFilterChip {
  key: string
  label: string
}

export function getSavedInventoryFilterChips(
  filters: SavedInventoryFilterState,
  creatorName?: string,
  inventoryGroups: InventoryGroup[] = []
): SavedFilterChip[] {
  const chips: SavedFilterChip[] = []

  if (filters.searchTerm.trim()) {
    chips.push({ key: 'searchTerm', label: `بحث: ${filters.searchTerm.trim()}` })
  }
  if (filters.branchId !== 'all') {
    const branchName = BRANCHES.find((b) => String(b.id) === filters.branchId)?.name
    chips.push({ key: 'branchId', label: `الفرع: ${branchName ?? filters.branchId}` })
  }
  if (filters.groupId !== 'all') {
    const groupName = findGroupName(inventoryGroups, filters.groupId)
    chips.push({ key: 'groupId', label: `المجموعة: ${groupName ?? filters.groupId}` })
  }
  if (filters.creatorId !== 'all') {
    chips.push({ key: 'creatorId', label: `المنشئ: ${creatorName ?? 'محدد'}` })
  }
  if (filters.dateFrom) {
    chips.push({ key: 'dateFrom', label: `من: ${filters.dateFrom}` })
  }
  if (filters.dateTo) {
    chips.push({ key: 'dateTo', label: `إلى: ${filters.dateTo}` })
  }
  if (filters.sortBy !== DEFAULT_SAVED_INVENTORY_FILTERS.sortBy) {
    const sortLabel =
      SAVED_INVENTORY_SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ?? filters.sortBy
    chips.push({ key: 'sortBy', label: `الترتيب: ${sortLabel}` })
  }

  return chips
}

export function clearSavedInventoryFilterKey(
  filters: SavedInventoryFilterState,
  key: string
): SavedInventoryFilterState {
  switch (key) {
    case 'searchTerm':
      return { ...filters, searchTerm: '' }
    case 'branchId':
      return { ...filters, branchId: 'all' }
    case 'groupId':
      return { ...filters, groupId: 'all' }
    case 'creatorId':
      return { ...filters, creatorId: 'all' }
    case 'dateFrom':
      return { ...filters, dateFrom: '' }
    case 'dateTo':
      return { ...filters, dateTo: '' }
    case 'sortBy':
      return { ...filters, sortBy: DEFAULT_SAVED_INVENTORY_FILTERS.sortBy }
    default:
      return filters
  }
}

export function extractSavedInventoryCreators(
  inventories: InventoryCount[]
): { id: string; name: string }[] {
  const map = new Map<string, string>()

  for (const inv of inventories) {
    if (!inv.created_by_id) continue
    if (!map.has(inv.created_by_id)) {
      map.set(inv.created_by_id, getCreatorName(inv) || 'غير معروف')
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'))
}
