import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  Calendar,
  Eye,
  Filter,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import type { InventoryCount } from '../../lib/supabase'
import { BRANCHES, INVENTORY_GROUPS } from '../../lib/constants'
import {
  applySavedInventoryFilters,
  clearSavedInventoryFilterKey,
  countSavedInventoryActiveFilters,
  DEFAULT_SAVED_INVENTORY_FILTERS,
  extractSavedInventoryCreators,
  getSavedInventoryFilterChips,
  SAVED_INVENTORY_SORT_OPTIONS,
  type SavedInventoryFilterState,
} from '../../lib/savedInventoryFilters'
import { formatDate, getAccuracyColorClass } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import { cn } from '../ui/utils'

const SEARCH_DEBOUNCE_MS = 300

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

interface SavedInventoriesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inventories: InventoryCount[]
  loading: boolean
  isSuperAdmin: boolean
  onView: (id: number) => void
  onDelete: (id: number) => void
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
      <p className="text-base font-medium text-gray-700">جاري تحميل الجرد المحفوظة...</p>
      <p className="mt-1 text-sm text-gray-500">يرجى الانتظار قليلاً</p>
    </div>
  )
}

function EmptyState({ hasInventories }: { hasInventories: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 rounded-full bg-blue-50 p-4 text-blue-600">
        <Archive className="h-8 w-8" />
      </div>
      <p className="text-base font-medium text-gray-700">
        {hasInventories ? 'لا توجد نتائج مطابقة للتصفية' : 'لا توجد جرد محفوظة'}
      </p>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        {hasInventories
          ? 'جرّب تعديل معايير البحث أو مسح التصفيات النشطة.'
          : 'قم بإجراء جرد وحفظه ليظهر هنا.'}
      </p>
    </div>
  )
}

function StatsSummary({ inv }: { inv: InventoryCount }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-600">
        <Package className="h-3 w-3" />
        {inv.total_items.toLocaleString('ar-EG')} صنف
      </span>
      <span className="inline-flex rounded-lg bg-green-50 px-2 py-1 text-xs text-green-700">
        {inv.matching_items.toLocaleString('ar-EG')} متطابق
      </span>
      <span className="inline-flex rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">
        {inv.mismatch_items.toLocaleString('ar-EG')} غير متطابق
      </span>
      <span
        className={cn(
          'inline-flex rounded-lg px-2 py-1 text-xs font-semibold',
          inv.accuracy_rate >= 90
            ? 'bg-green-50 text-green-700'
            : inv.accuracy_rate >= 70
              ? 'bg-blue-50 text-blue-700'
              : inv.accuracy_rate >= 50
                ? 'bg-yellow-50 text-yellow-700'
                : 'bg-red-50 text-red-700'
        )}
      >
        {inv.accuracy_rate}% دقة
      </span>
    </div>
  )
}

