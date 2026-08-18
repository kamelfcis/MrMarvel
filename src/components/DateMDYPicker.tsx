import { useState, type ComponentProps } from 'react'
import { CalendarIcon, X } from 'lucide-react'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { cn } from './ui/utils'
import { formatIsoDateMDYInput, isoToLocalDate, localDateToIso } from '../lib/utils'

type DateMDYPickerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange'> & {
  value: string
  onChange: (iso: string) => void
  placeholder?: string
}

export function DateMDYPicker({
  id,
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  className,
  disabled,
  ...props
}: DateMDYPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = isoToLocalDate(value)
  const displayValue = value ? formatIsoDateMDYInput(value) : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          {...props}
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 ring-offset-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-gray-400',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
          <span dir="ltr" className="min-w-0 flex-1 truncate text-left">
            {displayValue}
          </span>
          {value ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="مسح التاريخ"
              className="rounded p-0.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  onChange('')
                }
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(localDateToIso(date))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
