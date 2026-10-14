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

// 3. Event detail route (/events/$eventId) with lazyRouteComponent
const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$eventId',
  component: lazyRouteComponent(
    () => import('@/routes/event-detail'),
    'EventDetailPage'
  ),
})

// 4. Router assembly
const routeTree = rootRoute.addChildren([indexRoute, eventDetailRoute])

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
