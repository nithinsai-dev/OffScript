import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useRouter } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { Stamp } from '@/components/ui/Stamp'
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
import { usePageRevealed, logAnimationStart } from '@/lib/pageReady'
import {
  formatEventDateTime,
  formatTeamSize,
} from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { RegisterButton } from '@/components/ui/RegisterButton'
import type { EventDetail } from '@/types/event'

export function EventDetailPage() {
  const router = useRouter()
  const { eventId } = useParams({ strict: false }) as { eventId: string }
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Page revealed coordination (awaits curtain/intro clear + 150ms)
  const isRevealed = usePageRevealed()
  const isShutterReady = isLite || prefersReduced || isRevealed

  const mobileMainRegisterRef = useRef<HTMLDivElement | null>(null)
  const [isMainRegisterInView, setIsMainRegisterInView] = useState(true)

  // Track whether mobile main register button is in viewport
  useEffect(() => {
    const el = mobileMainRegisterRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMainRegisterInView(entry.isIntersecting)
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Log hero animation start timestamp
  useEffect(() => {
    if (isRevealed) {
      logAnimationStart('Event Detail Hero')
    }
  }, [isRevealed])
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
  const [openFullCardId, setOpenFullCardId] = useState<string | null>(null)
  const [originatingElement, setOriginatingElement] = useState<HTMLElement | null>(null)
  const [isEligibilityExpanded, setIsEligibilityExpanded] = useState(false)

  const rawEligibility = detailEvent?.eligibility || event?.eligibility || []
  const eligibilityList = useMemo(
    () => rawEligibility.map((s) => (typeof s === 'string' ? s.trim() : String(s))).filter(Boolean),
    [rawEligibility]
  )

  const availableCardIds = useMemo(
    () => [
      'overview',
      'highlights',
      'expect',
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

        {/* Mobile Info Ticket & Sticky Note Skeleton */}
        <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
          <div className="border-2 border-bone/20 p-6 space-y-4 bg-bone/[0.02]">
            <SkeletonBlock className="h-10 w-36" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-12 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
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
            <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 space-y-6">
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
  // Shows team size, then the FULL eligibility list with small Ink diamond bullets.
  // Smoothly expands in place with 0.4s height animation. Protected against viewport overflow.
  const isLongList = eligibilityList.length > 4
  const visibleEligibility = isEligibilityExpanded || !isLongList ? eligibilityList : eligibilityList.slice(0, 4)
  const hasTeamSize = event?.min_teamsize != null || event?.max_teamsize != null

  const stickyNote = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ rotate: 0, scale: 1.01 }}
      transition={{ type: 'spring', damping: 16, stiffness: 220 }}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
      }}
      className="eligibility-sticky-note relative bg-volt text-ink p-5 sm:p-6 border-2 border-ink/40 rotate-[-1.5deg] shadow-xl select-none flex flex-col justify-between max-h-[calc(100vh-26rem)]"
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

      <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
        <div className="space-y-1 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink/70 font-black block">
            ENTRY NOTE
          </span>
          <h3 className="font-display italic font-black text-xl text-ink leading-tight">
            Who can participate
          </h3>
        </div>

        {/* Team Size line - only if available */}
        {hasTeamSize && (
          <div className="font-mono text-xs text-ink/90 font-bold border-b border-ink/20 pb-2 shrink-0">
            <span>Team: {formatTeamSize(event.min_teamsize, event.max_teamsize)}</span>
          </div>
        )}

        {/* Full Eligibility list with small Ink diamond bullets */}
        {eligibilityList.length > 0 && (
          <motion.div
            layout
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1 overflow-y-auto pr-1 space-y-2 overscroll-contain"
          >
            <ul className="space-y-1.5 font-sans text-xs text-ink/90 font-medium leading-snug">
              {visibleEligibility.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span
                    className="w-1.5 h-1.5 bg-ink rotate-45 shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <span className="flex-1">{item}</span>
                </li>
              ))}
            </ul>

            {/* Expand / Collapse toggle if > 4 items */}
            {isLongList && (
              <button
                type="button"
                onClick={() => setIsEligibilityExpanded((prev) => !prev)}
                className="font-mono text-[10px] uppercase font-black tracking-wider text-ink underline hover:opacity-80 block pt-1.5 text-left"
              >
                {isEligibilityExpanded ? 'Show less ↑' : `Show all (${eligibilityList.length}) ↓`}
              </button>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )

  // STICKY INFO TICKET PANEL (Static Ticket silhouette, no tear, full-height stretch, no overlap)
  const infoTicketStub = (
    <div className="h-full w-full flex flex-row sm:flex-col justify-between items-center py-3 px-4 sm:px-0 font-mono select-none relative self-stretch">
      {/* 1. TOP: Serial label + serial value */}
      <div className="space-y-0.5 text-left sm:text-center shrink-0">
        <span className="font-mono text-[8px] text-bone/40 uppercase tracking-wider block">SERIAL</span>
        <span className="font-mono text-[10px] text-volt font-black tracking-wider block truncate max-w-[95px]">
          #{(event.id || 'PASS').substring(0, 8).toUpperCase()}
        </span>
      </div>

      {/* 2. MIDDLE: Vertical "ADMIT ONE" in its own reserved slot using writing-mode: vertical-rl */}
      <div className="flex items-center justify-center sm:flex-1 my-0 sm:my-3 min-h-[20px] sm:min-h-[60px]">
        <span
          className="font-mono text-[10px] uppercase tracking-widest text-volt font-black select-none hidden sm:inline-block"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          ADMIT ONE
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-black select-none inline-block sm:hidden">
          ADMIT ONE
        </span>
      </div>

      {/* 3. BOTTOM: Barcode */}
      <div className="shrink-0 w-auto sm:w-full flex justify-center pt-0 sm:pt-2">
        <TicketBarcode id={event.id} className="w-14 sm:w-16" />
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
          <RegisterButton
            event={event}
            variant="chamfered"
            size="lg"
            fullWidth
            cursorLabel="Register"
          >
            Register Now
          </RegisterButton>
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

      {/* 2. HERO: FULL-BLEED TICKET BANNER */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        <TicketShape
          id="event-hero-banner"
          hasPerforation={false}
          bodyClassName="p-0"
          className="w-full aspect-[21/9] sm:aspect-[24/9] group overflow-hidden"
        >
          <motion.div
            initial={isLite || prefersReduced ? undefined : { clipPath: 'inset(100% 0 0 0)' }}
            animate={isLite || prefersReduced || isRevealed ? { clipPath: 'inset(0% 0 0 0)' } : { clipPath: 'inset(100% 0 0 0)' }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full relative"
          >
            <img
              src={heroImageSrc}
              alt={event.banner_image_alt || event.name}
              onError={() => setImageError(true)}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              width={1200}
              height={500}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />

            {/* Stamp Badge Overlay */}
            <div className="absolute top-4 left-4 z-10">
              <Stamp variant="volt" rotate={-2}>
                {event.category || 'CAMPUS PASS'}
              </Stamp>
            </div>
          </motion.div>
        </TicketShape>

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

      {/* MOBILE ONLY: INFO TICKET & STICKY NOTE DIRECTLY AFTER HERO (NON-STICKY) */}
      <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div ref={mobileMainRegisterRef}>
          {infoTicketPanel}
        </div>
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

          {/* RIGHT COLUMN: STICKY STACK (Desktop only: Info Ticket + Sticky Note) */}
          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-28 space-y-6">
            {/* 1. Ticket Info Panel (Static ticket silhouette, no tear) */}
            {infoTicketPanel}

            {/* 2. Sticky Note on Desktop */}
            <div className="pt-2">
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

      {/* MOBILE ONLY: BOTTOM-FIXED COMPACT REGISTER BAR (Only when main register button scrolled out of view) */}
      <AnimatePresence>
        {!isMainRegisterInView && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-ink/95 border-t-2 border-bone/25 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,12px))] backdrop-blur-md flex items-center justify-between gap-4 shadow-2xl"
          >
            <div className="space-y-0.5 min-w-0">
              <div className="font-display font-black text-xl text-volt leading-none truncate">
                {priceDisplay}
              </div>
              <span className="font-mono text-[10px] uppercase text-bone/60 block truncate">
                {priceBillingUnit} • {formatTeamSize(event.min_teamsize, event.max_teamsize)}
              </span>
            </div>

            <RegisterButton
              event={event}
              variant="chamfered"
              size="sm"
              cursorLabel="Register"
              className="py-2 px-4 text-xs font-bold font-mono tracking-wider shrink-0"
            >
              Register Now
            </RegisterButton>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}
