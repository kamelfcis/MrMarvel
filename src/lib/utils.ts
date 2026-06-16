import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
