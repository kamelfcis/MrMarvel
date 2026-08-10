import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Eastern Arabic numerals for date display (ar-EG). */
function toArEgDigits(value: string): string {
  return value.replace(/\d/g, (digit) => Number(digit).toLocaleString('ar-EG'))
}

/** Format YYYY-MM-DD (or Date / ISO strings) as mm/dd/yyyy in ar-EG numerals (US date order). */
export function formatDateMDY(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  try {
    let y: number
    let m: number
    let d: number
    if (value instanceof Date) {
      y = value.getFullYear()
      m = value.getMonth() + 1
      d = value.getDate()
    } else {
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
      if (iso) {
        y = Number(iso[1])
        m = Number(iso[2])
        d = Number(iso[3])
      } else {
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return String(value)
        y = date.getFullYear()
        m = date.getMonth() + 1
        d = date.getDate()
      }
    }
    const en = `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`
    return toArEgDigits(en)
  } catch {
    return String(value)
  }
}

/** Format YYYY-MM-DD (or Date / ISO strings) as dd/mm/yyyy in ar-EG (day/month/year). */
export function formatDateDMY(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '—'
  try {
    let date: Date
    if (value instanceof Date) {
      date = value
    } else {
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
      if (iso) {
        const y = Number(iso[1])
        const m = Number(iso[2])
        const d = Number(iso[3])
        date = new Date(y, m - 1, d)
      } else {
        date = new Date(value)
      }
    }
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString('ar-EG', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(value)
  }
}

/** @deprecated Prefer formatDateDMY — kept for existing imports. */
export function formatDate(dateString: string) {
  return formatDateDMY(dateString)
}

export function getAccuracyColorClass(accuracy: number) {
  if (accuracy >= 90) return 'text-green-600'
  if (accuracy >= 70) return 'text-blue-600'
  if (accuracy >= 50) return 'text-yellow-600'
  return 'text-red-600'
}

export function getStatusClass(
  statusType: string,
  _difference?: number
): string {
  switch (statusType) {
    case 'matched':
      return 'text-green-700 bg-green-100'
    case 'increase':
      return 'text-blue-700 bg-blue-100'
    case 'decrease':
      return 'text-red-700 bg-red-100'
    case 'new':
      return 'text-purple-700 bg-purple-100'
    default:
      return 'text-purple-700 bg-purple-100'
  }
}
