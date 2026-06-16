import type { InventoryResultItem } from './supabase'

export type StatusFilter = 'all' | 'matched' | 'increase' | 'decrease' | 'new'

export type SortField = 'name' | 'barcode' | 'difference' | 'status'
export type SortDirection = 'asc' | 'desc'

export interface InventoryFilterState {
  searchTerm: string
  statusFilter: StatusFilter
  branchId: string
  groupId: string
  minDifference: string
  maxDifference: string
  sortField: SortField
  sortDirection: SortDirection
}

export interface InventoryContext {
  branchId: number
  inventoryGroupId: number
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFilterState = {
  searchTerm: '',
  statusFilter: 'all',
  branchId: 'all',
  groupId: 'all',
  minDifference: '',
  maxDifference: '',
  sortField: 'barcode',
  sortDirection: 'asc',
}

export const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'matched', label: 'متطابقة' },
  { value: 'increase', label: 'زيادة' },
  { value: 'decrease', label: 'نقص' },
  { value: 'new', label: 'جديدة' },
]

export const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name', label: 'اسم الصنف' },
  { value: 'barcode', label: 'الباركود' },
  { value: 'difference', label: 'الفرق' },
  { value: 'status', label: 'الحالة' },
]

const STATUS_ORDER: Record<InventoryResultItem['statusType'], number> = {
  matched: 0,
  increase: 1,
  decrease: 2,
  new: 3,
}

function matchesStatus(item: InventoryResultItem, statusFilter: StatusFilter): boolean {
  if (statusFilter === 'all') return true
  return item.statusType === statusFilter
}

function matchesSearch(item: InventoryResultItem, searchTerm: string): boolean {
  if (!searchTerm.trim()) return true
  const term = searchTerm.trim().toLowerCase()
  return (
    item.barcode.toLowerCase().includes(term) ||
    item.name.toLowerCase().includes(term)
  )
}

function matchesDifferenceRange(
  item: InventoryResultItem,
  minDifference: string,
  maxDifference: string
): boolean {
  const min = minDifference.trim() === '' ? null : Number(minDifference)
  const max = maxDifference.trim() === '' ? null : Number(maxDifference)

  if (min !== null && !Number.isNaN(min) && item.difference < min) return false
  if (max !== null && !Number.isNaN(max) && item.difference > max) return false
  return true
}

function matchesInventoryContext(
  context: InventoryContext | null | undefined,
  branchId: string,
  groupId: string
): boolean {
  if (!context) return true
  if (branchId !== 'all' && String(context.branchId) !== branchId) return false
  if (groupId !== 'all' && String(context.inventoryGroupId) !== groupId) return false
  return true
}

function compareItems(
  a: InventoryResultItem,
  b: InventoryResultItem,
  sortField: SortField,
  sortDirection: SortDirection
): number {
  let comparison = 0

  switch (sortField) {
    case 'name':
      comparison = a.name.localeCompare(b.name, 'ar')
      break
    case 'barcode':
      comparison = a.barcode.localeCompare(b.barcode, 'ar')
      break
    case 'difference':
      comparison = a.difference - b.difference
      break
    case 'status':
      comparison = STATUS_ORDER[a.statusType] - STATUS_ORDER[b.statusType]
      break
  }

  return sortDirection === 'asc' ? comparison : -comparison
}

export function applyInventoryFilters(
  results: InventoryResultItem[],
  filters: InventoryFilterState,
  context?: InventoryContext | null
): InventoryResultItem[] {
  if (!matchesInventoryContext(context, filters.branchId, filters.groupId)) {
    return []
  }

  const filtered = results.filter(
    (item) =>
      matchesStatus(item, filters.statusFilter) &&
      matchesSearch(item, filters.searchTerm) &&
      matchesDifferenceRange(item, filters.minDifference, filters.maxDifference)
  )

  return [...filtered].sort((a, b) =>
    compareItems(a, b, filters.sortField, filters.sortDirection)
  )
}

export function countActiveFilters(filters: InventoryFilterState): number {
  let count = 0
  if (filters.searchTerm.trim()) count += 1
  if (filters.statusFilter !== 'all') count += 1
  if (filters.branchId !== 'all') count += 1
  if (filters.groupId !== 'all') count += 1
  if (filters.minDifference.trim()) count += 1
  if (filters.maxDifference.trim()) count += 1
  if (
    filters.sortField !== DEFAULT_INVENTORY_FILTERS.sortField ||
    filters.sortDirection !== DEFAULT_INVENTORY_FILTERS.sortDirection
  ) {
    count += 1
  }
  return count
}

export interface FilterChip {
  key: string
  label: string
}

export function getActiveFilterChips(
  filters: InventoryFilterState,
  branchName?: string,
  groupName?: string
): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.searchTerm.trim()) {
    chips.push({ key: 'searchTerm', label: `بحث: ${filters.searchTerm.trim()}` })
  }
  if (filters.statusFilter !== 'all') {
    const statusLabel =
      STATUS_FILTER_OPTIONS.find((option) => option.value === filters.statusFilter)?.label ??
      filters.statusFilter
    chips.push({ key: 'statusFilter', label: `الحالة: ${statusLabel}` })
  }
  if (filters.branchId !== 'all') {
    chips.push({
      key: 'branchId',
      label: `الفرع: ${branchName ?? filters.branchId}`,
    })
  }
  if (filters.groupId !== 'all') {
    chips.push({
      key: 'groupId',
      label: `المجموعة: ${groupName ?? filters.groupId}`,
    })
  }
  if (filters.minDifference.trim()) {
    chips.push({ key: 'minDifference', label: `الحد الأدنى للفرق: ${filters.minDifference}` })
  }
  if (filters.maxDifference.trim()) {
    chips.push({ key: 'maxDifference', label: `الحد الأقصى للفرق: ${filters.maxDifference}` })
  }
  if (
    filters.sortField !== DEFAULT_INVENTORY_FILTERS.sortField ||
    filters.sortDirection !== DEFAULT_INVENTORY_FILTERS.sortDirection
  ) {
    const sortLabel =
      SORT_FIELD_OPTIONS.find((option) => option.value === filters.sortField)?.label ??
      filters.sortField
    const directionLabel = filters.sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي'
    chips.push({ key: 'sort', label: `الترتيب: ${sortLabel} (${directionLabel})` })
  }

  return chips
}

export function clearFilterKey(
  filters: InventoryFilterState,
  key: string
): InventoryFilterState {
  switch (key) {
    case 'searchTerm':
      return { ...filters, searchTerm: '' }
    case 'statusFilter':
      return { ...filters, statusFilter: 'all' }
    case 'branchId':
      return { ...filters, branchId: 'all' }
    case 'groupId':
      return { ...filters, groupId: 'all' }
    case 'minDifference':
      return { ...filters, minDifference: '' }
    case 'maxDifference':
      return { ...filters, maxDifference: '' }
    case 'sort':
      return {
        ...filters,
        sortField: DEFAULT_INVENTORY_FILTERS.sortField,
        sortDirection: DEFAULT_INVENTORY_FILTERS.sortDirection,
      }
    default:
      return filters
  }
}
