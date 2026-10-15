import { useMemo, useState, useEffect, useCallback } from 'react'
import { useParams, Link, useRouter } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { Stamp } from '@/components/ui/Stamp'
import { Button } from '@/components/ui/Button'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { SeatsBar } from '@/components/events/SeatsBar'
import { SplitText } from '@/components/effects/SplitText'
import { EventRail } from '@/components/events/EventRail'
import { SectionError } from '@/components/ui/SectionError'
import { SkeletonBlock } from '@/components/ui/Skeletons'
import { FlipCardBento } from '@/components/events/FlipCardBento'
import { lazy, Suspense } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

const LazyOpenFullPanel = lazy(() => import('@/components/events/OpenFullPanel'))
import { useCountdown } from '@/hooks/useCountdown'
import { useEventDetailQuery, useEventsQuery } from '@/features/events/queries'
import { MOTION, scaleMs } from '@/lib/motion'
import {
  formatEventDateTime,
  formatTeamSize,
} from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { REGISTRATION_URL_BASE } from '@/lib/config'
import type { EventDetail } from '@/types/event'

export function EventDetailPage() {
  const router = useRouter()
  const { eventId } = useParams({ strict: false }) as { eventId: string }
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Route shutter transition readiness (starts when shutter reveal is ~60% done)
  const [isShutterReady, setIsShutterReady] = useState(() => Boolean(isLite || prefersReduced))

  useEffect(() => {
    const handleShutter60 = () => {
      setIsShutterReady(true)
    }
    window.addEventListener('offscript:shutter-reveal-60', handleShutter60)
    // Direct load fallback timer
    const fallbackTimer = setTimeout(() => {
      setIsShutterReady(true)
    }, scaleMs(1400))

    return () => {
      window.removeEventListener('offscript:shutter-reveal-60', handleShutter60)
      clearTimeout(fallbackTimer)
    }
  }, [])
  const { data: allEventsData } = useEventsQuery()
  const allEvents = useMemo(() => allEventsData?.events ?? [], [allEventsData?.events])

  // Instant paint: use list cache summary for hero headers while detail request resolves
  const cachedSummary = useMemo(
    () => (allEvents.find((e) => e.id === eventId) as EventDetail | undefined) || null,
    [allEvents, eventId]
  )

  const {
    data: detailEvent,
    isLoading: isDetailLoading,
    isError,
    error,
    refetch,
  } = useEventDetailQuery(eventId)

  const event: EventDetail | null = detailEvent || cachedSummary

  const [imageError, setImageError] = useState(false)
  const [shakeDisabled, setShakeDisabled] = useState(false)
  const [activeTabOverride, setActiveTabOverride] = useState<string | null>(null)
  const [openFullCardId, setOpenFullCardId] = useState<string | null>(null)
  const [originatingElement, setOriginatingElement] = useState<HTMLElement | null>(null)

  const availableCardIds = useMemo(
    () => [
      'overview',
      'highlights',
      'expect',
      'eligibility',
      'prerequisites',
      'rules',
      'schedule',
      'prizes',
      'faqs',
      'gallery',
      'contact',
    ],
    []
  )

  const countdown = useCountdown(event?.registration_deadline)

  // Dynamic SEO updating
  useEffect(() => {
    if (event?.name) {
      document.title = `${event.name} — OFFSCRIPT`
      const metaDesc = document.querySelector('meta[name="description"]')
      if (metaDesc && event.blurb) {
        metaDesc.setAttribute('content', event.blurb)
      }
    }
    return () => {
      document.title = 'OFFSCRIPT — #beoffscript | Event Discovery Platform'
    }
  }, [event?.name, event?.blurb])

  const handleDisabledClick = () => {
    setShakeDisabled(true)
    setTimeout(() => setShakeDisabled(false), 500)
  }

  // Related events calculation
  const relatedEvents = useMemo(() => {
    if (!event) return []
    const sameCat = allEvents.filter((e) => e.id !== event.id && e.category === event.category)
    const otherCat = allEvents.filter((e) => e.id !== event.id && e.category !== event.category)
    return [...sameCat, ...otherCat].slice(0, 6)
  }, [event, allEvents])

  // Prev / Next event navigation
  const { prevEvent, nextEvent } = useMemo(() => {
    if (!event || allEvents.length === 0) return { prevEvent: null, nextEvent: null }
    const currentIndex = allEvents.findIndex((e) => e.id === event.id)
    if (currentIndex === -1) return { prevEvent: null, nextEvent: null }

    const prev = currentIndex > 0 ? allEvents[currentIndex - 1] : allEvents[allEvents.length - 1]
    const next = currentIndex < allEvents.length - 1 ? allEvents[currentIndex + 1] : allEvents[0]
    return { prevEvent: prev, nextEvent: next }
  }, [event, allEvents])

  // Coordinated pass navigation with card exit and shutter overlap
  const handlePassNavigation = useCallback(
    (to: string, params?: Record<string, string>) => {
      // Clean up open full panel and flipped state first
      setOpenFullCardId(null)

      if (isLite || prefersReduced) {
        router.navigate({ to: to as any, params: params as any })
        return
      }

      // Exit sequence: cards fly toward viewer for 300ms before router navigation triggers curtain
      let navigated = false
      const proceed = () => {
        if (navigated) return
        navigated = true
        router.navigate({ to: to as any, params: params as any })
      }

      setTimeout(proceed, scaleMs(300))
      setTimeout(proceed, scaleMs(MOTION.eventDetailExit.failsafe * 1000)) // 0.8s failsafe
    },
    [isLite, prefersReduced, router]
  )

  // Error state if event not found after fetch completes
  if (isError || (!event && !isDetailLoading)) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-24">
        <SectionError
          title="Pass Not Found"
          message={error instanceof Error ? error.message : `Event with ID "${eventId}" could not be loaded.`}
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  // Loading skeleton while event data is resolving
  if (!event && isDetailLoading) {
    return (
      <article className="relative w-full min-h-screen pb-32 select-none">
        {/* Top Breadcrumb Skeleton */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-4 flex items-center justify-between border-b-2 border-bone/15">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-4 w-32" />
        </div>

        {/* Hero Banner Skeleton */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          <div className="relative w-full aspect-[21/9] sm:aspect-[24/9] border-2 border-bone/25 overflow-hidden bg-bone/5">
            <SkeletonBlock className="w-full h-full" />
          </div>
          <div className="space-y-4 pt-2">
            <SkeletonBlock className="h-[55px] sm:h-14 w-3/4" />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-h-[53px] sm:min-h-0">
              <SkeletonBlock className="h-6 w-20" />
              <SkeletonBlock className="h-6 w-24" />
              <SkeletonBlock className="h-6 w-36" />
              <SkeletonBlock className="h-6 w-16" />
            </div>
          </div>
        </section>

        {/* Mobile Sticky Note Placeholder Skeleton */}
        <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <SkeletonBlock className="h-[178px] w-full" />
        </div>

        {/* Two Column Skeleton */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <SkeletonBlock className="h-8 w-44" />
              <div className="flex gap-6 min-h-[460px] border-2 border-bone/20 p-6 bg-bone/[0.02]">
                <div className="w-60 space-y-3 hidden md:block">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonBlock key={i} className="h-12 w-full" />
                  ))}
                </div>
                <div className="flex-1 space-y-4">
                  <SkeletonBlock className="h-6 w-1/3" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-5/6" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
              </div>
            </div>
            <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
              <div className="border-2 border-bone/20 p-6 space-y-4 bg-bone/[0.02]">
                <SkeletonBlock className="h-10 w-36" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-12 w-full" />
              </div>
              <div className="border-2 border-bone/20 p-6 bg-bone/[0.02]">
                <SkeletonBlock className="h-24 w-full" />
              </div>
            </aside>
          </div>
        </div>
      </article>
    )
  }

  if (!event) return null

  const isRegistrationOpen = event.registration_status === 'OPEN'
  const registrationHref = `${REGISTRATION_URL_BASE}?eventId=${encodeURIComponent(event.id)}`
  const rawHeroImage = imageError
    ? FALLBACK_COVER_IMAGE
    : event.banner_image_url || event.cover_image_url || FALLBACK_COVER_IMAGE

  const heroImageSrc = rawHeroImage.includes('images.pexels.com')
    ? `${rawHeroImage.split('?')[0]}?auto=compress&cs=tinysrgb&w=1200&fit=crop`
    : rawHeroImage

  // Formatted price string: large on one line ("Rs 300", or "Free" when 0), never wraps
  const priceDisplay =
    event.price === undefined || event.price === null || event.price === 0
      ? 'Free'
      : `Rs ${event.price.toLocaleString('en-IN')}`

  const priceBillingUnit = event.is_per_head ? 'per person' : 'per team'

  // STICKY NOTE: "Who can participate"
  // Shows ONLY the team size line and the first eligibility item, with a small "All eligibility" link
  const firstEligibility = detailEvent?.eligibility?.[0]

  const stickyNote = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      transition={{ type: 'spring', damping: 14, stiffness: 220 }}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
      }}
      className="relative bg-volt text-ink p-5 sm:p-6 border-2 border-ink/40 rotate-[-2deg] shadow-xl select-none h-[178px] flex flex-col justify-between"
    >
      {/* Translucent tape strip on top */}
      <div
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-bone/50 border border-bone/60 rotate-1 shadow-sm pointer-events-none"
      />

      {/* Folded corner flap */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-[22px] h-[22px] bg-ink/25 pointer-events-none"
      />

      <div className="space-y-3">
        <div className="space-y-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink/70 font-black block">
            ENTRY NOTE
          </span>
          <h3 className="font-display italic font-black text-xl text-ink leading-tight">
            Who can participate
          </h3>
        </div>

        {/* Team Size line */}
        <div className="font-mono text-xs text-ink/90 font-bold border-b border-ink/20 pb-2">
          <span>Team: {formatTeamSize(event.min_teamsize, event.max_teamsize)}</span>
        </div>

        {/* First eligibility item only */}
        <div className="space-y-2 font-sans text-xs text-ink/90 font-medium leading-snug">
          {firstEligibility ? (
            <div className="flex items-start gap-1.5">
              <span className="font-mono font-bold text-ink">›</span>
              <span className="line-clamp-2">{firstEligibility}</span>
            </div>
          ) : (
            <p>Open for all registered university students with valid student ID card.</p>
          )}

          {/* Link that switches to Eligibility tab */}
          <button
            type="button"
            onClick={() => setActiveTabOverride('eligibility')}
            className="font-mono text-[10px] uppercase font-black tracking-wider text-ink underline hover:opacity-80 block pt-1 text-left"
          >
            All eligibility →
          </button>
        </div>
      </div>
    </motion.div>
  )

  // STICKY INFO TICKET PANEL (Static Ticket silhouette, no tear)
  const infoTicketStub = (
    <div className="h-full flex flex-col justify-between items-center py-2 font-mono select-none w-full">
      <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-black -rotate-90 py-4">
        ADMIT ONE
      </span>
      <div className="space-y-1 text-center">
        <span className="font-mono text-[8px] text-bone/40 uppercase block">SERIAL</span>
        <span className="font-mono text-[10px] text-volt font-black tracking-wider">
          #{(event.id || 'PASS').substring(0, 8).toUpperCase()}
        </span>
      </div>
      <div className="pt-2">
        <TicketBarcode id={event.id} className="w-16" />
      </div>
    </div>
  )

  const infoTicketPanel = (
    <TicketShape
      id={event.id}
      tearOnHover={false} // Static ticket silhouette, no tear
      stubContent={infoTicketStub}
      stubWidth={120}
      className="w-full shadow-2xl"
    >
      <div className="space-y-5 p-2 select-none">
        {/* Price Block: Single line with "per team" or "per person" beneath it, never wraps */}
        <div className="space-y-1 border-b border-bone/15 pb-3">
          <div className="whitespace-nowrap font-display font-black text-3xl sm:text-4xl text-volt tracking-tight">
            {priceDisplay}
          </div>
          <span className="font-mono text-[11px] uppercase text-bone/60 font-bold block pt-0.5">
            {priceBillingUnit}
          </span>
          <span className="font-mono text-xs text-bone/70 block pt-1.5">
            Team: {formatTeamSize(event.min_teamsize, event.max_teamsize)}
          </span>
        </div>

        {/* Live Seats Bar */}
        <div className="space-y-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-bone/50 block">
            Seat Occupancy
          </span>
          <SeatsBar
            filled={event.seats_filled}
            total={event.total_seats}
            status={event.registration_status}
          />
        </div>

        {/* Deadline with Flip Countdown */}
        <div className="space-y-2 border-t border-bone/15 pt-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-volt font-bold block">
            Registration Closing In
          </span>
          <div className="grid grid-cols-4 gap-1 text-center font-mono">
            <div className="border border-bone/20 p-1.5 bg-bone/[0.02]">
              <span className="text-lg font-black text-bone block leading-none">{countdown.days}</span>
              <span className="text-[8px] uppercase text-bone/40 block pt-0.5">D</span>
            </div>
            <div className="border border-bone/20 p-1.5 bg-bone/[0.02]">
              <span className="text-lg font-black text-bone block leading-none">{countdown.hours}</span>
              <span className="text-[8px] uppercase text-bone/40 block pt-0.5">H</span>
            </div>
            <div className="border border-bone/20 p-1.5 bg-bone/[0.02]">
              <span className="text-lg font-black text-bone block leading-none">{countdown.minutes}</span>
              <span className="text-[8px] uppercase text-bone/40 block pt-0.5">M</span>
            </div>
            <div className="border border-bone/20 p-1.5 bg-bone/[0.02]">
              <span className="text-lg font-black text-bone block leading-none">{countdown.seconds}</span>
              <span className="text-[8px] uppercase text-bone/40 block pt-0.5">S</span>
            </div>
          </div>
        </div>

        {/* Register CTA Button */}
        <div className="pt-2">
          {isRegistrationOpen ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              href={registrationHref}
              target="_blank"
              rel="noreferrer"
              cursorLabel="Register"
            >
              Register Now
            </Button>
          ) : (
            <button
              type="button"
              onClick={handleDisabledClick}
              className={`w-full py-3.5 px-4 border-2 border-bone/30 bg-bone/5 text-bone/50 font-mono text-xs uppercase font-bold tracking-wider cursor-not-allowed ${
                shakeDisabled ? 'animate-shake' : ''
              }`}
            >
              Registration Closed
            </button>
          )}
        </div>
      </div>
    </TicketShape>
  )

  return (
    <article className="relative w-full min-h-screen pb-32 select-none">
      {/* 1. TOP BREADCRUMB & PREV/NEXT PASS */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-4 flex items-center justify-between font-mono text-xs text-bone/60 border-b-2 border-bone/15">
        <Link
          to="/events"
          onClick={(e) => {
            e.preventDefault()
            handlePassNavigation('/events')
          }}
          className="flex items-center gap-2 hover:text-volt transition-colors font-bold uppercase"
        >
          <span>← All Events</span>
        </Link>

        <div className="flex items-center gap-4">
          {prevEvent && (
            <Link
              to="/events/$eventId"
              params={{ eventId: prevEvent.id }}
              onClick={(e) => {
                e.preventDefault()
                handlePassNavigation('/events/$eventId', { eventId: prevEvent.id })
              }}
              className="hover:text-volt transition-colors font-bold uppercase flex items-center gap-1"
            >
              <span>[← Prev Pass]</span>
            </Link>
          )}
          {nextEvent && (
            <Link
              to="/events/$eventId"
              params={{ eventId: nextEvent.id }}
              onClick={(e) => {
                e.preventDefault()
                handlePassNavigation('/events/$eventId', { eventId: nextEvent.id })
              }}
              className="hover:text-volt transition-colors font-bold uppercase flex items-center gap-1"
            >
              <span>[Next Pass →]</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. HERO: FULL-BLEED TICKET BANNER WITH MASKED UNMASK */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <motion.div
          initial={{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
          animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full aspect-[21/9] sm:aspect-[24/9] border-2 border-bone/25 overflow-hidden bg-bone/5 group"
        >
          <img
            src={heroImageSrc}
            alt={event.banner_image_alt || event.name}
            onError={() => setImageError(true)}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />

          {/* Stamp Badge Overlay */}
          <div className="absolute top-4 left-4 z-10">
            <Stamp variant="volt" rotate={-2}>
              {event.category || 'CAMPUS PASS'}
            </Stamp>
          </div>

          {/* Semicircle Notches */}
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ink border-2 border-bone/25 rounded-full z-10" />
          <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-ink border-2 border-bone/25 rounded-full z-10" />
        </motion.div>

        {/* Big Event Name & Info Pills */}
        <div className="space-y-4 pt-2">
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="font-display font-black text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-bone leading-[0.95] min-h-[55px] sm:min-h-0"
          >
            <SplitText text={event.name} tag="span" />
          </motion.h1>

          {/* Meta Info Pills */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs text-bone/80 min-h-[53px] sm:min-h-0">
            <Badge variant="volt">{event.category || 'GENERAL'}</Badge>
            <Badge variant="outline">{event.event_mode || 'OFFLINE'}</Badge>
            <Badge variant="outline">
              {formatEventDateTime(event.schedule_summary?.start_date, event.schedule_summary?.start_time)}
            </Badge>
            <Badge variant="outline">{priceDisplay}</Badge>
          </div>
        </div>
      </section>

      {/* MOBILE ONLY: STICKY NOTE DIRECTLY AFTER HERO */}
      <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-6 h-[202px]">
        {stickyNote}
      </div>

      {/* 3. TWO COLUMNS LAYOUT: LEFT TEAR-OFF TAB DECK, RIGHT STICKY STACK */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: FLIP CARDS BENTO GRID */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <AnimatePresence mode="wait">
              <FlipCardBento
                key={event.id}
                event={detailEvent || event}
                isDetailLoading={isDetailLoading}
                isDetailError={isError}
                onRetry={() => refetch()}
                onOpenFull={(cardId, originatingEl) => {
                  setOpenFullCardId(cardId)
                  setOriginatingElement(originatingEl || null)
                }}
                activeCardOverride={activeTabOverride}
                isShutterReady={isShutterReady}
              />
            </AnimatePresence>

            {/* Tags & Meta Details */}
            {event.tags && event.tags.length > 0 && (
              <div className="pt-6 border-t-2 border-bone/15 space-y-3">
                <span className="font-mono text-xs uppercase text-bone/50 tracking-wider block">
                  CATEGORIES & TAGS
                </span>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 border border-bone/20 font-mono text-xs uppercase text-bone/80 bg-bone/[0.02]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: STICKY STACK (Info Ticket + Sticky Note) */}
          <aside className="lg:col-span-5 xl:col-span-4 sticky top-28 space-y-6">
            {/* 1. Ticket Info Panel (Static ticket silhouette, no tear) */}
            {infoTicketPanel}

            {/* 2. Sticky Note on Desktop */}
            <div className="hidden lg:block pt-2">
              {stickyNote}
            </div>
          </aside>
        </div>
      </div>

      {/* 4. RELATED PASSES RAIL (Static TicketShape Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 border-t-2 border-bone/15 mt-20">
        <EventRail
          events={relatedEvents}
          title="More Campus Passes"
          subtitle="EXPLORE MORE"
        />
      </section>

      {/* 5. OPEN FULL PANEL (Shared Layout / Bottom Sheet) */}
      {openFullCardId && (
        <Suspense fallback={null}>
          <LazyOpenFullPanel
            cardId={openFullCardId}
            event={detailEvent || event}
            availableCardIds={availableCardIds}
            onClose={() => setOpenFullCardId(null)}
            onNavigate={(nextId) => setOpenFullCardId(nextId)}
            originatingElement={originatingElement}
          />
        </Suspense>
      )}
    </article>
  )
}
