import React, { useState, useId } from 'react'
import { Link } from '@tanstack/react-router'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { Stamp } from '@/components/ui/Stamp'
import { SeatsBar } from '@/components/events/SeatsBar'
import { formatPrice, formatTeamSize } from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { useCursor } from '@/hooks/useCursor'
import type { Event } from '@/types/event'

interface EventCardProps {
  event: Event
  isEager?: boolean
  className?: string
}

// 10 pre-rendered particle specs computed once at module load
const PRE_RENDERED_PARTICLES = [
  { left: '6%', size: '3px', delay: '0.04s', duration: '1.05s', drift: '-5px', isRound: true },
  { left: '16%', size: '2px', delay: '0.22s', duration: '1.2s', drift: '4px', isRound: false },
  { left: '26%', size: '4px', delay: '0.11s', duration: '1.35s', drift: '-3px', isRound: false },
  { left: '38%', size: '2.5px', delay: '0.36s', duration: '0.95s', drift: '6px', isRound: true },
  { left: '49%', size: '3px', delay: '0.16s', duration: '1.1s', drift: '-4px', isRound: false },
  { left: '61%', size: '4px', delay: '0.28s', duration: '1.4s', drift: '3px', isRound: true },
  { left: '71%', size: '2px', delay: '0.42s', duration: '1.0s', drift: '-2px', isRound: false },
  { left: '81%', size: '3px', delay: '0.09s', duration: '1.25s', drift: '5px', isRound: false },
  { left: '90%', size: '2.5px', delay: '0.31s', duration: '1.15s', drift: '-5px', isRound: true },
  { left: '95%', size: '3.5px', delay: '0.19s', duration: '1.3s', drift: '2px', isRound: false },
]

function EventCardComponent({ event, isEager = false, className = '' }: EventCardProps) {
  const { setCursor, resetCursor } = useCursor()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const uniqueId = useId()

  const isSoldOut = event.registration_status !== 'OPEN'
  const isFewSeats =
    !isSoldOut &&
    event.total_seats &&
    event.seats_filled &&
    event.seats_filled / event.total_seats >= 0.85

  // Detachable Stub Content (Static, no tear on grid cards)
  const stub = (
    <div className="h-full flex flex-col justify-between items-center py-1 font-mono select-none">
      <div className="space-y-1">
        <span className="font-mono text-[9px] text-bone/40 uppercase block">SERIAL</span>
        <span className="font-mono text-[10px] text-bone/80 font-black tracking-widest">
          {(event.id || 'OFFSCRIPT').substring(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="hidden sm:flex flex-col items-center my-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-volt font-black -rotate-90">
          ADMIT ONE
        </span>
      </div>

      <div className="space-y-2 w-full flex flex-col items-center">
        <span className="font-display font-black text-sm text-volt">
          {formatPrice(event.price, event.is_per_head)}
        </span>
        <TicketBarcode id={event.id} className="w-16" />
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
      onMouseEnter={() => setCursor('card', 'View')}
      onMouseLeave={resetCursor}
      className={`relative group ${className}`}
    >
      <TicketShape
        id={event.id || uniqueId}
        tearOnHover={false} // Only Featured stack cards tear
        stubContent={stub}
        stubWidth={115}
        className="w-full"
      >
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt select-none justify-between space-y-4 relative"
        >
          {/* Header row */}
          <div className="flex items-center justify-between pb-2 border-b border-bone/15">
            <span className="font-mono text-[10px] uppercase font-black tracking-widest text-volt">
              // {event.category || 'EVENT'}
            </span>
            {isSoldOut ? (
              <Stamp variant="bone" rotate={2}>CLOSED</Stamp>
            ) : isFewSeats ? (
              <Stamp variant="volt" rotate={-2}>FEW SEATS</Stamp>
            ) : (
              <span className="font-mono text-[10px] text-bone/40 uppercase">
                {event.event_mode || 'OFFLINE'}
              </span>
            )}
          </div>

          {/* Image Container */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-bone/5 border border-bone/15">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 bg-bone/10 animate-pulse" />
            )}
            <img
              src={imageError ? FALLBACK_COVER_IMAGE : optimizedCover}
              alt={event.cover_image_alt || event.name}
              loading={isEager ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Title & Blurb (Title shifts up 2px on card hover) */}
          <div className="space-y-1.5 flex-1">
            <h3 className="font-display text-base sm:text-lg font-black uppercase text-bone tracking-tight leading-snug group-hover:text-volt group-hover:-translate-y-0.5 transition-transform duration-200">
              {event.name}
            </h3>

            {event.blurb && (
              <p className="font-sans text-xs text-bone/70 line-clamp-2 leading-relaxed">
                {event.blurb}
              </p>
            )}
          </div>

          {/* Meta line & seats bar */}
          <div className="space-y-2 pt-2 border-t border-bone/10">
            <div className="flex items-center justify-between font-mono text-[11px] text-bone/60">
              <span>{event.schedule_summary?.start_date || 'Date TBA'}</span>
              <span>{formatTeamSize(event.min_teamsize, event.max_teamsize)}</span>
            </div>

            <SeatsBar
              filled={event.seats_filled}
              total={event.total_seats}
              status={event.registration_status}
              showLabel={false}
              compact
            />
          </div>

          {/* Pure CSS Rising Volt Particles on Hover */}
          <div aria-hidden="true" className="card-particles-container">
            {PRE_RENDERED_PARTICLES.map((p, idx) => (
              <span
                key={idx}
                className={`card-particle ${p.isRound ? 'rounded-full' : ''}`}
                style={
                  {
                    '--particle-left': p.left,
                    '--particle-size': p.size,
                    '--particle-delay': p.delay,
                    '--particle-duration': p.duration,
                    '--drift-x': p.drift,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* Bottom-edge Volt glow line that scales in on hover */}
          <div
            aria-hidden="true"
            className="absolute -bottom-2 left-0 right-0 h-[2px] bg-volt origin-center scale-x-0 group-hover:scale-x-100 transition-transform duration-300 pointer-events-none z-20 shadow-[0_0_8px_#D4FF3F]"
          />
        </Link>
      </TicketShape>
    </div>
  )
}

export const EventCard = React.memo(EventCardComponent)
