import { useQuery } from '@tanstack/react-query'
import { getAllEvents, getEventById } from '@/lib/api'
import { FIXTURE_EVENTS } from '@/lib/fixtures'
import { normalizeEventDetail } from '@/lib/schemas'
import type { EventDetail, EventsApiResponse } from '@/types/event'

export const EVENTS_QUERY_KEY = ['events']
export const eventDetailQueryKey = (id: string) => ['events', id]

export const eventsQueryOptions = () => ({
  queryKey: EVENTS_QUERY_KEY,
  queryFn: getAllEvents,
  staleTime: 60 * 1000,
})

export const eventDetailQueryOptions = (id: string) => ({
  queryKey: eventDetailQueryKey(id),
  queryFn: () => getEventById(id),
  staleTime: 60 * 1000,
})

/**
 * Hook to fetch all events with caching and instant fixture seeding
 */
export function useEventsQuery() {
  return useQuery<EventsApiResponse>({
    ...eventsQueryOptions(),
    initialData: () => ({
      events: FIXTURE_EVENTS,
    }),
  })
}

/**
 * Hook to fetch single event detail, seeding from list cache or fixtures if available
 */
export function useEventDetailQuery(id: string) {
  return useQuery<EventDetail>({
    queryKey: eventDetailQueryKey(id),
    queryFn: () => getEventById(id),
    initialData: () => {
      const match = FIXTURE_EVENTS.find((e) => e.id === id)
      return match ? (normalizeEventDetail(match) as EventDetail) : undefined
    },
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  })
}
