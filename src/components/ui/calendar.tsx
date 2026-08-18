import { DayPicker, type DayPickerProps } from 'react-day-picker'
import 'react-day-picker/style.css'
import { cn } from './utils'

export type CalendarProps = DayPickerProps

export function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div
      dir="ltr"
      className={cn(
        '[--rdp-accent-color:#2563eb] [--rdp-accent-background-color:#eff6ff]',
        className,
      )}
    >
      <DayPicker {...props} />
    </div>
  )
}
