import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, useMotionValue } from 'motion/react'
import gsap from 'gsap'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { RegisterButton } from '@/components/ui/RegisterButton'
import { formatPrice } from '@/lib/formatters'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { MOTION_SCALE } from '@/lib/motion'
import type { Event } from '@/types/event'

interface LineupSectionProps {
  events: Event[]
  isLoading?: boolean
  isError?: boolean
}

/**
 * Filter and sort lineup events:
 * 1. Sort by schedule_summary start date and time ascending (+05:30 offset).
 * 2. Take upcoming events first (from now).
 * 3. If fewer than 8 upcoming, fill with most recent past ones marked 'COMPLETED'.
 * 4. Max 8 tickets.
 */
export function getLineupEvents(events: Event[]): Event[] {
  const now = Date.now()

  const parseEventTime = (e: Event): number => {
    const dateStr = e.schedule_summary?.start_date || e.registration_deadline || ''
    const timeStr = e.schedule_summary?.start_time || '00:00'
    if (!dateStr) return 0
    const isoString = dateStr.includes('T')
      ? dateStr
      : `${dateStr}T${timeStr.length === 5 ? timeStr : '00:00'}:00+05:30`
    const parsed = new Date(isoString).getTime()
    return Number.isNaN(parsed) ? 0 : parsed
  }

  // Sort ascending by start time
  const sorted = [...events].sort((a, b) => parseEventTime(a) - parseEventTime(b))

  const upcoming = sorted.filter(
    (e) => parseEventTime(e) >= now && e.event_status !== 'COMPLETED'
  )

  const past = sorted
    .filter((e) => parseEventTime(e) < now || e.event_status === 'COMPLETED')
    .sort((a, b) => parseEventTime(b) - parseEventTime(a)) // Most recent past first

  let chosen = upcoming.slice(0, 8)
  if (chosen.length < 8) {
    const needed = 8 - chosen.length
    chosen = [...chosen, ...past.slice(0, needed)]
  }

  const final8 = chosen.slice(0, 8)

  // Verification log required by prompt
  if (import.meta.env.DEV) {
    console.debug(
      '[Lineup] 8 chosen events (upcoming first, +05:30):',
      final8.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.schedule_summary?.start_date,
        time: e.schedule_summary?.start_time,
        status: e.event_status,
      }))
    )
  }

  return final8
}

function parseDateComponents(dateStr?: string) {
  if (!dateStr) return { day: '--', month: 'TBA' }
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) {
    return { day: dateStr.slice(-2), month: 'TBA' }
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  return { day, month }
}

