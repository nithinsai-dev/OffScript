import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { queryClient } from './app/queryClient'
import { getAllEvents, getEventById } from './lib/api'
import { EVENTS_QUERY_KEY, eventDetailQueryKey } from './features/events/queries'

// Prefetch events list as early as possible at module evaluation
queryClient.prefetchQuery({
  queryKey: EVENTS_QUERY_KEY,
  queryFn: getAllEvents,
})

// If landing directly on an event detail URL, prefetch event detail immediately
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/events/')) {
  const parts = window.location.pathname.split('/')
  const eventId = parts[2]
  if (eventId) {
    queryClient.prefetchQuery({
      queryKey: eventDetailQueryKey(eventId),
      queryFn: () => getEventById(eventId),
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