function FilterFields({
  filters,
  onFiltersChange,
  creators,
  showCreatorFilter,
  compact = false,
}: {
  filters: SavedInventoryFilterState
  onFiltersChange: (filters: SavedInventoryFilterState) => void
  creators: { id: string; name: string }[]
  showCreatorFilter: boolean
  compact?: boolean
}) {
  const update = (partial: Partial<SavedInventoryFilterState>) => {
    onFiltersChange({ ...filters, ...partial })
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      <div className="space-y-2 sm:col-span-2 lg:col-span-3">
        <Label htmlFor="saved-inventory-search">بحث</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="saved-inventory-search"
            placeholder="بحث بالاسم، الفرع، المجموعة، أو المنشئ..."
            value={filters.searchTerm}
            onChange={(e) => update({ searchTerm: e.target.value })}
            className="pr-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>الفرع</Label>
        <Select value={filters.branchId} onValueChange={(value) => update({ branchId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="جميع الفروع" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفروع</SelectItem>
            {BRANCHES.map((branch) => (
              <SelectItem key={branch.id} value={String(branch.id)}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>مجموعة الجرد</Label>
        <Select value={filters.groupId} onValueChange={(value) => update({ groupId: value })}>
          <SelectTrigger>
            <SelectValue placeholder="جميع المجموعات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المجموعات</SelectItem>
            {INVENTORY_GROUPS.map((group) => (
              <SelectItem key={group.id} value={String(group.id)}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showCreatorFilter && creators.length > 0 && (
        <div className="space-y-2">
          <Label>المنشئ</Label>
          <Select value={filters.creatorId} onValueChange={(value) => update({ creatorId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="جميع المنشئين" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المنشئين</SelectItem>
              {creators.map((creator) => (
                <SelectItem key={creator.id} value={creator.id}>
                  {creator.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="saved-date-from">من تاريخ</Label>
        <Input
          id="saved-date-from"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update({ dateFrom: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="saved-date-to">إلى تاريخ</Label>
        <Input
          id="saved-date-to"
          type="date"
          value={filters.dateTo}
          onChange={(e) => update({ dateTo: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>الترتيب</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            update({ sortBy: value as SavedInventoryFilterState['sortBy'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAVED_INVENTORY_SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function ActiveFilterChips({
  filterChips,
  activeFilterCount,
  onRemoveChip,
  onClearAll,
}: {
  filterChips: { key: string; label: string }[]
  activeFilterCount: number
  onRemoveChip: (key: string) => void
  onClearAll: () => void
}) {
  if (activeFilterCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
      <span className="text-xs font-medium text-blue-800">
        {activeFilterCount.toLocaleString('ar-EG')} تصفية نشطة
      </span>
      {filterChips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onRemoveChip(chip.key)}
          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs text-blue-900 transition hover:bg-blue-100"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClearAll}
        className="mr-auto h-7 border-blue-200 bg-white text-xs text-blue-800 hover:bg-blue-100"
      >
        مسح الكل
      </Button>
    </div>
  )
}

function InventoryActions({
  inv,
  onView,
  onDeleteRequest,
  compact = false,
}: {
  inv: InventoryCount
  onView: (id: number) => void
  onDeleteRequest: (id: number) => void
  compact?: boolean
}) {
  return (
    <div className={cn('flex gap-2', compact ? 'w-full' : '')}>
      <Button
        size={compact ? 'default' : 'sm'}
        variant="outline"
        onClick={() => onView(inv.id)}
        className={cn(
          'gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50',
          compact && 'min-h-11 flex-1'
        )}
      >
        <Eye className="h-4 w-4" />
        عرض
      </Button>
      <Button
        size={compact ? 'default' : 'sm'}
        variant="destructive"
        onClick={() => onDeleteRequest(inv.id)}
        className={cn('gap-1.5', compact && 'min-h-11 flex-1')}
      >
        <Trash2 className="h-4 w-4" />
        حذف
      </Button>
    </div>
  )
}

function MobileInventoryCard({
  inv,
  isSuperAdmin,
  onView,
  onDeleteRequest,
}: {
  inv: InventoryCount
  isSuperAdmin: boolean
  onView: (id: number) => void
  onDeleteRequest: (id: number) => void
}) {
  const creatorName = inv.profiles?.full_name || inv.created_by || 'غير معروف'

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-gray-900">
            {inv.name || 'بدون اسم'}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3 shrink-0" />
            {formatDate(inv.created_at)}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-lg px-2 py-1 text-sm font-bold tabular-nums',
            getAccuracyColorClass(inv.accuracy_rate)
          )}
        >
          {inv.accuracy_rate}%
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">الفرع</p>
          <p className="font-medium text-gray-800">{inv.branches?.name || '—'}</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">المجموعة</p>
          <p className="font-medium text-gray-800">{inv.inventory_groups?.name || '—'}</p>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="mb-3 flex items-center gap-1.5 rounded-xl border border-dashed border-gray-200 px-3 py-2 text-sm text-blue-700">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="text-gray-500">أنشأ بواسطة:</span>
          <span className="truncate font-medium">{creatorName}</span>
        </div>
      )}

      <StatsSummary inv={inv} />

      <div className="mt-4">
        <InventoryActions
          inv={inv}
          onView={onView}
          onDeleteRequest={onDeleteRequest}
          compact
        />
      </div>
    </article>
  )
}

function TabletInventoryRow({
  inv,
  index,
  isSuperAdmin,
  onView,
  onDeleteRequest,
}: {
  inv: InventoryCount
  index: number
  isSuperAdmin: boolean
  onView: (id: number) => void
  onDeleteRequest: (id: number) => void
}) {
  const creatorName = inv.profiles?.full_name || inv.created_by || '—'

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-blue-50/60',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
      )}
    >
      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600">
        {formatDate(inv.created_at)}
      </td>
      <td className="max-w-[10rem] truncate px-4 py-3 text-sm font-medium text-gray-900">
        {inv.name || 'بدون اسم'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm">{inv.branches?.name}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm tabular-nums">
        {inv.total_items.toLocaleString('ar-EG')}
      </td>
      <td
        className={cn(
          'whitespace-nowrap px-4 py-3 text-sm font-semibold tabular-nums',
          getAccuracyColorClass(inv.accuracy_rate)
        )}
      >
        {inv.accuracy_rate}%
      </td>
      {isSuperAdmin && (
        <td className="max-w-[8rem] truncate px-4 py-3 text-sm text-blue-700">{creatorName}</td>
      )}
      <td className="whitespace-nowrap px-4 py-3">
        <InventoryActions inv={inv} onView={onView} onDeleteRequest={onDeleteRequest} />
      </td>
    </tr>
  )
}

function DesktopInventoryRow({
  inv,
  index,
  isSuperAdmin,
  onView,
  onDeleteRequest,
}: {
  inv: InventoryCount
  index: number
  isSuperAdmin: boolean
  onView: (id: number) => void
  onDeleteRequest: (id: number) => void
}) {
  const creatorName = inv.profiles?.full_name || inv.created_by || '—'

  return (
    <tr
      className={cn(
        'transition-colors hover:bg-blue-50/60',
        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
      )}
    >
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">
        {formatDate(inv.created_at)}
      </td>
      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{inv.name || 'بدون اسم'}</td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">
        {inv.branches?.name}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-700">
        {inv.inventory_groups?.name}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-gray-800">
        {inv.total_items.toLocaleString('ar-EG')}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-green-700">
        {inv.matching_items.toLocaleString('ar-EG')}
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-red-700">
        {inv.mismatch_items.toLocaleString('ar-EG')}
      </td>
      <td
        className={cn(
          'whitespace-nowrap px-5 py-3.5 text-sm font-semibold tabular-nums',
          getAccuracyColorClass(inv.accuracy_rate)
        )}
      >
        {inv.accuracy_rate}%
      </td>
      {isSuperAdmin && (
        <td className="whitespace-nowrap px-5 py-3.5 text-sm text-blue-700">{creatorName}</td>
      )}
      <td className="whitespace-nowrap px-5 py-3.5">
        <InventoryActions inv={inv} onView={onView} onDeleteRequest={onDeleteRequest} />
      </td>
    </tr>
  )
}

export function SavedInventoriesModal({
  open,
  onOpenChange,
  inventories,
  loading,
  isSuperAdmin,
  onView,
  onDelete,
}: SavedInventoriesModalProps) {
  const [filters, setFilters] = useState<SavedInventoryFilterState>(
    DEFAULT_SAVED_INVENTORY_FILTERS
  )
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  useEffect(() => {
    setFilters((current) =>
      current.searchTerm === debouncedSearch
        ? current
        : { ...current, searchTerm: debouncedSearch }
    )
  }, [debouncedSearch])

  useEffect(() => {
    if (!open) {
      setFilters(DEFAULT_SAVED_INVENTORY_FILTERS)
      setSearchInput('')
    }
  }, [open])

  const creators = useMemo(() => extractSavedInventoryCreators(inventories), [inventories])

  const filteredInventories = useMemo(
    () => applySavedInventoryFilters(inventories, filters),
    [inventories, filters]
  )
  const activeFilterCount = countSavedInventoryActiveFilters(filters)

  const creatorNameForChip = useMemo(() => {
    if (filters.creatorId === 'all') return undefined
    return creators.find((c) => c.id === filters.creatorId)?.name
  }, [filters.creatorId, creators])

  const filterChips = getSavedInventoryFilterChips(filters, creatorNameForChip)

  const handleDeleteConfirm = () => {
    if (deleteConfirmId !== null) {
      onDelete(deleteConfirmId)
      setDeleteConfirmId(null)
    }
  }

  const tabletHeaders = [
    'التاريخ',
    'الاسم',
    'الفرع',
    'الأصناف',
    'الدقة',
    ...(isSuperAdmin ? ['أنشأ بواسطة'] : []),
    'الإجراءات',
  ]

  const desktopHeaders = [
    'التاريخ',
    'الاسم',
    'الفرع',
    'المجموعة',
    'الأصناف',
    'متطابق',
    'غير متطابق',
    'الدقة',
    ...(isSuperAdmin ? ['أنشأ بواسطة'] : []),
    'الإجراءات',
  ]

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            'flex max-h-[100dvh] max-w-none flex-col gap-0 overflow-hidden p-0',
            'fixed inset-0 h-[100dvh] w-full translate-x-0 translate-y-0 rounded-none border-0',
            'sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-2xl'
          )}
        >
          <DialogHeader className="shrink-0 border-b border-gray-100 bg-gradient-to-l from-blue-50/80 to-white px-4 py-5 sm:px-6">
            <DialogTitle className="flex items-center justify-end gap-2 text-xl font-bold text-gray-900">
              <Archive className="h-5 w-5 text-blue-600" />
              الجرد المحفوظة
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {loading
                ? 'جاري التحميل...'
                : inventories.length > 0
                  ? `عرض ${filteredInventories.length.toLocaleString('ar-EG')} من ${inventories.length.toLocaleString('ar-EG')}`
                  : 'استعرض وحمّل الجرد المحفوظ سابقاً'}
            </p>
          </DialogHeader>

          <div className="shrink-0 space-y-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="بحث سريع..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-10 pr-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-10 gap-2 border-blue-200 bg-white">
                      <SlidersHorizontal className="h-4 w-4" />
                      تصفية
                      {activeFilterCount > 0 && (
                        <Badge variant="info" className="min-w-5 justify-center px-1.5">
                          {activeFilterCount.toLocaleString('ar-EG')}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                    <SheetHeader className="border-b border-gray-100 px-6 py-5 text-right">
                      <SheetTitle className="flex items-center justify-end gap-2">
                        <Filter className="h-5 w-5 text-blue-600" />
                        تصفية الجرد المحفوظ
                      </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                      <FilterFields
                        filters={{ ...filters, searchTerm: searchInput }}
                        onFiltersChange={(next) => {
                          setSearchInput(next.searchTerm)
                          setFilters(next)
                        }}
                        creators={creators}
                        showCreatorFilter={isSuperAdmin}
                        compact
                      />
                    </div>
                    <SheetFooter className="border-t border-gray-100 px-6 py-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setFilters(DEFAULT_SAVED_INVENTORY_FILTERS)
                          setSearchInput('')
                        }}
                        disabled={activeFilterCount === 0}
                        className="w-full sm:w-auto"
                      >
                        مسح جميع التصفيات
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                {filteredInventories.length > 0 && (
                  <div className="hidden items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 sm:inline-flex">
                    {filteredInventories.length.toLocaleString('ar-EG')} نتيجة
                  </div>
                )}
              </div>
            </div>

            <ActiveFilterChips
              filterChips={filterChips}
              activeFilterCount={activeFilterCount}
              onRemoveChip={(key) => {
                const cleared = clearSavedInventoryFilterKey(filters, key)
                setFilters(cleared)
                if (key === 'searchTerm') setSearchInput('')
              }}
              onClearAll={() => {
                setFilters(DEFAULT_SAVED_INVENTORY_FILTERS)
                setSearchInput('')
              }}
            />

            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                  لوحة التصفية المتقدمة
                </p>
                <FilterFields
                  filters={{ ...filters, searchTerm: searchInput }}
                  onFiltersChange={(next) => {
                    setSearchInput(next.searchTerm)
                    setFilters(next)
                  }}
                  creators={creators}
                  showCreatorFilter={isSuperAdmin}
                />
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <LoadingState />
            ) : filteredInventories.length === 0 ? (
              <EmptyState hasInventories={inventories.length > 0} />
            ) : (
              <>
                <div className="space-y-3 p-4 md:hidden">
                  {filteredInventories.map((inv) => (
                    <MobileInventoryCard
                      key={inv.id}
                      inv={inv}
                      isSuperAdmin={isSuperAdmin}
                      onView={onView}
                      onDeleteRequest={setDeleteConfirmId}
                    />
                  ))}
                </div>

                <div className="hidden overflow-x-auto md:block lg:hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                      <tr>
                        {tabletHeaders.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventories.map((inv, index) => (
                        <TabletInventoryRow
                          key={inv.id}
                          inv={inv}
                          index={index}
                          isSuperAdmin={isSuperAdmin}
                          onView={onView}
                          onDeleteRequest={setDeleteConfirmId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                      <tr>
                        {desktopHeaders.map((header) => (
                          <th
                            key={header}
                            className="whitespace-nowrap px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventories.map((inv, index) => (
                        <DesktopInventoryRow
                          key={inv.id}
                          inv={inv}
                          index={index}
                          isSuperAdmin={isSuperAdmin}
                          onView={onView}
                          onDeleteRequest={setDeleteConfirmId}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {!loading && inventories.length > 0 && (
            <div className="shrink-0 border-t border-gray-100 bg-slate-50/70 px-4 py-3 text-center text-sm text-gray-500 sm:px-6">
              عرض {filteredInventories.length.toLocaleString('ar-EG')} من{' '}
              {inventories.length.toLocaleString('ar-EG')} سجل
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف هذا الجرد؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
