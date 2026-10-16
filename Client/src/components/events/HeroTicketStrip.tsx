import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useEventsQuery } from '@/features/events/queries'
import { useCursor } from '@/hooks/useCursor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { whenRevealed } from '@/lib/pageReady'
import type { Event } from '@/types/event'

export function HeroTicketStrip() {
  const { data, isLoading } = useEventsQuery()
  const navigate = useNavigate()
  const { setCursor, resetCursor } = useCursor()
  const prefersReduced = usePrefersReducedMotion()
  const containerRef = useRef<HTMLDivElement | null>(null)

  const events = useMemo(() => data?.events ?? [], [data?.events])

  // Real-time fest stats from API data (exact same logic as original boxes)
  const stats = useMemo(() => {
    const totalEvents = events.length
    const openEvents = events.filter((e) => e.registration_status === 'OPEN').length
    const remainingSeats = events.reduce(
      (acc, e) => acc + Math.max(0, (e.total_seats ?? 0) - (e.seats_filled ?? 0)),
      0
    )
    return { totalEvents, openEvents, remainingSeats }
  }, [events])

  // Log old vs new values once in dev (expected: 30, 24, 260)
  const loggedRef = useRef(false)
  useEffect(() => {
    if (import.meta.env.DEV && events.length > 0 && !loggedRef.current) {
      loggedRef.current = true
      console.log('[HeroTicketStrip] Stat verification (old vs new):', {
        liveEvents: stats.totalEvents,
        openEvents: stats.openEvents,
        seatsLeft: stats.remainingSeats,
      })
    }
  }, [events.length, stats])

  // Up to 30 events sorted by start date ascending
  const sortedEvents = useMemo(() => {
    return [...events]
      .sort((a, b) => {
        const dateA = new Date(a.schedule_summary?.start_date || (typeof a.start_date === 'string' ? a.start_date : 0)).getTime()
        const dateB = new Date(b.schedule_summary?.start_date || (typeof b.start_date === 'string' ? b.start_date : 0)).getTime()
        return dateA - dateB
      })
      .slice(0, 30)
  }, [events])

  // Max seats left among sorted events for bar height calculation
  const maxSeats = useMemo(() => {
    if (sortedEvents.length === 0) return 1
    const seats = sortedEvents.map((e) =>
      Math.max(0, (e.total_seats ?? 0) - (e.seats_filled ?? 0))
    )
    return Math.max(...seats, 1)
  }, [sortedEvents])

  // Animation states
  const [animationStarted, setAnimationStarted] = useState(false)
  const [displayLive, setDisplayLive] = useState(0)
  const [displayOpen, setDisplayOpen] = useState(0)
  const [displaySeats, setDisplaySeats] = useState(0)

  // Hover state for barcode bars on desktop
  const [hoveredEvent, setHoveredEvent] = useState<{
    event: Event
    seatsLeft: number
    rect: DOMRect | null
  } | null>(null)

  // Determine perf mode
  const isLite =
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-perf') === 'lite'

  // Trigger motion after whenRevealed()
  useEffect(() => {
    let active = true

    if (prefersReduced || isLite) {
      setDisplayLive(stats.totalEvents)
      setDisplayOpen(stats.openEvents)
      setDisplaySeats(stats.remainingSeats)
      setAnimationStarted(true)
      return
    }

    whenRevealed().then(() => {
      if (!active) return
      setAnimationStarted(true)

      const duration = 900 // 0.9s duration
      const startTime = performance.now()

      const step = (now: number) => {
        if (!active) return
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // power2.out easing: 1 - (1 - p)^2
        const eased = 1 - Math.pow(1 - progress, 2)

        setDisplayLive(Math.floor(eased * stats.totalEvents))
        setDisplayOpen(Math.floor(eased * stats.openEvents))
        setDisplaySeats(Math.floor(eased * stats.remainingSeats))

        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          setDisplayLive(stats.totalEvents)
          setDisplayOpen(stats.openEvents)
          setDisplaySeats(stats.remainingSeats)
        }
      }

      requestAnimationFrame(step)
    })

    return () => {
      active = false
    }
  }, [stats, prefersReduced, isLite])

  // Handle bar interaction
  const handleBarMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, event: Event) => {
      const seatsLeft = Math.max(0, (event.total_seats ?? 0) - (event.seats_filled ?? 0))
      const rect = e.currentTarget.getBoundingClientRect()
      setHoveredEvent({ event, seatsLeft, rect })
      setCursor('button', 'OPEN')
    },
    [setCursor]
  )

  const handleBarMouseLeave = useCallback(() => {
    setHoveredEvent(null)
    resetCursor()
  }, [resetCursor])

  const handleBarClick = useCallback(
    (event: Event) => {
      if (event.id) {
        navigate({ to: '/events/$eventId', params: { eventId: event.id } })
      }
    },
    [navigate]
  )

  // Track container width for narrow-laptop rule (< 700px)
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setIsNarrow(entry.contentRect.width < 670)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Empty / loading / skeleton fallback bars when data not yet ready
  const dummyBarCount = 24
  const barcodeAriaLabel = isLoading
    ? 'Event statistics barcode loading'
    : `${stats.totalEvents} events, ${stats.openEvents} open events, ${stats.remainingSeats} seats left in total`

  const renderBarcodeBars = () => {
    if (isLoading || sortedEvents.length === 0) {
      return Array.from({ length: dummyBarCount }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          style={{ height: `${25 + ((i * 13) % 65)}%` }}
          className="flex-1 min-w-[1.5px] max-w-[4px] bg-bone/25 shrink-0 opacity-40 animate-pulse"
        />
      ))
    }
    return sortedEvents.map((evt, idx) => {
      const seatsLeft = Math.max(0, (evt.total_seats ?? 0) - (evt.seats_filled ?? 0))
      const heightPct = Math.max(22, Math.round((seatsLeft / maxSeats) * 100))
      const isOpen = evt.registration_status === 'OPEN'
      const isHovered = hoveredEvent?.event.id === evt.id
      return (
        <div
          key={evt.id || idx}
          aria-hidden="true"
          onClick={() => handleBarClick(evt)}
          onMouseEnter={(e) => handleBarMouseEnter(e, evt)}
          onMouseLeave={handleBarMouseLeave}
          style={{
            height: `${heightPct}%`,
            transformOrigin: 'bottom',
            transition: isLite || prefersReduced
              ? 'opacity 0.3s ease'
              : 'transform 0.15s ease-out, background-color 0.15s ease-out',
            transitionDelay: isLite || prefersReduced ? '0s' : `${idx * 0.015}s`,
          }}
          className={`
            flex-1 min-w-[1.5px] max-w-[4px] shrink-0 cursor-pointer select-none
            ${isOpen ? 'bg-volt' : 'bg-bone/25'}
            ${isHovered ? '!bg-volt -translate-y-1 shadow-[0_0_8px_#D4FF3F]' : ''}
            ${animationStarted || prefersReduced || isLite ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0'}
          `}
        />
      )
    })
  }

  return (
    <div
      ref={containerRef}
      id="hero-stats"
      data-layout={isNarrow ? 'two-row' : 'single-row'}
      className="relative w-full pt-8 border-t-2 border-bone/15 select-none"
    >
      {/* Ticket Strip Card Container with shared inward corner notches */}
      <div className="relative bg-ink border-2 border-bone/25 shadow-xl overflow-hidden p-0">
        {/* Inward concave corner scoops */}
        <span
          aria-hidden="true"
          className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-ink border-2 border-bone/25 pointer-events-none z-20"
        />
        <span
          aria-hidden="true"
          className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-ink border-2 border-bone/25 pointer-events-none z-20"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-ink border-2 border-bone/25 pointer-events-none z-20"
        />
        <span
          aria-hidden="true"
          className="absolute -bottom-2.5 -right-2.5 w-5 h-5 rounded-full bg-ink border-2 border-bone/25 pointer-events-none z-20"
        />

        {isNarrow ? (
          /* Narrow / Mobile Two-Row Layout: Numbers on Row 1, Full-width Barcode on Row 2 */
          <div className="flex flex-col items-stretch min-h-[148px]">
            {/* Top Row: 3 Stat Cells */}
            <div className="grid grid-cols-3 items-stretch relative">
              {/* Cell 1: Live Events */}
              <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0">
                <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                  Live Events
                </span>
                <span className="font-display text-2xl sm:text-3xl font-black text-bone block tabular-nums min-w-[2.5ch] tracking-tight mt-0.5">
                  {isLoading ? '--' : animationStarted ? displayLive : stats.totalEvents}
                </span>
              </div>

              {/* Dotted Perforation Line 1 */}
              <div
                className={`absolute top-0 bottom-0 left-1/3 w-[1px] border-r border-dashed border-bone/25 transition-transform duration-400 origin-top pointer-events-none ${
                  animationStarted || prefersReduced || isLite ? 'scale-y-100' : 'scale-y-0'
                }`}
              >
                <span aria-hidden="true" className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
                <span aria-hidden="true" className="absolute -bottom-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              </div>

              {/* Cell 2: Open Events */}
              <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0 border-x border-bone/10">
                <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                  Open Events
                </span>
                <span className="font-display text-2xl sm:text-3xl font-black text-volt block tabular-nums min-w-[2.5ch] tracking-tight mt-0.5">
                  {isLoading ? '--' : animationStarted ? displayOpen : stats.openEvents}
                </span>
              </div>

              {/* Dotted Perforation Line 2 */}
              <div
                className={`absolute top-0 bottom-0 left-2/3 w-[1px] border-r border-dashed border-bone/25 transition-transform duration-400 origin-top pointer-events-none ${
                  animationStarted || prefersReduced || isLite ? 'scale-y-100' : 'scale-y-0'
                }`}
              >
                <span aria-hidden="true" className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
                <span aria-hidden="true" className="absolute -bottom-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              </div>

              {/* Cell 3: Seats Left */}
              <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0">
                <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                  Seats Left
                </span>
                <span className="font-display text-2xl sm:text-3xl font-black text-bone block tabular-nums min-w-[3.5ch] tracking-tight mt-0.5">
                  {isLoading ? '--' : animationStarted ? displaySeats : stats.remainingSeats}
                </span>
              </div>
            </div>

            {/* Horizontal Perforation Line */}
            <div
              className={`relative h-[1px] w-full border-b border-dashed border-bone/25 transition-transform duration-400 origin-left pointer-events-none ${
                animationStarted || prefersReduced || isLite ? 'scale-x-100' : 'scale-x-0'
              }`}
            >
              <span aria-hidden="true" className="absolute -left-2 -top-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span aria-hidden="true" className="absolute -right-2 -top-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
            </div>

            {/* Bottom Row: Full-width Barcode Stub */}
            <div
              role="img"
              aria-label={barcodeAriaLabel}
              className="p-3 sm:p-4 flex flex-col justify-between items-center bg-bone/[0.02]"
            >
              <div
                className="relative flex items-end justify-center h-[56px] w-full max-w-full overflow-hidden px-1"
                style={{ gap: 'var(--barcode-bar-gap, 2px)' }}
              >
                {renderBarcodeBars()}
                {!isLite && !prefersReduced && (
                  <div
                    aria-hidden="true"
                    className="barcode-idle-sweep pointer-events-none absolute inset-0 w-8 bg-gradient-to-r from-transparent via-volt/40 to-transparent -translate-x-full"
                  />
                )}
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-bone/50 uppercase tracking-widest pt-1.5 text-center">
                1 BAR = 1 EVENT
              </div>
            </div>
          </div>
        ) : (
          /* Flexible Single-Row Layout: 3 cells (minmax 110px, 1fr) + Perforation (1px) + Barcode Stub (minmax 180px, 1.3fr) */
          <div className="grid grid-cols-[repeat(3,minmax(110px,1fr))_1px_minmax(180px,1.3fr)] items-stretch min-h-[120px]">
            {/* Cell 1: Live Events */}
            <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0">
              <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                Live Events
              </span>
              <span className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-bone block tabular-nums min-w-[2.5ch] tracking-tight mt-0.5">
                {isLoading ? '--' : animationStarted ? displayLive : stats.totalEvents}
              </span>
            </div>

            {/* Cell 2: Open Events */}
            <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0 relative border-l border-dashed border-bone/25">
              <span aria-hidden="true" className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span aria-hidden="true" className="absolute -bottom-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                Open Events
              </span>
              <span className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-volt block tabular-nums min-w-[2.5ch] tracking-tight mt-0.5">
                {isLoading ? '--' : animationStarted ? displayOpen : stats.openEvents}
              </span>
            </div>

            {/* Cell 3: Seats Left */}
            <div className="p-3 sm:p-5 flex flex-col justify-center min-w-0 relative border-l border-dashed border-bone/25">
              <span aria-hidden="true" className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span aria-hidden="true" className="absolute -bottom-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span className="font-mono text-[10px] sm:text-xs text-bone/50 uppercase tracking-widest block truncate whitespace-nowrap">
                Seats Left
              </span>
              <span className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-bone block tabular-nums min-w-[3.5ch] tracking-tight mt-0.5">
                {isLoading ? '--' : animationStarted ? displaySeats : stats.remainingSeats}
              </span>
            </div>

            {/* Vertical Perforation Line */}
            <div
              className={`relative w-[1px] border-r border-dashed border-bone/25 transition-transform duration-400 origin-top pointer-events-none shrink-0 ${
                animationStarted || prefersReduced || isLite ? 'scale-y-100' : 'scale-y-0'
              }`}
            >
              <span aria-hidden="true" className="absolute -top-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
              <span aria-hidden="true" className="absolute -bottom-2 -left-1.5 w-3 h-3 rounded-full bg-ink border border-bone/25" />
            </div>

            {/* Barcode Stub (minmax 180px, 1.3fr) */}
            <div
              role="img"
              aria-label={barcodeAriaLabel}
              className="p-3 sm:p-4 md:px-5 md:py-3.5 flex flex-col justify-between items-end bg-bone/[0.02] min-w-0"
            >
              <div
                className="relative flex items-end justify-end h-[56px] w-full max-w-full overflow-hidden px-1"
                style={{ gap: 'var(--barcode-bar-gap, 2px)' }}
              >
                {renderBarcodeBars()}
                {!isLite && !prefersReduced && (
                  <div
                    aria-hidden="true"
                    className="barcode-idle-sweep pointer-events-none absolute inset-0 w-8 bg-gradient-to-r from-transparent via-volt/40 to-transparent -translate-x-full"
                  />
                )}
              </div>
              <div className="font-mono text-[9px] sm:text-[10px] text-bone/50 uppercase tracking-widest pt-1.5 text-right whitespace-nowrap">
                1 BAR = 1 EVENT
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Tooltip (Desktop only) */}
      {hoveredEvent && hoveredEvent.rect && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: hoveredEvent.rect.top - 46,
            left: Math.max(
              16,
              Math.min(
                window.innerWidth - 220,
                hoveredEvent.rect.left + hoveredEvent.rect.width / 2 - 100
              )
            ),
            width: '200px',
            zIndex: 9999,
          }}
          className="pointer-events-none bg-ink border border-volt px-2.5 py-1.5 shadow-2xl space-y-0.5 text-left"
        >
          <div className="font-mono text-[11px] text-bone font-bold truncate">
            {hoveredEvent.event.name || 'Campus Event'}
          </div>
          <div className="font-mono text-[10px] text-volt font-bold uppercase">
            {hoveredEvent.seatsLeft} SEATS LEFT
          </div>
        </div>
      )}

      {/* Barcode Idle Sweep Animation Style */}
      <style>{`
        @keyframes barcodeSweep {
          0% { transform: translateX(-100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(450%); opacity: 0; }
        }
        .barcode-idle-sweep {
          animation: barcodeSweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .barcode-idle-sweep {
            display: none !important;
          }
        }
        html[data-perf="lite"] .barcode-idle-sweep {
          display: none !important;
        }
      `}</style>
    </div>
  )
}
export default HeroTicketStrip
