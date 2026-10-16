import { useState, useEffect, lazy, Suspense } from 'react'
import { Outlet, useRouterState } from '@tanstack/react-router'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BackToTop } from '@/components/layout/BackToTop'
import { PageTransition } from '@/components/effects/PageTransition'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LenisProvider } from '@/hooks/useLenis'
import { CursorProvider } from '@/hooks/useCursor'
import { ToastProvider } from '@/components/ui/Toast'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { usePerfGovernor } from '@/hooks/usePerfGovernor'
import { initRevealSystem, handleRouteChangeReveals } from '@/lib/reveal'

const LazyCursor = lazy(() =>
  import('@/components/effects/Cursor').then((m) => ({ default: m.Cursor }))
)
const LazyGrainOverlay = lazy(() =>
  import('@/components/effects/GrainOverlay').then((m) => ({ default: m.GrainOverlay }))
)
import { RegistrationNotice } from '@/components/RegistrationNotice'

export function RootLayout() {
  usePerfGovernor()
  const routerState = useRouterState()
  const locationKey = routerState.location.pathname

  const [mountDesktopEffects, setMountDesktopEffects] = useState(false)

  // Initialize universal scroll reveal system
  useEffect(() => {
    initRevealSystem()
  }, [])

  // Re-scan and check reveal states on every route transition
  useEffect(() => {
    handleRouteChangeReveals()
  }, [locationKey])

  useEffect(() => {
    // Check if lite mode is active (set on <html> before first paint)
    const isLite = document.documentElement.getAttribute('data-perf') === 'lite'
    if (isLite) return

    const hasFinePointer = window.matchMedia('(pointer: fine) and (hover: hover)').matches
    if (!hasFinePointer) return

    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 250))
    const handle = schedule(() => {
      setMountDesktopEffects(true)
    })

    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number)
    }
  }, [])

  return (
    <LenisProvider>
      <CursorProvider>
        <ToastProvider>
          <ErrorBoundary>
            {/* Top Offline Mode Banner */}
            <OfflineBanner />

            {/* Desktop-only atmospheric effects: mounted after idle in full mode */}
            {mountDesktopEffects && (
              <Suspense fallback={null}>
                <LazyGrainOverlay />
                <LazyCursor />
              </Suspense>
            )}

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

            {/* Global Registration Notice Dialog (mounted via createPortal) */}
            <RegistrationNotice />
          </ErrorBoundary>
        </ToastProvider>
      </CursorProvider>
    </LenisProvider>
  )
}
