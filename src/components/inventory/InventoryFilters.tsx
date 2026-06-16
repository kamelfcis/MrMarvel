import { ChevronDown, Filter, Search, SlidersHorizontal, X } from 'lucide-react'
import { BRANCHES, INVENTORY_GROUPS } from '../../lib/constants'
import {
  DEFAULT_INVENTORY_FILTERS,
  SORT_FIELD_OPTIONS,
  STATUS_FILTER_OPTIONS,
  type InventoryFilterState,
} from '../../lib/inventoryFilters'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible'
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../ui/sheet'
import { cn } from '../ui/utils'

interface InventoryFiltersProps {
  filters: InventoryFilterState
  onFiltersChange: (filters: InventoryFilterState) => void
  activeFilterCount: number
  filterChips: { key: string; label: string }[]
  onClearAll: () => void
  onRemoveChip: (key: string) => void
  hasResults: boolean
  currentBranchId?: number
  currentGroupId?: number
}

function FilterFields({
  filters,
  onFiltersChange,
  compact = false,
}: {
  filters: InventoryFilterState
  onFiltersChange: (filters: InventoryFilterState) => void
  compact?: boolean
}) {
  const update = (partial: Partial<InventoryFilterState>) => {
    onFiltersChange({ ...filters, ...partial })
  }

  return (
    <div
      className={cn(
        'grid gap-4',
        compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
      )}
    >
      <div className="space-y-2 sm:col-span-2 xl:col-span-3">
        <Label htmlFor="inventory-search">بحث</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="inventory-search"
            placeholder="بحث بالباركود أو الاسم..."
            value={filters.searchTerm}
            onChange={(e) => update({ searchTerm: e.target.value })}
            className="pr-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>حالة الفرق</Label>
        <Select
          value={filters.statusFilter}
          onValueChange={(value) =>
            update({ statusFilter: value as InventoryFilterState['statusFilter'] })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="جميع الحالات" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="space-y-2">
        <Label htmlFor="min-difference">الحد الأدنى للفرق</Label>
        <Input
          id="min-difference"
          type="number"
          inputMode="numeric"
          placeholder="مثال: -5"
          value={filters.minDifference}
          onChange={(e) => update({ minDifference: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max-difference">الحد الأقصى للفرق</Label>
        <Input
          id="max-difference"
          type="number"
          inputMode="numeric"
          placeholder="مثال: 10"
          value={filters.maxDifference}
          onChange={(e) => update({ maxDifference: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>ترتيب حسب</Label>
        <Select
          value={filters.sortField}
          onValueChange={(value) =>
            update({ sortField: value as InventoryFilterState['sortField'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_FIELD_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>اتجاه الترتيب</Label>
        <Select
          value={filters.sortDirection}
          onValueChange={(value) =>
            update({ sortDirection: value as InventoryFilterState['sortDirection'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">تصاعدي</SelectItem>
            <SelectItem value="desc">تنازلي</SelectItem>
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

export function InventoryFilters({
  filters,
  onFiltersChange,
  activeFilterCount,
  filterChips,
  onClearAll,
  onRemoveChip,
  hasResults,
  currentBranchId,
  currentGroupId,
}: InventoryFiltersProps) {
  const contextLabel =
    currentBranchId || currentGroupId
      ? [
          currentBranchId
            ? BRANCHES.find((branch) => branch.id === currentBranchId)?.name
            : null,
          currentGroupId
            ? INVENTORY_GROUPS.find((group) => group.id === currentGroupId)?.name
            : null,
        ]
          .filter(Boolean)
          .join(' • ')
      : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">تصفية النتائج</h3>
          {contextLabel && (
            <p className="mt-1 text-sm text-gray-500">جرد حالي: {contextLabel}</p>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
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
                  تصفية النتائج
                </SheetTitle>
                <SheetDescription>
                  {hasResults
                    ? 'اضبط معايير التصفية والترتيب لعرض النتائج المطلوبة.'
                    : 'ستتوفر التصفية بعد معالجة بيانات الجرد.'}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <FilterFields
                  filters={filters}
                  onFiltersChange={onFiltersChange}
                  compact
                />
              </div>

              <SheetFooter className="border-t border-gray-100 px-6 py-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClearAll}
                  disabled={activeFilterCount === 0}
                  className="w-full sm:w-auto"
                >
                  مسح جميع التصفيات
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <div className="relative flex-1 sm:hidden">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="بحث سريع..."
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              className="h-10 pr-10"
            />
          </div>
        </div>
      </div>

      <ActiveFilterChips
        filterChips={filterChips}
        activeFilterCount={activeFilterCount}
        onRemoveChip={onRemoveChip}
        onClearAll={onClearAll}
      />

      <Collapsible defaultOpen className="group hidden lg:block">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-slate-50/80 shadow-sm">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-right transition hover:bg-blue-50/40"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                لوحة التصفية المتقدمة
                {activeFilterCount > 0 && (
                  <Badge variant="info">{activeFilterCount.toLocaleString('ar-EG')}</Badge>
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-4 border-t border-gray-100 px-5 py-5">
              <FilterFields filters={filters} onFiltersChange={onFiltersChange} />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClearAll}
                  disabled={activeFilterCount === 0}
                >
                  مسح جميع التصفيات
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      <div className="hidden sm:block lg:hidden">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <FilterFields filters={filters} onFiltersChange={onFiltersChange} compact />
          {activeFilterCount > 0 && (
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClearAll}>
                مسح جميع التصفيات
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export { DEFAULT_INVENTORY_FILTERS }
