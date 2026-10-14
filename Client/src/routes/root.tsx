import { Outlet, useRouterState } from '@tanstack/react-router'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BackToTop } from '@/components/layout/BackToTop'
import { GrainOverlay } from '@/components/effects/GrainOverlay'
import { Cursor } from '@/components/effects/Cursor'
import { PageTransition } from '@/components/effects/PageTransition'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LenisProvider } from '@/hooks/useLenis'
import { CursorProvider } from '@/hooks/useCursor'
import { ToastProvider } from '@/components/ui/Toast'

import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { usePerfGovernor } from '@/hooks/usePerfGovernor'

export function RootLayout() {
  usePerfGovernor()
  const routerState = useRouterState()
  const locationKey = routerState.location.pathname

  return (
    <LenisProvider>
      <CursorProvider>
        <ToastProvider>
          <ErrorBoundary>
            {/* Top Offline Mode Banner */}
            <OfflineBanner />

            {/* Grain & Grid Background Effect */}
            <GrainOverlay />

            {/* Desktop Custom Follower Cursor */}
            <Cursor />

            {/* Accessible Main Structure */}
            <div className="relative min-h-screen flex flex-col bg-ink text-bone font-sans">
              <Navbar />

              <main id="main-content" className="flex-1 w-full">
                <PageTransition locationKey={locationKey}>
                  <Outlet />
                </PageTransition>
              </main>

              <Footer />
              <BackToTop />
            </div>
          </ErrorBoundary>
        </ToastProvider>
      </CursorProvider>
    </LenisProvider>
  )
}
