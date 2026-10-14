/**
 * API Endpoints
 * All backend endpoint paths are defined here for immediate modification.
 */

export const ENDPOINTS = {
  /**
   * GET /api/test/events -> returns { events: Event[] }
   */
  ALL_EVENTS: '/api/test/events',

  /**
   * GET /api/test/events/:id -> returns { event: EventDetail }
   */
  EVENT_BY_ID: (id: string): string => `/api/test/events/${encodeURIComponent(id)}`,
} as const
