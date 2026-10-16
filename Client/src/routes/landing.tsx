import { useMemo, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { SplitText } from '@/components/effects/SplitText'
import { HeroTagline } from '@/components/effects/HeroTagline'
import { HeroStage } from '@/components/effects/HeroStage'
import { HeroTicketStrip } from '@/components/events/HeroTicketStrip'
import { VelocityMarquee } from '@/components/events/VelocityMarquee'
import { BrowseAllStrip } from '@/components/events/BrowseAllStrip'
import { EventCardSkeleton } from '@/components/ui/Skeletons'
import { SectionError } from '@/components/ui/SectionError'
import { useEventsQuery } from '@/features/events/queries'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import { useCursor } from '@/hooks/useCursor'
import { MOTION } from '@/lib/motion'
import { handleRouteChangeReveals } from '@/lib/reveal'
import { whenRevealed, logAnimationStart } from '@/lib/pageReady'

const LazyFeaturedStack = lazy(() =>
  import('@/components/events/FeaturedStack').then((m) => ({ default: m.FeaturedStack }))
)
const LazyCountdownSection = lazy(() =>
  import('@/components/events/CountdownSection').then((m) => ({ default: m.CountdownSection }))
)
const LazyWhySection = lazy(() =>
  import('@/components/events/WhySection').then((m) => ({ default: m.WhySection }))
)
const LazySponsorsSection = lazy(() =>
  import('@/components/events/SponsorsSection').then((m) => ({ default: m.SponsorsSection }))
)
const LazyLineupSection = lazy(() =>
  import('@/components/events/LineupSection').then((m) => ({ default: m.LineupSection }))
)

export function LandingPage() {
  const { data, isLoading, isError, error, refetch } = useEventsQuery()
  const { scrollTo } = useLenis()
  const navigate = useNavigate()
  const router = useRouter()
  const { setCursor, resetCursor } = useCursor()

  const events = useMemo(() => data?.events ?? [], [data?.events])
  const hasCachedData = events.length > 0
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

  // Summary counts for directory strip
  const stats = useMemo(() => {
    const totalEvents = events.length
    const openEvents = events.filter((e) => e.registration_status === 'OPEN').length
    return { totalEvents, openEvents }
  }, [events])

  // Scroll to anchor section when navigating to "/" from "/events" or another route
  useEffect(() => {
    const rawHash = window.location.hash?.replace('#', '')
    if (rawHash) {
      const timer = setTimeout(() => {
        scrollTo(`#${rawHash}`, {
          offset: -96,
          duration: 0.9,
          easing: easeOutExpo,
        })
      }, 180)
      return () => clearTimeout(timer)
    }
  }, [scrollTo])

  // Re-scan and reveal in-view content when events data resolves
  useEffect(() => {
    handleRouteChangeReveals()
  }, [hasCachedData])

  // PART 8: Landing Page Hero Entry Timeline (dynamically imported after load, never blocking paint)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isLite = document.documentElement.getAttribute('data-perf') === 'lite'
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isLite || prefersReduced) return

    let isCleanedUp = false
    let ctx: { revert: () => void } | null = null

    const runHeroTimeline = () => {
      if (isCleanedUp) return

      // Safety failsafe: ensure all hero elements are visible within 2.5s
      const heroSafety = setTimeout(() => {
        const heroElements = [
          'header[role="banner"]',
          '#hero-tagline',
          '#hero-supporting',
          '#hero-buttons',
          '#hero-stats',
          '#hero-sticker',
          '#hero-marquee',
        ]
        heroElements.forEach((sel) => {
          const el = document.querySelector<HTMLElement>(sel)
          if (el) {
            el.style.opacity = '1'
            el.style.transform = 'none'
          }
        })
      }, 2500)

      import('gsap')
        .then(({ default: gsap }) => {
          if (isCleanedUp) return

          ctx = gsap.context(() => {
            const navbar = document.querySelector('header[role="banner"]')
            const buttons = document.querySelector('#hero-buttons')
            const statsEl = document.querySelector('#hero-stats')
            const sticker = document.querySelector('#hero-sticker')
            const marquee = document.querySelector('#hero-marquee')

            const tl = gsap.timeline({
              onComplete: () => {
                clearTimeout(heroSafety)
                if (navbar) gsap.set(navbar, { clearProps: 'transform,opacity' })
              },
            })

            // 1. Navbar drops in (0.2s)
            if (navbar) {
              tl.fromTo(
                navbar,
                { y: -80, opacity: 0 },
                {
                  y: 0,
                  opacity: 1,
                  duration: MOTION.landingHero.navbarDrop,
                  ease: 'power2.out',
                  clearProps: 'transform,opacity',
                },
                0
              )
            }

            // 2. Buttons rise at ~0.4s
            if (buttons) {
              tl.fromTo(
                buttons,
                { y: 15, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
                0.3
              )
            }

            // 4. Two buttons rise with a small overshoot at ~1.1s
            if (buttons) {
              tl.fromTo(
                buttons,
                { y: 25, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.5)' },
                MOTION.landingHero.buttonsRise
              )
            }

            // 5. Stats count up from ~1.3s over 1.8s
            if (statsEl) {
              tl.fromTo(
                statsEl,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },
                MOTION.landingHero.statsStart
              )
              tl.add(() => {
                window.dispatchEvent(new CustomEvent('reveal-count-up'))
              }, MOTION.landingHero.statsStart)
            }

            // 6. Floating sticker springs in at ~1.5s
            if (sticker) {
              tl.fromTo(
                sticker,
                { scale: 0, rotation: -20, opacity: 0 },
                { scale: 1, rotation: 6, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' },
                MOTION.landingHero.stickerSpring
              )
            }

            // 7. Marquee fades in at ~1.7s
            if (marquee) {
              tl.fromTo(
                marquee,
                { opacity: 0 },
                { opacity: 1, duration: 0.6, ease: 'power1.out' },
                MOTION.landingHero.marqueeFade
              )
            }

            // Skippable: click, key, or scroll immediately completes the timeline
            const skipTimeline = () => {
              clearTimeout(heroSafety)
              tl.progress(1)
            }

            window.addEventListener('pointerdown', skipTimeline, { once: true, passive: true })
            window.addEventListener('keydown', skipTimeline, { once: true, passive: true })
            window.addEventListener('wheel', skipTimeline, { once: true, passive: true })
            window.addEventListener('touchstart', skipTimeline, { once: true, passive: true })
          })
        })
        .catch((err) => {
          console.warn('[OFFSCRIPT Hero] GSAP load failed, showing hero elements directly:', err)
          clearTimeout(heroSafety)
          const heroElements = [
            'header[role="banner"]',
            '#hero-tagline',
            '#hero-supporting',
            '#hero-buttons',
            '#hero-stats',
            '#hero-sticker',
            '#hero-marquee',
          ]
          heroElements.forEach((sel) => {
            const el = document.querySelector<HTMLElement>(sel)
            if (el) {
              el.style.opacity = '1'
              el.style.transform = 'none'
            }
          })
        })
    }

    whenRevealed().then(() => {
      if (isCleanedUp) return
      logAnimationStart('Landing Hero GSAP Timeline')
      runHeroTimeline()
    })

    return () => {
      isCleanedUp = true
      if (ctx) ctx.revert()
    }
  }, [])

  const handlePrefetchEvents = () => {
    router.preloadRoute({ to: '/events' })
  }

  return (
    <div className="relative w-full">
      {/* 1. HERO */}
      <section
        id="hero"
        data-in-hero="true"
        className="relative min-h-[90vh] pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col justify-between border-b-2 border-bone/20 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10 space-y-12">
          {/* Main Hero Header */}
          <div className="space-y-6 max-w-4xl relative">
            {/* Wordmark Headline (1.3s character masked rise starting on first painted frame) */}
            <div className="space-y-2">
              <h1 className="hero-title-text font-display font-black tracking-tight text-bone uppercase">
                <SplitText text="OFFSCRIPT" tag="span" isHeroTitle />
              </h1>

              {/* Typographic Outlined #beoffscript with Typing Loop */}
              <div id="hero-tagline">
                <HeroTagline />
              </div>
            </div>

            {/* Friendly One-Line Statement */}
            <p id="hero-supporting" className="hero-para-text font-sans text-bone/75 max-w-xl leading-relaxed">
              Your campus. Your events. Zero boring. Discover and grab your passes for hackathons, jams, and festivals in seconds.
            </p>

            {/* Action Buttons: Explore Events navigates to /events with prefetch */}
            <div id="hero-buttons" className="w-fit flex flex-wrap items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                magnetic
                onClick={() => navigate({ to: '/events' })}
                onMouseEnter={handlePrefetchEvents}
                onFocus={handlePrefetchEvents}
                cursorLabel="Explore"
              >
                Explore Events
              </Button>
              <button
                type="button"
                className="btn-chamfer-outline text-sm px-6 py-3.5 font-bold tracking-wider"
                onClick={() => {
                  scrollTo('#lineup', {
                    offset: -96,
                    duration: 0.9,
                    easing: easeOutExpo,
                  })
                }}
                onMouseEnter={() => setCursor('button', 'Lineup')}
                onMouseLeave={resetCursor}
              >
                <span>See Lineup</span>
              </button>
            </div>

            {/* Floating Sticker Badge (Part 8) */}
            <div
              id="hero-sticker"
              className="absolute right-0 top-4 hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-volt text-ink font-mono text-xs font-black uppercase tracking-wider rotate-6 border-2 border-ink shadow-2xl select-none pointer-events-none"
            >
              <span className="w-2 h-2 bg-ink rotate-45" />
              <span>2026 EDITION</span>
            </div>
          </div>

          {/* Hero Stage (Mobile in-flow between buttons and stats, Desktop on right of hero) */}
          <HeroStage />

          {/* Hero Ticket Strip with Data Barcode */}
          <HeroTicketStrip />
        </div>
      </section>

      {/* 2. VELOCITY-REACTIVE MARQUEE */}
      <div id="hero-marquee">
        <VelocityMarquee />
      </div>

      {/* 3. FEATURED VERTICAL STACKING PASSES (Below the fold: revealed by scroll reveal) */}
      {isLoading ? (
        <section id="featured" data-reveal="card" className="py-24 border-b-2 border-bone/15 bg-ink" style={{ contentVisibility: 'auto', containIntrinsicSize: '600px' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="w-64 h-8 bg-bone/10 animate-pulse" />
            <div className="grid grid-cols-1 gap-6">
              <EventCardSkeleton />
            </div>
          </div>
        </section>
      ) : hasCachedData ? (
        <Suspense
          fallback={
            <section id="featured" className="py-24 border-b-2 border-bone/15 bg-ink">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="w-64 h-8 bg-bone/10 animate-pulse" />
                <div className="grid grid-cols-1 gap-6">
                  <EventCardSkeleton />
                </div>
              </div>
            </section>
          }
        >
          <div data-reveal="rail" style={{ contentVisibility: 'auto', containIntrinsicSize: '650px' }}>
            <LazyFeaturedStack events={events} />
          </div>
        </Suspense>
      ) : isError || isOffline ? (
        <section id="featured" className="py-16 border-b-2 border-bone/15 bg-ink">
          <SectionError
            title="Featured Passes Unavailable"
            message={error instanceof Error ? error.message : 'Could not fetch featured passes.'}
            onRetry={() => refetch()}
          />
        </section>
      ) : null}

      {/* 4. COUNTDOWN SECTION */}
      <Suspense fallback={<div className="h-48 bg-ink border-b-2 border-bone/15 animate-pulse" />}>
        <div data-reveal="card" style={{ contentVisibility: 'auto', containIntrinsicSize: '400px' }}>
          <LazyCountdownSection events={events} />
        </div>
      </Suspense>

      {/* 5. SLIM BROWSE ALL EVENTS STRIP (In place of All events grid) */}
      <div data-reveal="rail" style={{ contentVisibility: 'auto', containIntrinsicSize: '200px' }}>
        <BrowseAllStrip
          totalEvents={stats.totalEvents}
          openRegistrations={stats.openEvents}
        />
      </div>

      {/* 6. WHY OFFSCRIPT (3 SIGNATURE HOVER CARDS) - container revealed, hover content unchanged */}
      <Suspense fallback={<div className="h-64 bg-ink border-b-2 border-bone/15 animate-pulse" />}>
        <div data-reveal="card" style={{ contentVisibility: 'auto', containIntrinsicSize: '500px' }}>
          <LazyWhySection />
        </div>
      </Suspense>

      {/* 7. SPONSORS MARQUEE */}
      <Suspense fallback={<div className="h-32 bg-ink border-b-2 border-bone/15 animate-pulse" />}>
        <div data-reveal="card" style={{ contentVisibility: 'auto', containIntrinsicSize: '250px' }}>
          <LazySponsorsSection />
        </div>
      </Suspense>

      {/* 8. EVENT LINEUP (HORIZONTAL STICKY SCROLL - LAST SECTION BEFORE FOOTER) */}
      {isLoading ? (
        <section id="lineup" data-reveal="card" className="py-20 border-b-2 border-bone/20 bg-ink">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="w-48 h-8 bg-bone/10 animate-pulse" />
            <EventCardSkeleton />
          </div>
        </section>
      ) : hasCachedData ? (
        <Suspense
          fallback={
            <section id="lineup" className="py-20 border-b-2 border-bone/20 bg-ink">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                <div className="w-48 h-8 bg-bone/10 animate-pulse" />
                <EventCardSkeleton />
              </div>
            </section>
          }
        >
          <div data-reveal="card">
            <LazyLineupSection events={events} />
          </div>
        </Suspense>
      ) : (
        <section id="lineup" className="py-16 border-b-2 border-bone/20 bg-ink">
          <SectionError
            title="Lineup Unavailable"
            message="Lineup passes could not be synchronized."
            onRetry={() => refetch()}
          />
        </section>
      )}
    </div>
  )
}
export default LandingPage

