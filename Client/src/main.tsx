import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { queryClient } from './app/queryClient'
import { getAllEvents } from './lib/api'
import { EVENTS_QUERY_KEY } from './features/events/queries'

// Prefetch events list as early as possible at module evaluation
queryClient.prefetchQuery({
  queryKey: EVENTS_QUERY_KEY,
  queryFn: getAllEvents,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
