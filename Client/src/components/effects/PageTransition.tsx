import { useState, useEffect, useRef, type ReactNode } from 'react'
import { MOTION, scaleMs } from '@/lib/motion'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { notifyOverlayActive, notifyOverlayCleared } from '@/lib/pageReady'

interface PageTransitionProps {
  children: ReactNode
  locationKey: string
}

type CurtainPhase = 'idle' | 'leadExit' | 'covering' | 'holding' | 'revealing'

export function PageTransition({ children, locationKey }: PageTransitionProps) {
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Frozen rendered content keeps outgoing route mounted during exit
  const [displayedChildren, setDisplayedChildren] = useState<ReactNode>(children)
  const [displayedKey, setDisplayedKey] = useState<string>(locationKey)
  const [curtainPhase, setCurtainPhase] = useState<CurtainPhase>('idle')

  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Listen for route changes
  useEffect(() => {
    if (locationKey === displayedKey) {
      setDisplayedChildren(children)
      return
    }

    // Route changed!
    notifyOverlayActive('route-curtain')
    const fromPath = displayedKey
    const toPath = locationKey
    const isOutgoingEventDetail = fromPath.includes('/events/')

    // Fire exit event to notify outgoing components (flip cards, panels) to clean up & animate
    window.dispatchEvent(
      new CustomEvent('offscript:route-exit', {
        detail: { from: fromPath, to: toPath },
      })
    )

    // Failsafe: never block navigation beyond 3.0s
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
    failsafeTimerRef.current = setTimeout(() => {
      setDisplayedChildren(children)
      setDisplayedKey(locationKey)
      setCurtainPhase('idle')
      notifyOverlayCleared('route-curtain')
    }, scaleMs(MOTION.curtain.failsafe * 1000))

    if (prefersReduced) {
      // 150ms cross-fade in reduced motion
      setCurtainPhase('covering')
      const t = setTimeout(() => {
        setDisplayedChildren(children)
        setDisplayedKey(locationKey)
        setCurtainPhase('idle')
        notifyOverlayCleared('route-curtain')
      }, scaleMs(150))
      return () => clearTimeout(t)
    }

    if (isLite) {
      // Shorter 0.4s curtain in lite mode
      setCurtainPhase('covering')
      const t1 = setTimeout(() => {
        setDisplayedChildren(children)
        setDisplayedKey(locationKey)
        setCurtainPhase('revealing')
        setTimeout(() => {
          setCurtainPhase('idle')
          notifyOverlayCleared('route-curtain')
          if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
        }, scaleMs(200))
      }, scaleMs(200))
      return () => clearTimeout(t1)
    }

    // Full Mode Curtain Transition (Total under 1.65s):
    const leadTimeMs = isOutgoingEventDetail ? scaleMs(250) : 0

    if (leadTimeMs > 0) {
      setCurtainPhase('leadExit')
    }

    const startCoverTimer = setTimeout(() => {
      setCurtainPhase('covering')

      // Cover takes 0.45s
      const coverMs = scaleMs(0.45 * 1000)
      setTimeout(() => {
        // Screen is now fully covered by Volt curtain!
        setDisplayedChildren(children)
        setDisplayedKey(locationKey)
        setCurtainPhase('holding')

        // Hold with wordmark write-in for 0.40s
        const holdMs = scaleMs(0.4 * 1000)
        setTimeout(() => {
          setCurtainPhase('revealing')

          // Reveal takes 0.45s (0.45 + 0.40 + 0.45 = 1.30s <= 1.65s)
          const revealMs = scaleMs(0.45 * 1000)
          setTimeout(() => {
            setCurtainPhase('idle')
            notifyOverlayCleared('route-curtain')
            if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
          }, revealMs)
        }, holdMs)
      }, coverMs)
    }, leadTimeMs)

    return () => {
      clearTimeout(startCoverTimer)
    }
  }, [locationKey, displayedKey, children, prefersReduced, isLite])

  return (
    <div className="relative w-full">
      {/* Real page content (keeps outgoing route mounted until covered) */}
      <div key={displayedKey} className="relative w-full">
        {displayedChildren}
      </div>

      {/* Volt Curtain Overlay */}
      {curtainPhase !== 'idle' && curtainPhase !== 'leadExit' && (
        <div
          key="route-curtain"
          className={`fixed inset-0 z-50 flex items-center justify-center bg-volt border-b-4 border-ink pointer-events-none ${
            curtainPhase === 'covering'
              ? 'curtain-covering'
              : curtainPhase === 'holding'
              ? 'curtain-holding'
              : 'curtain-revealing'
          }`}
          onAnimationEnd={(e) => {
            if (curtainPhase === 'revealing' && e.target === e.currentTarget) {
              notifyOverlayCleared('route-curtain')
            }
          }}
        >
          {/* OFFSCRIPT Wordmark write-in at center during hold */}
          {(curtainPhase === 'holding' || curtainPhase === 'revealing') && (
            <div className="curtain-wordmark flex items-center gap-3 font-display text-4xl md:text-6xl font-black text-ink tracking-tight uppercase select-none">
              <span>OFFSCRIPT</span>
              <span className="font-mono text-xs tracking-widest bg-ink text-volt px-3 py-1 border border-ink uppercase font-black">
                #beoffscript
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