export function LineupSection({ events = [], isLoading, isError }: LineupSectionProps) {
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  const displayEvents = useMemo(() => getLineupEvents(events), [events])
  const total = displayEvents.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const isTransitioningRef = useRef(false)
  const failsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const topTicketRef = useRef<HTMLDivElement | null>(null)
  const dragX = useMotionValue(0)

  // Release transition lock helper
  const unlock = useCallback(() => {
    isTransitioningRef.current = false
    if (failsafeTimerRef.current) {
      clearTimeout(failsafeTimerRef.current)
      failsafeTimerRef.current = null
    }
  }, [])

  const setLock = useCallback(() => {
    isTransitioningRef.current = true
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
    failsafeTimerRef.current = setTimeout(unlock, 1000)
  }, [unlock])

  const goNext = useCallback(() => {
    if (total <= 1 || isTransitioningRef.current) return
    setLock()

    if (prefersReduced) {
      setCurrentIndex((prev) => (prev + 1) % total)
      unlock()
      return
    }

    if (isLite) {
      const el = topTicketRef.current
      if (el) {
        gsap.to(el, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            setCurrentIndex((prev) => (prev + 1) % total)
            gsap.set(el, { opacity: 1 })
            unlock()
          },
        })
      } else {
        setCurrentIndex((prev) => (prev + 1) % total)
        unlock()
      }
      return
    }

    // Full Mode Next Transition:
    // Top ticket slides off to the right while rotating ~8deg (0.5s, power2.in)
    // then goes to the back while the next ticket lifts into top position (0.45s)
    const el = topTicketRef.current
    if (el) {
      gsap.to(el, {
        x: 340,
        rotation: 8,
        opacity: 0,
        duration: 0.5 * MOTION_SCALE,
        ease: 'power2.in',
        onComplete: () => {
          setCurrentIndex((prev) => (prev + 1) % total)
          gsap.set(el, { x: 0, rotation: 0, opacity: 1 })
          unlock()
        },
      })
    } else {
      setCurrentIndex((prev) => (prev + 1) % total)
      unlock()
    }
  }, [total, prefersReduced, isLite, setLock, unlock])

  const goPrev = useCallback(() => {
    if (total <= 1 || isTransitioningRef.current) return
    setLock()

    if (prefersReduced) {
      setCurrentIndex((prev) => (prev - 1 + total) % total)
      unlock()
      return
    }

    if (isLite) {
      const el = topTicketRef.current
      if (el) {
        gsap.to(el, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            setCurrentIndex((prev) => (prev - 1 + total) % total)
            gsap.set(el, { opacity: 1 })
            unlock()
          },
        })
      } else {
        setCurrentIndex((prev) => (prev - 1 + total) % total)
        unlock()
      }
      return
    }

    // Full Mode Prev Transition:
    // Reverse slide: ticket swoops in from the right into top position
    const el = topTicketRef.current
    if (el) {
      gsap.fromTo(
        el,
        { x: 340, rotation: -8, opacity: 0 },
        {
          x: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.45 * MOTION_SCALE,
          ease: 'power2.out',
          onComplete: () => {
            unlock()
          },
        }
      )
      setCurrentIndex((prev) => (prev - 1 + total) % total)
    } else {
      setCurrentIndex((prev) => (prev - 1 + total) % total)
      unlock()
    }
  }, [total, prefersReduced, isLite, setLock, unlock])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'Escape') {
      // Escape explicitly does nothing per instructions
    }
  }

  // Jump to specific index from date index click
  const jumpToIndex = (targetIdx: number) => {
    if (targetIdx === currentIndex || isTransitioningRef.current) return
    setLock()
    setCurrentIndex(targetIdx)
    setTimeout(unlock, 300)
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current)
    }
  }, [])

  // SKELETON LOADING STATE
  if (isLoading) {
    return (
      <section
        id="lineup"
        className="relative w-full bg-ink select-none border-b-2 border-bone/20 py-16 px-4 sm:px-6"
      >
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b-2 border-bone/15 pb-4">
            <div className="h-8 w-48 bg-bone/10 animate-pulse clip-chamfer" />
            <div className="h-6 w-24 bg-bone/10 animate-pulse" />
          </div>
          <div className="relative h-[320px] max-w-xl mx-auto flex items-center justify-center">
            <div className="w-full h-64 border-2 border-bone/20 bg-bone/5 animate-pulse clip-chamfer" />
          </div>
        </div>
      </section>
    )
  }

  // EMPTY / ERROR STATE
  if (isError || total === 0) {
    return (
      <section
        id="lineup"
        className="relative w-full bg-ink select-none border-b-2 border-bone/20 py-20 px-4 sm:px-6"
      >
        <div className="max-w-xl mx-auto text-center space-y-4">
          <span className="w-2.5 h-2.5 bg-volt rotate-45 inline-block" />
          <h2 className="font-display text-2xl font-black uppercase text-bone">
            Lineup Passes
          </h2>
          <p className="font-mono text-xs text-bone/60">
            No passes currently scheduled in this cycle.
          </p>
          <div className="pt-2">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 font-mono text-xs text-volt uppercase font-black hover:underline"
            >
              <span>Browse all events</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const currentEvent = displayEvents[currentIndex]

  // Layer offsets and rotations for up to 4 cards
  // Base layers:
  // Layer 0: 0px, scale 1.0, 0deg
  // Layer 1: 14px, scale 0.96, -2deg (hover fan: 22px, -6deg)
  // Layer 2: 28px, scale 0.92, +1.5deg (hover fan: 40px, +4deg)
  // Layer 3: 42px, scale 0.88, -1deg (hover fan: 56px, -3deg)
  const layerTransforms = [
    { y: 0, scale: 1, rot: 0, fanY: 0, fanRot: 0, z: 30 },
    { y: 14, scale: 0.96, rot: -2, fanY: 22, fanRot: -6, z: 20 },
    { y: 28, scale: 0.9216, rot: 1.5, fanY: 40, fanRot: 4, z: 10 },
    { y: 42, scale: 0.8847, rot: -1, fanY: 56, fanRot: -3, z: 5 },
  ]

  return (
    <section
      id="lineup"
      className="relative w-full bg-ink select-none border-b-2 border-bone/20 py-16 sm:py-20 px-4 sm:px-6 content-auto"
    >
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Top Header Row: Title, Counter & Advance Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-bone/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-volt rotate-45 shrink-0" />
            <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone tracking-tight">
              Event Lineup
            </h2>
            <span className="hidden sm:inline-block font-mono text-xs text-bone/50 uppercase tracking-widest">
              UPCOMING PASSES
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs w-full sm:w-auto justify-between sm:justify-end">
            {/* Mono Counter ("03 / 08") */}
            <div className="flex items-center gap-1.5 text-bone/70" aria-label={`Pass ${currentIndex + 1} of ${total}`}>
              <span className="text-volt font-black text-sm">
                {String(currentIndex + 1).padStart(2, '0')}
              </span>
              <span>/</span>
              <span>{String(total).padStart(2, '0')}</span>
            </div>

            {/* Advance Chamfered Button Pair (Always visible on mobile) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous pass"
                className="clip-chamfer px-3.5 py-1.5 border border-bone/25 bg-bone/[0.03] hover:bg-bone/10 text-bone hover:text-volt font-mono text-xs uppercase font-bold tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
              >
                <span>←</span>
                <span className="hidden sm:inline">PREV</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next pass"
                className="clip-chamfer px-3.5 py-1.5 border border-volt bg-volt/10 hover:bg-volt hover:text-ink text-volt font-mono text-xs uppercase font-black tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt flex items-center gap-1 cursor-pointer min-h-[44px] min-w-[44px] justify-center"
              >
                <span className="hidden sm:inline">NEXT</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Deck Container with Accessibility polite region */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Campus event passes lineup"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt relative"
        >
          {/* A11y Live Polite Region */}
          <div className="sr-only" aria-live="polite">
            {`Ticket ${currentIndex + 1} of ${total}: ${currentEvent.name}`}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Desktop Date Index (Beside the deck, left column on desktop) */}
            <aside className="hidden lg:flex lg:col-span-3 flex-col space-y-1.5 border-r border-bone/15 pr-6 select-none">
              <span className="font-mono text-[10px] uppercase text-bone/40 tracking-wider pb-2 block">
                DATE INDEX
              </span>
              {displayEvents.map((ev, idx) => {
                const { day, month } = parseDateComponents(ev.schedule_summary?.start_date)
                const isActive = idx === currentIndex
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => jumpToIndex(idx)}
                    className={`text-left font-mono text-xs py-1.5 px-2.5 transition-colors flex items-center justify-between border ${
                      isActive
                        ? 'border-volt text-volt font-black bg-volt/[0.04]'
                        : 'border-transparent text-bone/60 hover:text-bone hover:border-bone/20'
                    }`}
                  >
                    <span>
                      {day} {month}
                    </span>
                    <span className="text-[10px] text-bone/40">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                  </button>
                )
              })}
            </aside>

            {/* Ticket Stack Deck: Clipped wrapper with vertical padding so rotated layers never cause horizontal overflow */}
            <div className="lg:col-span-9 relative w-full overflow-x-clip py-8 px-2 sm:px-4">
              <div
                className={`lineup-deck group relative w-full max-w-[560px] mx-auto min-h-[360px] sm:min-h-[290px] flex items-center justify-center ${
                  isLite || prefersReduced ? '' : 'desktop-hover-fan'
                }`}
                style={{ touchAction: 'pan-y' }}
              >
                {/* Render up to 4 layers (relative index 0 to 3) */}
                {Array.from({ length: Math.min(total, 4) }).map((_, layerIdx) => {
                  const eventIdx = (currentIndex + layerIdx) % total
                  const event = displayEvents[eventIdx]
                  const isTop = layerIdx === 0
                  const transform = layerTransforms[layerIdx]

                  const { day, month } = parseDateComponents(event.schedule_summary?.start_date)
                  const startTime = event.schedule_summary?.start_time || 'TBA'

                  // Stub date block
                  const dateStub = (
                    <div className="h-full w-full flex flex-row sm:flex-col justify-between items-center py-2 px-3 sm:px-1 font-mono select-none">
                      <div className="space-y-0.5 text-center">
                        <span className="font-display font-black text-2xl sm:text-3xl text-volt block leading-none">
                          {day}
                        </span>
                        <span className="font-mono text-[10px] text-bone/70 uppercase font-bold block">
                          {month}
                        </span>
                      </div>

                      <div className="text-center py-1">
                        <span className="font-mono text-[9px] text-bone/40 uppercase block">TIME</span>
                        <span className="font-mono text-[10px] text-bone/80 font-bold block truncate">
                          {startTime}
                        </span>
                      </div>

                      <div className="w-16 sm:w-20 pt-1 shrink-0 flex justify-center">
                        <TicketBarcode id={event.id} className="w-16 sm:w-20" />
                      </div>
                    </div>
                  )

                  if (isTop) {
                    return (
                      <motion.div
                        key={event.id}
                        ref={topTicketRef}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.35}
                        style={{
                          x: dragX,
                          touchAction: 'pan-y',
                          zIndex: transform.z,
                        }}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -80 || info.velocity.x < -300) {
                            goNext()
                          } else if (info.offset.x > 80 || info.velocity.x > 300) {
                            goPrev()
                          }
                        }}
                        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
                      >
                        <TicketShape
                          id={`lineup-${event.id}`}
                          stubContent={dateStub}
                          stubWidth={130}
                          tearOnHover={false}
                          className="w-full h-full shadow-2xl bg-ink"
                        >
                          <div className="flex flex-col justify-between h-full p-2 space-y-4">
                            <div className="space-y-2">
                              <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-black block">
                                {event.category || 'CAMPUS PASS'}
                              </span>
                              <h3 className="font-display text-lg sm:text-xl md:text-2xl font-black uppercase text-bone leading-tight line-clamp-2">
                                {event.name}
                              </h3>
                            </div>

                            <div className="space-y-3 pt-2 border-t border-dashed border-bone/20 font-mono text-xs">
                              <div className="flex items-center justify-between text-bone/70">
                                <span className="font-display font-black text-base sm:text-lg text-volt">
                                  {formatPrice(event.price, event.is_per_head)}
                                </span>
                                <span className="font-mono text-[10px] text-bone/60">
                                  {event.seats_left != null ? `${event.seats_left} SEATS LEFT` : 'OPEN SEATS'}
                                </span>
                              </div>

                              <div className="block w-full pt-1">
                                <RegisterButton
                                  event={event}
                                  variant="chamfered"
                                  size="sm"
                                  fullWidth
                                  cursorLabel="Register"
                                >
                                  Get Pass
                                </RegisterButton>
                              </div>
                            </div>
                          </div>
                        </TicketShape>
                      </motion.div>
                    )
                  }

                  // Background layers (clickable to advance)
                  return (
                    <div
                      key={event.id}
                      onClick={() => jumpToIndex(eventIdx)}
                      style={{
                        zIndex: transform.z,
                        transform: `translateY(${transform.y}px) scale(${transform.scale}) rotate(${transform.rot}deg)`,
                      }}
                      className={`lineup-layer-${layerIdx} absolute inset-0 w-full h-full transition-transform duration-400 ease-out cursor-pointer opacity-85 hover:opacity-100`}
                    >
                      <TicketShape
                        id={`lineup-layer-${layerIdx}-${event.id}`}
                        stubContent={dateStub}
                        stubWidth={130}
                        tearOnHover={false}
                        hoverStroke={false}
                        className="w-full h-full shadow-lg bg-ink pointer-events-none"
                      >
                        <div className="flex flex-col justify-between h-full p-2 space-y-4">
                          <div className="space-y-2">
                            <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-black block">
                              {event.category || 'CAMPUS PASS'}
                            </span>
                            <h3 className="font-display text-lg sm:text-xl md:text-2xl font-black uppercase text-bone leading-tight line-clamp-2">
                              {event.name}
                            </h3>
                          </div>
                          <div className="pt-2 border-t border-dashed border-bone/20 font-mono text-xs flex items-center justify-between text-bone/60">
                            <span className="font-bold text-volt">
                              {formatPrice(event.price, event.is_per_head)}
                            </span>
                            <span className="text-[10px]">
                              {event.seats_left != null ? `${event.seats_left} SEATS LEFT` : 'OPEN'}
                            </span>
                          </div>
                        </div>
                      </TicketShape>
                    </div>
                  )
                })}
              </div>

              {/* Mobile Dot Indicators */}
              <div className="flex lg:hidden items-center justify-center gap-2 pt-6">
                {displayEvents.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => jumpToIndex(idx)}
                    aria-label={`Jump to ticket ${idx + 1}`}
                    className={`h-1.5 transition-all ${
                      idx === currentIndex ? 'w-6 bg-volt' : 'w-1.5 bg-bone/30'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Slim Browse All Events Link */}
        <div className="text-center pt-2">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 font-mono text-xs text-bone/60 hover:text-volt uppercase font-bold tracking-wider transition-colors py-1 px-3 border border-bone/15 hover:border-volt/40 bg-bone/[0.02]"
          >
            <span>Browse all events</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Desktop hover fan CSS rules */}
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          .desktop-hover-fan:hover .lineup-layer-1 {
            transform: translateY(22px) scale(0.96) rotate(-6deg) !important;
          }
          .desktop-hover-fan:hover .lineup-layer-2 {
            transform: translateY(40px) scale(0.9216) rotate(4deg) !important;
          }
          .desktop-hover-fan:hover .lineup-layer-3 {
            transform: translateY(56px) scale(0.8847) rotate(-3deg) !important;
          }
        }
      `}</style>
    </section>
  )
}

export default LineupSection
