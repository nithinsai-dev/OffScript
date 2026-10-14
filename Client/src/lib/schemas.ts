import type { Event, EventDetail, EventsApiResponse } from '@/types/event'

/**
 * Fallback dark cyber pattern block for events without valid cover image
 */
export const FALLBACK_COVER_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="800" height="450" fill="%23111210"/><path d="M0 0 L800 450 M800 0 L0 450" stroke="%23EDEBE0" stroke-width="1" stroke-opacity="0.1"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23D4FF3F" font-family="sans-serif" font-weight="bold" font-size="22" letter-spacing="2">OFFSCRIPT // CAMPUS EVENT</text></svg>'

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function safeString(val: unknown, fallback = ''): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return fallback
}

function safeArray<T>(val: unknown): T[] {
  return Array.isArray(val) ? (val as T[]) : []
}

/**
 * Normalizes a list event summary item.
 * Requires only id and name; unknown fields are preserved.
 */
export function normalizeEventSummary(raw: unknown): Event | null {
  if (!isRecord(raw)) return null

  const id = safeString(raw.id)
  const name = safeString(raw.name)
  if (!id && !name) {
    if (import.meta.env.DEV) {
      console.warn('[OFFSCRIPT Normalizer] Skipped event without id or name:', raw)
    }
    return null
  }

  const safeEventId = id || `event-${Math.random().toString(36).substring(2, 9)}`
  const safeEventName = name || 'Untitled Event'

  return {
    ...raw,
    id: safeEventId,
    name: safeEventName,
    blurb: safeString(raw.blurb, ''),
    cover_image_url: safeString(raw.cover_image_url) || FALLBACK_COVER_IMAGE,
    cover_image_alt: safeString(raw.cover_image_alt, safeEventName),
    category: safeString(raw.category, 'GENERAL'),
    tags: safeArray<string>(raw.tags),
    event_type: safeString(raw.event_type, 'STAGE'),
    event_mode: safeString(raw.event_mode, 'OFFLINE'),
    event_status: safeString(raw.event_status, 'SCHEDULED'),
    is_featured: Boolean(raw.is_featured),
    is_technical: Boolean(raw.is_technical),
    price: typeof raw.price === 'number' ? Math.max(0, raw.price) : 0,
    is_per_head: typeof raw.is_per_head === 'boolean' ? raw.is_per_head : true,
    min_teamsize: typeof raw.min_teamsize === 'number' ? Math.max(1, raw.min_teamsize) : 1,
    max_teamsize: typeof raw.max_teamsize === 'number' ? Math.max(1, raw.max_teamsize) : 1,
    total_seats: typeof raw.total_seats === 'number' ? Math.max(0, raw.total_seats) : 100,
    seats_filled: typeof raw.seats_filled === 'number' ? Math.max(0, raw.seats_filled) : 0,
    registration_status: safeString(raw.registration_status, 'OPEN'),
    registration_deadline: safeString(raw.registration_deadline, ''),
    schedule_summary: isRecord(raw.schedule_summary)
      ? {
          start_date: safeString(raw.schedule_summary.start_date, ''),
          start_time: safeString(raw.schedule_summary.start_time, ''),
          end_date: safeString(raw.schedule_summary.end_date, ''),
          end_time: safeString(raw.schedule_summary.end_time, ''),
        }
      : undefined,
  }
}

/**
 * Normalizes full event detail.
 * Unwraps raw.event if present, else raw.data, else raw itself.
 * All array fields default to []. Only id and name are required.
 * Unknown extra fields are allowed and passed through.
 */
export function normalizeEventDetail(raw: unknown): EventDetail | null {
  if (!isRecord(raw)) return null

  // Unwrap { event: { ... } } or { data: { ... } } or raw
  const target: Record<string, unknown> = isRecord(raw.event)
    ? (raw.event as Record<string, unknown>)
    : isRecord(raw.data)
      ? (raw.data as Record<string, unknown>)
      : raw

  const base = normalizeEventSummary(target)
  if (!base) return null

  const description = safeString(target.description, '')
  const banner_image_url = safeString(target.banner_image_url, '')
  const banner_image_alt = safeString(target.banner_image_alt, base.name)

  return {
    ...target,
    ...base,
    description: description || base.blurb || '',
    banner_image_url: banner_image_url || base.cover_image_url || FALLBACK_COVER_IMAGE,
    banner_image_alt,
    gallery_images: safeArray<string>(target.gallery_images),
    highlights: safeArray<string>(target.highlights),
    what_to_expect: safeArray<string>(target.what_to_expect),
    eligibility: safeArray<string>(target.eligibility),
    prerequisites: safeArray<string>(target.prerequisites),
    rules: safeArray<string>(target.rules),
    prizes: safeArray<{ rank: number; title: string; amount: number; description?: string }>(target.prizes),
    faqs: safeArray<{ question: string; answer: string }>(target.faqs),
    schedules: safeArray<{ event_date: string; start_time: string; end_time: string; venue?: string }>(target.schedules),
    organizers: safeArray<{ id: string; name: string; org_type?: string }>(target.organizers),
    coordinators: safeArray<{ id: string; name: string; role?: string; contact?: string }>(target.coordinators),
  }
}

/**
 * Validates the full GET /api/test/events response shape defensively
 */
export function validateEventsApiResponse(raw: unknown): EventsApiResponse {
  if (!isRecord(raw)) {
    if (Array.isArray(raw)) {
      const events = raw.map(normalizeEventSummary).filter((e): e is Event => e !== null)
      return { events }
    }
    if (import.meta.env.DEV) {
      console.warn('[OFFSCRIPT API] Expected object response, received:', typeof raw)
    }
    return { events: [] }
  }

  const rawEvents = raw.events ?? raw.data ?? raw.items
  if (!Array.isArray(rawEvents)) {
    return { events: [] }
  }

  const events = rawEvents.map(normalizeEventSummary).filter((e): e is Event => e !== null)
  return { events }
}
