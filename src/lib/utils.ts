import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
