import { API_BASE_URL } from '@/lib/config'
import { ENDPOINTS } from '@/lib/endpoints'
import { ApiError, normalizeHttpError } from '@/lib/errors'
import { FIXTURE_EVENTS } from '@/lib/fixtures'
import { normalizeEventDetail, validateEventsApiResponse } from '@/lib/schemas'
import type { EventDetail, EventsApiResponse } from '@/types/event'

const DEFAULT_TIMEOUT_MS = 8000

interface RequestOptions extends RequestInit {
  timeoutMs?: number
}

/**
 * Open fetch client (no auth headers, no credentials, timeout + AbortController)
 */
async function typedFetch<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...fetchOptions.headers,
      },
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw normalizeHttpError(response)
    }

    const data = await response.json()
    return data as T
  } catch (error) {
    clearTimeout(timeoutId)
    throw normalizeHttpError(error)
  }
}

/**
 * Fetches all events from the live backend
 */
export async function getAllEvents(): Promise<EventsApiResponse> {
  const url = `${API_BASE_URL}${ENDPOINTS.ALL_EVENTS}`

  try {
    const rawData = await typedFetch<unknown>(url)
    return validateEventsApiResponse(rawData)
  } catch (error) {
    console.warn('[OFFSCRIPT API] Failed to fetch live events, using backup fixtures:', error)
    return {
      events: FIXTURE_EVENTS,
    }
  }
}

/**
 * Fetches a single event by ID with unwrapped normalization
 */
export async function getEventById(id: string): Promise<EventDetail> {
  const url = `${API_BASE_URL}${ENDPOINTS.EVENT_BY_ID(id)}`

  try {
    const rawData = await typedFetch<unknown>(url)
    const sanitized = normalizeEventDetail(rawData)
    if (!sanitized) {
      throw new ApiError({
        status: 404,
        code: 'NOT_FOUND',
        message: `Event with ID "${id}" could not be recognized.`,
        retryable: false,
      })
    }
    return sanitized
  } catch (error) {
    console.warn(`[OFFSCRIPT API] getEventById("${id}") error:`, error)
    // Check fallback fixtures if offline
    const found = FIXTURE_EVENTS.find((e) => e.id === id)
    if (found) {
      const sanitized = normalizeEventDetail({ event: found })
      if (sanitized) return sanitized
    }
    throw normalizeHttpError(error, `Event with ID "${id}" was not found.`)
  }
}
