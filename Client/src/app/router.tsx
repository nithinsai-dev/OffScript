import {
  createRouter,
  createRootRoute,
  createRoute,
  lazyRouteComponent,
} from '@tanstack/react-router'
import { RootLayout } from '@/routes/root'
import { LandingPage } from '@/routes/landing'
import { NotFoundComponent } from '@/routes/not-found'
import { RouteErrorComponent } from '@/routes/error'

// 1. Root route definition
const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundComponent,
  errorComponent: RouteErrorComponent,
})

// 2. Landing index route (/)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
})

export interface EventsSearchSchema {
  q?: string
  category?: string
  mode?: 'OFFLINE' | 'ONLINE'
  price?: 'free' | 'paid'
  status?: 'OPEN' | 'CLOSED'
}

// 3. Events directory route (/events) with validateSearch and lazyRouteComponent
const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  validateSearch: (search: Record<string, unknown>): EventsSearchSchema => {
    return {
      q: typeof search.q === 'string' && search.q ? search.q : undefined,
      category: typeof search.category === 'string' && search.category ? search.category : undefined,
      mode: search.mode === 'OFFLINE' || search.mode === 'ONLINE' ? (search.mode as 'OFFLINE' | 'ONLINE') : undefined,
      price: search.price === 'free' || search.price === 'paid' ? (search.price as 'free' | 'paid') : undefined,
      status: search.status === 'OPEN' || search.status === 'CLOSED' ? (search.status as 'OPEN' | 'CLOSED') : undefined,
    }
  },
  component: lazyRouteComponent(
    () => import('@/routes/events'),
    'EventsPage'
  ),
})

// 4. Event detail route (/events/$eventId) with lazyRouteComponent
const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$eventId',
  component: lazyRouteComponent(
    () => import('@/routes/event-detail'),
    'EventDetailPage'
  ),
})

// 5. Router assembly
const routeTree = rootRoute.addChildren([indexRoute, eventsRoute, eventDetailRoute])

export const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  defaultNotFoundComponent: NotFoundComponent,
})

// 5. Type registration for TanStack Router
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
