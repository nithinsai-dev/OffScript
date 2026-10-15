import React, { useState, useId, useRef, useCallback, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { SeatsBar } from '@/components/events/SeatsBar'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { useCursor } from '@/hooks/useCursor'
import { registerReveal } from '@/lib/reveal'
import type { Event } from '@/types/event'

interface EventCardProps {
  event: Event
  isEager?: boolean
  className?: string
}

function EventCardComponent({ event, isEager = false, className = '' }: EventCardProps) {
  const { setCursor, resetCursor } = useCursor()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const uniqueId = useId()

  const cardRef = useRef<HTMLDivElement | null>(null)
  const tiltRef = useRef<HTMLDivElement | null>(null)
  const cardRectRef = useRef<DOMRect | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const leaveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el || isEager) return
    return registerReveal(el, 'card')
  }, [isEager])

  const totalSeats = event.total_seats ?? 0
  const seatsFilled = event.seats_filled ?? 0
  const seatsLeft = Math.max(0, totalSeats - seatsFilled)

  const dateStr = event.schedule_summary?.start_date || 'Date TBA'

  // A. 3D TILT TOWARD CURSOR (Desktop fine pointer, full mode only, pure CSS vars, no React state)
  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    if (document.documentElement.getAttribute('data-perf') === 'lite') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }

    const el = tiltRef.current
    if (!el) return

    // Read card rect ONCE and cache it
    cardRectRef.current = el.getBoundingClientRect()

    // Only the hovered card has will-change: transform
    el.style.willChange = 'transform'
    el.style.transition = 'none'

    setCursor('card', 'View')
  }, [setCursor])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRectRef.current || !tiltRef.current) return
    const clientX = e.clientX
    const clientY = e.clientY

    if (rafIdRef.current) return

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const rect = cardRectRef.current
      const el = tiltRef.current
      if (!rect || !el) return

      // Compute normalized offset (-1 to 1)
      const xNorm = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width) * 2 - 1))
      const yNorm = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height) * 2 - 1))

      // Maximum tilt ~8 degrees, card visibly leans toward where cursor is
      const rx = (yNorm * 8).toFixed(2)
      const ry = (-xNorm * 8).toFixed(2)

      el.style.setProperty('--rx', `${rx}deg`)
      el.style.setProperty('--ry', `${ry}deg`)
    })
  }, [])

  const handlePointerLeave = useCallback(() => {
    resetCursor()
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    cardRectRef.current = null

    const el = tiltRef.current
    if (!el) return

    // Ease back to flat with a 400ms ease-out transition
    el.style.transition = 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')

    // Remove will-change after the return finishes
    leaveTimerRef.current = window.setTimeout(() => {
      if (el) {
        el.style.willChange = 'auto'
        el.style.transition = 'none'
      }
    }, 420)
  }, [resetCursor])

  const priceDisplay =
    event.price === undefined || event.price === null || event.price === 0
      ? 'Free'
      : `Rs ${event.price.toLocaleString('en-IN')}`
  const priceUnit = event.is_per_head ? 'per person' : 'per team'

  // Stub Content with Static Details (No scanner stamp, no particles, full-height stretch, no overlap)
  const stub = (
    <div className="h-full w-full flex flex-row sm:flex-col justify-between items-center py-2 px-3 sm:px-0 font-mono select-none relative self-stretch">
      {/* 1. TOP: Serial label + serial value */}
      <div className="space-y-0.5 text-left sm:text-center shrink-0">
        <span className="font-mono text-[9px] text-bone/40 uppercase tracking-wider block">SERIAL</span>
        <span className="font-mono text-[10px] text-bone/80 font-black tracking-widest block truncate max-w-[95px]">
          #{(event.id || 'OFFSCRIPT').substring(0, 8).toUpperCase()}
        </span>
      </div>

      {/* 2. MIDDLE: Price block - amount never wraps, unit on separate small mono line */}
      <div className="text-center shrink-0 my-0 sm:my-1">
        <span
          className="font-display font-black text-sm text-volt whitespace-nowrap block"
          style={{ fontSize: 'clamp(11px, 1.1vw, 14px)' }}
        >
          {priceDisplay}
        </span>
        <span className="font-mono text-[9px] text-bone/50 uppercase tracking-tight block whitespace-nowrap">
          {priceUnit}
        </span>
      </div>

      {/* 3. VERTICAL "ADMIT ONE" in its own reserved slot using writing-mode: vertical-rl */}
      <div className="flex items-center justify-center sm:flex-1 my-0 sm:my-1 min-h-[20px] sm:min-h-[50px]">
        <span
          className="font-mono text-[9px] uppercase tracking-widest text-volt font-black select-none hidden sm:inline-block"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          ADMIT ONE
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest text-volt font-black select-none inline-block sm:hidden">
          ADMIT ONE
        </span>
      </div>

      {/* 4. BOTTOM: Barcode */}
      <div className="shrink-0 w-auto sm:w-full flex justify-center pt-0 sm:pt-1">
        <TicketBarcode id={event.id} className="w-14 sm:w-16" />
      </div>
    </div>
  )

  // Optimize image URL for cards: max 600px width
  const rawCover = event.cover_image_url || FALLBACK_COVER_IMAGE
  const optimizedCover = rawCover.includes('images.pexels.com')
    ? `${rawCover.split('?')[0]}?auto=compress&cs=tinysrgb&w=600&fit=crop`
    : rawCover

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-reveal={isEager ? undefined : 'card'}
      data-in-hero={isEager ? 'true' : undefined}
      className={`event-card-perspective-wrapper relative group select-none ${className} ${isEager ? 'is-revealed' : ''} h-full flex flex-col items-stretch`}
      style={{
        perspective: '900px',
        contentVisibility: isEager ? 'visible' : 'auto',
        containIntrinsicSize: '360px 420px',
      }}
    >
      <div
        ref={tiltRef}
        className="event-card-tilt-layer w-full h-full flex flex-col flex-1 items-stretch"
        style={{
          transform: 'rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <TicketShape
          id={event.id || uniqueId}
          tearOnHover={false} // Static ticket silhouette, no tear
          hoverStroke={false} // Border color does NOT change on hover
          stubContent={stub}
          stubWidth={125}
          overlayContent={
            /* B. CONTINUOUS BARCODE-SCANNER LINE: Pure CSS, 2px line + 28px soft trail + 6 flakes riding the line */
            <div aria-hidden="true" className="card-continuous-scanner-wrap">
              <div className="card-continuous-scanner-runner">
                <span className="scanner-flake scanner-flake-1" />
                <span className="scanner-flake scanner-flake-2" />
                <span className="scanner-flake scanner-flake-3" />
                <span className="scanner-flake scanner-flake-4" />
                <span className="scanner-flake scanner-flake-5" />
                <span className="scanner-flake scanner-flake-6" />
              </div>
            </div>
          }
          className="w-full h-full flex-1 flex flex-col"
        >
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="flex flex-col h-full flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt select-none justify-between space-y-4 relative"
          >
            {/* Header row: category and mode (no VALID/CLOSED stamp) */}
            <div className="flex items-center justify-between pb-2 border-b border-bone/15 shrink-0">
              <span className="font-mono text-[10px] uppercase font-black tracking-widest text-volt">
                {event.category || 'EVENT'}
              </span>
              <span className="font-mono text-[10px] text-bone/60 uppercase">
                {event.event_mode || 'OFFLINE'}
              </span>
            </div>

            {/* Clean Static Image (No drawer, no magnification on hover) */}
            <div className="relative aspect-[16/9] w-full bg-bone/5 border border-bone/15 overflow-hidden shrink-0">
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 bg-bone/10 animate-pulse" />
              )}
              <img
                src={imageError ? FALLBACK_COVER_IMAGE : optimizedCover}
                alt={event.cover_image_alt || event.name}
                loading={isEager ? 'eager' : 'lazy'}
                decoding="async"
                width={400}
                height={225}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title & Blurb: Titles clamp to 3 lines, blurb to 2 lines */}
            <div className="space-y-1.5 flex-1">
              <h3 className="font-display text-base sm:text-lg font-black uppercase text-bone tracking-tight leading-snug line-clamp-3">
                {event.name}
              </h3>

              {event.blurb && (
                <p className="font-sans text-xs text-bone/70 line-clamp-2 leading-relaxed">
                  {event.blurb}
                </p>
              )}
            </div>

            {/* Key info is ALWAYS visible in a compact row, sticks to bottom with mt-auto */}
            <div className="space-y-2 pt-2 border-t border-bone/10 mt-auto shrink-0">
              <div className="flex items-center justify-between font-mono text-[11px] text-bone/60">
                <span className="line-clamp-1">{dateStr}</span>
                <span className="shrink-0">{event.event_mode || 'OFFLINE'}</span>
                <span className="text-volt shrink-0 font-bold">{seatsLeft} left</span>
              </div>

              <SeatsBar
                filled={event.seats_filled}
                total={event.total_seats}
                status={event.registration_status}
                showLabel={false}
                compact
              />
            </div>
          </Link>
        </TicketShape>
      </div>
    </div>
  )
}

export const EventCard = React.memo(EventCardComponent)
