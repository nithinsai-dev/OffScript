import { useQuery } from '@tanstack/react-query'
import { getAllEvents, getEventById } from '@/lib/api'
import type { EventDetail, EventsApiResponse } from '@/types/event'

export const EVENTS_QUERY_KEY = ['events']
export const eventDetailQueryKey = (id: string) => ['events', id]

/**
 * Hook to fetch all events with caching
 */
export function useEventsQuery() {
  return useQuery<EventsApiResponse>({
    queryKey: EVENTS_QUERY_KEY,
    queryFn: getAllEvents,
  })
}

/**
 * Hook to fetch single event detail, seeding from list cache if available
 */
export function useEventDetailQuery(id: string) {
  return useQuery<EventDetail>({
    queryKey: eventDetailQueryKey(id),
    queryFn: () => getEventById(id),
    staleTime: 60 * 1000,
    enabled: Boolean(id),
  })
}
