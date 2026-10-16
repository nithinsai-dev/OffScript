import { REGISTRATION_URL_BASE } from '@/lib/config'

/**
 * Validates if the external registration system URL is configured.
 * Rejects placeholder, localhost, example, malformed, or empty URLs.
 */
export function isRegistrationConfigured(): boolean {
  if (!REGISTRATION_URL_BASE) return false
  const trimmed = REGISTRATION_URL_BASE.trim()
  if (!trimmed) return false

  // Reject known placeholders, variables, localhost, example domains
  if (
    trimmed === 'https://register.offscript.events' ||
    trimmed === 'http://register.offscript.events' ||
    trimmed === 'REGISTRATION_URL_BASE' ||
    trimmed.includes('example.com') ||
    trimmed.includes('example.org') ||
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1')
  ) {
    return false
  }

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Returns the full registration link for an event (or base URL if no event),
 * or null if registration is not yet configured.
 */
export function getRegistrationUrl(
  event?: { id?: string; name?: string } | string | null
): string | null {
  if (!isRegistrationConfigured()) return null

  const trimmedBase = REGISTRATION_URL_BASE.trim()
  const eventId = typeof event === 'string' ? event : event?.id

  if (eventId) {
    const separator = trimmedBase.includes('?') ? '&' : '?'
    return `${trimmedBase}${separator}eventId=${encodeURIComponent(eventId)}`
  }

  return trimmedBase
}

/**
 * Centralized user-facing registration copy.
 */
export const REGISTRATION_COPY = {
  eyebrow: 'REGISTRATION',
  heading: "Registrations aren't open yet",
  body: "We're still setting this up. Check back soon for the registration link.",
  eventSubtext: (name: string) => `${name} will open for registration shortly.`,
  browseButton: 'Browse events',
  gotItButton: 'Got it',
  closedBadge: 'REGISTRATION CLOSED',
  closedBadgeShort: 'CLOSED',
} as const

export interface RegistrationNoticePayload {
  isOpen: boolean
  eventName?: string
  eventId?: string
  triggerEl?: HTMLElement | null
}

type Listener = (state: RegistrationNoticePayload) => void

let currentState: RegistrationNoticePayload = {
  isOpen: false,
}

const listeners = new Set<Listener>()

export function getRegistrationNoticeState(): RegistrationNoticePayload {
  return currentState
}

export function openRegistrationNotice(
  event?: { name?: string; id?: string } | string | null,
  triggerEl?: HTMLElement | null
) {
  const eventName =
    typeof event === 'object' && event !== null ? event.name : undefined
  const eventId =
    typeof event === 'string'
      ? event
      : typeof event === 'object' && event !== null
      ? event.id
      : undefined

  currentState = {
    isOpen: true,
    eventName,
    eventId,
    triggerEl: triggerEl ?? (typeof document !== 'undefined' ? (document.activeElement as HTMLElement) : null),
  }

  if (listeners.size === 0) {
    if (import.meta.env.DEV) {
      console.warn('[registration] openRegistrationNotice called but store has 0 active listeners. Triggering fallback feedback.')
    }
    if (typeof document !== 'undefined') {
      let fallback = document.getElementById('reg-notice-fallback')
      if (!fallback) {
        fallback = document.createElement('div')
        fallback.id = 'reg-notice-fallback'
        fallback.style.cssText =
          'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:999999;background:#111210;color:#D4FF3F;border:2px solid #D4FF3F;padding:12px 24px;font-family:monospace;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 8px 30px rgba(0,0,0,0.8);'
        fallback.textContent = "Registrations aren't open yet. Check back soon."
        document.body.appendChild(fallback)
        setTimeout(() => fallback?.remove(), 4000)
      }
    }
  }

  listeners.forEach((l) => {
    try {
      l(currentState)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[registration] Error in registration listener:', err)
      }
    }
  })
}

export function closeRegistrationNotice() {
  const prevTrigger = currentState.triggerEl
  currentState = {
    isOpen: false,
    triggerEl: null,
  }
  listeners.forEach((l) => {
    try {
      l(currentState)
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[registration] Error in registration close listener:', err)
      }
    }
  })

  // Return focus to the trigger element that opened the dialog
  if (prevTrigger && typeof prevTrigger.focus === 'function') {
    requestAnimationFrame(() => {
      try {
        prevTrigger.focus()
      } catch {
        // ignore if element no longer in DOM
      }
    })
  }
}

export function subscribeRegistrationNotice(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Expose on window for static shell integration and fallback triggers
if (typeof window !== 'undefined') {
  ;(window as unknown as { __openRegistrationNotice?: typeof openRegistrationNotice }).__openRegistrationNotice =
    openRegistrationNotice
  ;(window as unknown as { __closeRegistrationNotice?: typeof closeRegistrationNotice }).__closeRegistrationNotice =
    closeRegistrationNotice
}

