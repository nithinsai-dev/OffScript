import { useEffect, useRef, useState, useCallback } from 'react'
import { whenRevealed, logAnimationStart, getCurtainClearedTimestamp } from '@/lib/pageReady'
import { useCursor } from '@/hooks/useCursor'
import { HERO_STATIC_SPLASH_SVG } from '@/lib/splash/staticSvgPaths'

interface HeroStageProps {
  className?: string
}

interface SplashEngineInstance {
  startEntrySequence: () => void
  triggerClickSplash: (x: number, y: number) => void
  replay: () => void
  destroy: () => void
}

export function HeroStage({ className = '' }: HeroStageProps) {
  const { setCursor, resetCursor } = useCursor()

  const desktopContainerRef = useRef<HTMLDivElement | null>(null)
  const desktopCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const mobileContainerRef = useRef<HTMLDivElement | null>(null)
  const mobileCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const desktopEngineRef = useRef<SplashEngineInstance | null>(null)
  const mobileEngineRef = useRef<SplashEngineInstance | null>(null)

  const [hasInteracted, setHasInteracted] = useState(false)
  const [stageShake, setStageShake] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [mobileScrolledIn, setMobileScrolledIn] = useState(false)
  const [mobileEngineLoaded, setMobileEngineLoaded] = useState(false)

  const handleStageShake = useCallback((x: number, y: number) => {
    setStageShake({ x, y })
  }, [])

  const handleFirstInteraction = useCallback(() => {
    setHasInteracted(true)
  }, [])

  // 1. Desktop Canvas Engine Initialization
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isLite = document.documentElement.getAttribute('data-perf') === 'lite'
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isDesktop = window.innerWidth >= 1024

    if (prefersReduced || isLite || !isDesktop) return

    let isCleanedUp = false

    // Wait until whenRevealed() AND requestIdleCallback (1.5s timeout)
    whenRevealed().then(() => {
      if (isCleanedUp) return

      const loadEngine = () => {
        if (isCleanedUp) return

        import('@/lib/splash/engine')
          .then(({ SplashEngine }) => {
            if (isCleanedUp) return
            const canvas = desktopCanvasRef.current
            const container = desktopContainerRef.current
            if (!canvas || !container) return

            const engine = new SplashEngine({
              canvas,
              container,
              isMobile: false,
              onFirstClick: handleFirstInteraction,
              onStageShake: handleStageShake,
            })
            desktopEngineRef.current = engine
            logAnimationStart('HeroStage Canvas Splash')
            const clearedTime = getCurtainClearedTimestamp()
            console.log(
              `[HeroStage] Splash entry sequence starting at ${performance.now().toFixed(1)}ms (curtain cleared at ${clearedTime.toFixed(1)}ms, diff: ${(performance.now() - clearedTime).toFixed(1)}ms)`
            )
            engine.startEntrySequence()
          })
          .catch((err) => {
            console.warn('[HeroStage] Could not load splash engine:', err)
          })
      }

      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(loadEngine, { timeout: 1500 })
      } else {
        setTimeout(loadEngine, 400)
      }
    })

    return () => {
      isCleanedUp = true
      if (desktopEngineRef.current) {
        desktopEngineRef.current.destroy()
        desktopEngineRef.current = null
      }
    }
  }, [handleFirstInteraction, handleStageShake])

  // 2. Mobile IntersectionObserver for one-time CSS impact animation
  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = mobileContainerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting) {
          setMobileScrolledIn(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // 3. Desktop Click Handler
  const handleDesktopPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handleFirstInteraction()
    if (desktopEngineRef.current) {
      desktopEngineRef.current.triggerClickSplash(e.clientX, e.clientY)
    }
  }

  // 4. Mobile Tap-to-Splash Handler (lazy-loads engine on first tap)
  const handleMobilePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    handleFirstInteraction()
    const clientX = e.clientX
    const clientY = e.clientY

    if (mobileEngineRef.current) {
      mobileEngineRef.current.triggerClickSplash(clientX, clientY)
      return
    }

    // First mobile tap: dynamically import engine
    import('@/lib/splash/engine').then(({ SplashEngine }) => {
      const canvas = mobileCanvasRef.current
      const container = mobileContainerRef.current
      if (!canvas || !container) return

      setMobileEngineLoaded(true)

      const engine = new SplashEngine({
        canvas,
        container,
        isMobile: true,
        onFirstClick: handleFirstInteraction,
      })
      mobileEngineRef.current = engine
      engine.triggerClickSplash(clientX, clientY)
    })
  }

  // Dev-only replay handler
  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation()
    desktopEngineRef.current?.replay()
  }

  return (
    <>
      {/* =========================================================================
          DESKTOP HERO STAGE (Visible on lg: screens >= 1024px)
          - Positioned on the right of the hero
          - Fixed 1:1 aspect ratio, max 560px
          - Zero layout shift
          - Custom cursor "SPLASH"
          ========================================================================= */}
      <div
        id="hero-stage-slot"
        data-hero-stage="true"
        data-testid="hero-stage"
        ref={desktopContainerRef}
        aria-hidden="true"
        className={`hidden lg:block absolute right-0 lg:right-2 xl:right-4 lg:top-28 xl:top-20 w-[350px] lg:w-[370px] xl:w-[480px] 2xl:w-[520px] max-w-[560px] aspect-square select-none z-10 pointer-events-auto cursor-pointer ${className}`}
        style={{
          transform: `translate3d(${stageShake.x}px, ${stageShake.y}px, 0)`,
          transition: stageShake.x === 0 ? 'transform 0.15s ease-out' : 'none',
        }}
        onMouseEnter={() => setCursor('default', 'SPLASH')}
        onMouseLeave={resetCursor}
        onPointerDown={handleDesktopPointerDown}
        onMouseDown={handleDesktopPointerDown}
        onClick={handleDesktopPointerDown}
      >
        <div className="relative w-full h-full">
          {/* Main 2D Canvas */}
          <canvas
            ref={desktopCanvasRef}
            className="w-full h-full block"
          />

          {/* Tiny Mono Hint: Fades out after first click */}
          <div
            data-splash-hint="true"
            className={`absolute bottom-3 right-4 font-mono text-[10px] text-bone/50 uppercase tracking-widest pointer-events-none transition-opacity duration-700 ${
              hasInteracted ? 'opacity-0' : 'opacity-100'
            }`}
          >
            CLICK TO SPLASH
          </div>

          {/* Dev-only Replay Button (stripped in production) */}
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleReplay}
              className="absolute top-3 right-4 px-2.5 py-1 bg-ink/90 border border-volt/60 text-volt font-mono text-[10px] font-bold uppercase tracking-wider hover:bg-volt hover:text-ink transition-colors z-20 pointer-events-auto shadow-md"
            >
              Replay splash
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MOBILE / LITE HERO STAGE (Visible on screens < lg)
          - Placed after CTA buttons and before stats
          - Reserved aspect ratio 16:10, max 240px high
          - Zero layout shift
          - Static SVG with one-time CSS impact animation on scroll
          - Lazy loads canvas engine on first tap
          ========================================================================= */}
      <div
        data-hero-stage-mobile="true"
        ref={mobileContainerRef}
        aria-hidden="true"
        className="block lg:hidden w-full max-w-sm sm:max-w-md mx-auto aspect-[16/10] max-h-[240px] my-6 select-none relative overflow-hidden"
        style={{ touchAction: 'manipulation' }}
        onPointerDown={handleMobilePointerDown}
      >
        {/* Static SVG composition with one-time scale impact */}
        <div
          className={`w-full h-full flex items-center justify-center transition-transform duration-500 ease-out ${
            mobileScrolledIn ? 'scale-100' : 'scale-[0.6] opacity-90'
          }`}
          dangerouslySetInnerHTML={{ __html: HERO_STATIC_SPLASH_SVG }}
        />

        {/* Dynamic canvas overlay (activated only after first tap) */}
        <canvas
          ref={mobileCanvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
            mobileEngineLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    </>
  )
}
