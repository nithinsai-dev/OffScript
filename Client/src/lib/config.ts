/**
 * OFFSCRIPT Application Configuration
 * College event discovery platform configuration
 */

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || 'https://render72.pages.dev'

/**
 * Placeholder base URL for event registration.
 * Organizers provide the real endpoint.
 * Register buttons link to `${REGISTRATION_URL_BASE}?eventId=${eventId}`
 */
export const REGISTRATION_URL_BASE = 'https://register.offscript.events'

export const BRAND = {
  name: 'OFFSCRIPT',
  tagline: '#beoffscript',
  description: 'Your campus. Your events. Zero boring.',
  contactEmail: 'hello@offscript.events',
} as const
