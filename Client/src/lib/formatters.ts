/**
 * Safe date and time formatter using Intl.DateTimeFormat
 * Handles timezone offsets gracefully and never crashes on invalid dates
 */

export function formatEventDateTime(
  dateStr?: string,
  timeStr?: string,
  timeZone?: string
): string {
  if (!dateStr || dateStr === 'TBD') {
    return 'Schedule to be announced'
  }

  try {
    const combined = timeStr && timeStr !== 'TBD' ? `${dateStr}T${timeStr}` : dateStr
    const date = new Date(combined)

    if (Number.isNaN(date.getTime())) {
      return `${dateStr} ${timeStr ?? ''}`.trim()
    }

    const formatter = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: timeZone || undefined,
    })

    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timeZone || undefined,
    })

    const formattedDate = formatter.format(date)
    if (timeStr && timeStr !== 'TBD') {
      return `${formattedDate} · ${timeFormatter.format(date)}`
    }
    return formattedDate
  } catch {
    return `${dateStr} ${timeStr ?? ''}`.trim()
  }
}

/**
 * Formats a single date into month + day (e.g., "28 Nov")
 */
export function formatMonthDay(dateStr?: string): { day: string; month: string } {
  if (!dateStr) return { day: '--', month: 'TBD' }
  try {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return { day: dateStr, month: '' }
    const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric' }).format(d)
    const month = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(d).toUpperCase()
    return { day, month }
  } catch {
    return { day: dateStr, month: '' }
  }
}

/**
 * Formats ISO 8601 deadline into readable format
 */
export function formatDeadline(isoDeadline?: string): string {
  if (!isoDeadline) return 'Registration open'

  try {
    const date = new Date(isoDeadline)
    if (Number.isNaN(date.getTime())) return isoDeadline

    const formatter = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    return formatter.format(date)
  } catch {
    return isoDeadline
  }
}

/**
 * Formats price according to brand rules
 * e.g., "Free", "₹499 / person", "₹1,200 / team"
 */
export function formatPrice(price?: number, isPerHead?: boolean): string {
  if (price === undefined || price === null || price === 0) {
    return 'Free'
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price)

  const suffix = isPerHead ? 'person' : 'team'
  return `${formattedAmount} / ${suffix}`
}

/**
 * Formats numeric currency amount for prizes (e.g. "₹50,000")
 */
export function formatPrizeAmount(amount?: number): string {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return '₹0'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats team size ranges
 */
export function formatTeamSize(minSize?: number, maxSize?: number): string {
  const min = minSize ?? 1
  const max = maxSize ?? min
  if (min === 1 && max === 1) {
    return 'Solo'
  }
  if (min === max) {
    return `${min} members`
  }
  return `${min} - ${max} members`
}

/**
 * Computes seat fill ratio and whether alert applies
 * Avoids divide-by-zero
 */
export function getSeatMetrics(seatsFilled?: number, totalSeats?: number): {
  percentage: number
  isCritical: boolean
  remainingSeats: number
} {
  const total = totalSeats ?? 0
  if (total <= 0) {
    return {
      percentage: 0,
      isCritical: false,
      remainingSeats: 0,
    }
  }

  const safeFilled = Math.max(0, seatsFilled ?? 0)
  const remainingSeats = Math.max(0, total - safeFilled)
  const ratio = safeFilled / total
  const percentage = Math.min(100, Math.round(ratio * 100))
  const isCritical = ratio >= 0.85 && remainingSeats > 0

  return {
    percentage,
    isCritical,
    remainingSeats,
  }
}
