/** Strip non-digits and normalize Egyptian numbers for wa.me (country code 20). */
export function formatPhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('0')) {
    return `20${digits.slice(1)}`
  }

  if (digits.startsWith('20')) {
    return digits
  }

  return digits
}

export function buildWhatsAppChatUrl(phone: string, message?: string): string | null {
  const cleanPhone = formatPhoneForWhatsApp(phone)
  if (!cleanPhone) return null

  const base = `https://wa.me/${cleanPhone}`
  if (!message) return base

  const encodedMessage = encodeURIComponent(message)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/\n/g, '%0A')

  return `${base}?text=${encodedMessage}`
}
