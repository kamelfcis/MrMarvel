import * as React from 'react'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { cn } from './utils'

export type SearchableSelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  loading?: boolean
  disabled?: boolean
  id?: string
  className?: string
  allowClear?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'اختر...',
  searchPlaceholder = 'ابحث...',
  emptyMessage = 'لا توجد نتائج',
  loading = false,
  disabled = false,
  id,
  className,
  allowClear = true,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  const displayValue = value.trim() ? value : ''

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'h-10 w-full justify-between border-gray-300 bg-white font-normal text-gray-900 hover:bg-white hover:text-gray-900',
            !displayValue && 'text-gray-400',
            className
          )}
        >
          <span className="truncate">
            {loading ? 'جاري التحميل...' : displayValue || placeholder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {allowClear && displayValue && !disabled && !loading ? (
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onValueChange('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onValueChange('')
                  }
                }}
                aria-label="مسح"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        dir="rtl"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option === value ? '' : option)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4 shrink-0',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">{option}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
