import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { Stamp } from '@/components/ui/Stamp'
import { Button } from '@/components/ui/Button'
import { SeatsBar } from '@/components/events/SeatsBar'
import { formatPrice, formatTeamSize } from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { useCursor } from '@/hooks/useCursor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import type { Event } from '@/types/event'

interface FeaturedStackProps {
  events: Event[]
}

function FeaturedCardItem({ event, idx }: { event: Event; idx: number }) {
  const { setCursor, resetCursor } = useCursor()
  const prefersReduced = usePrefersReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const isSoldOut = event.registration_status !== 'OPEN'

  const stub = (
    <div className="h-full flex flex-col justify-between items-center py-2 font-mono select-none w-full">
      <div className="space-y-1 text-center">
        <span className="font-mono text-[9px] text-bone/40 uppercase block">PASS ID</span>
        <span className="font-mono text-[11px] text-volt font-black tracking-widest">
          #{(event.id || 'FEATURED').substring(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="space-y-2 w-full flex flex-col items-center">
        <span className="font-mono text-[10px] text-bone/50 uppercase block">PRICE</span>
        <span className="font-display font-black text-xl text-volt">
          {formatPrice(event.price, event.is_per_head)}
        </span>

        {/* Animated Barcode */}
        <div className={`transition-transform duration-300 ${isHovered ? 'scale-110' : 'scale-100'}`}>
          <TicketBarcode id={event.id} className="w-20" />
        </div>
      </div>

      <Link
        to="/events/$eventId"
        params={{ eventId: event.id }}
        className="pt-2 w-full"
      >
        <Button variant="primary" size="sm" fullWidth cursorLabel="Pass">
          Get Pass
        </Button>
      </Link>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: idx * 0.08 }}
      style={{
        position: 'sticky',
        top: `${100 + idx * 28}px`,
      }}
      className="relative z-10 w-full"
      onMouseEnter={() => {
        setIsHovered(true)
        setCursor('card', 'View')
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        resetCursor()
      }}
    >
      <TicketShape
        id={event.id}
        isHovered={isHovered}
        tearOnHover={true}
        stubContent={stub}
        stubWidth={170}
        className="w-full shadow-2xl"
      >
        <div className="relative min-h-[280px] sm:min-h-[320px] flex flex-col justify-between overflow-hidden">
          {/* Diagonal Volt Scanline Sweep on Hover */}
          <AnimatePresence>
            {isHovered && !prefersReduced && (
              <motion.div
                initial={{ x: '-100%', y: '-100%' }}
                animate={{ x: '200%', y: '200%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none z-30 bg-gradient-to-br from-transparent via-volt/20 to-transparent w-[200%] h-[200%] -top-1/2 -left-1/2"
                style={{ transform: 'rotate(25deg)' }}
              />
            )}
          </AnimatePresence>

          {/* Top Meta Header */}
          <div className="flex items-center justify-between pb-3 border-b border-bone/15">
            <span className="font-mono text-xs uppercase font-black tracking-widest text-volt">
              FEATURED PASS #{String(idx + 1).padStart(2, '0')} // {event.category || 'EVENT'}
            </span>
            <Stamp variant="volt" rotate={-2}>
              {isSoldOut ? 'CLOSED' : 'FEATURED'}
            </Stamp>
          </div>

          {/* Center Info with Image Backing */}
          <div className="relative my-4 p-4 border border-bone/15 bg-bone/[0.02] flex flex-col sm:flex-row gap-6 items-center">
            <div className="w-full sm:w-48 aspect-video overflow-hidden border border-bone/20 shrink-0 bg-bone/5">
              <img
                src={
                  (event.cover_image_url || FALLBACK_COVER_IMAGE).includes('images.pexels.com')
                    ? `${(event.cover_image_url || FALLBACK_COVER_IMAGE).split('?')[0]}?auto=compress&cs=tinysrgb&w=600&fit=crop`
                    : event.cover_image_url || FALLBACK_COVER_IMAGE
                }
                alt={event.cover_image_alt || event.name}
                loading={idx === 0 ? 'eager' : 'lazy'}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>

            <div className="space-y-2 flex-1">
              <h3 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone group-hover:text-volt transition-colors">
                {event.name}
              </h3>
              {event.blurb && (
                <p className="font-sans text-xs sm:text-sm text-bone/70 line-clamp-2">
                  {event.blurb}
                </p>
              )}
            </div>
          </div>

          {/* Bottom Pass Meta & Seats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-bone/15 items-center">
            <div className="font-mono text-xs">
              <span className="text-bone/40 uppercase block text-[10px]">Date</span>
              <span className="text-bone font-bold">
                {event.schedule_summary?.start_date || 'Date TBA'}
              </span>
            </div>

            <div className="font-mono text-xs">
              <span className="text-bone/40 uppercase block text-[10px]">Team Size</span>
              <span className="text-bone font-bold">
                {formatTeamSize(event.min_teamsize, event.max_teamsize)}
              </span>
            </div>

            <div>
              <SeatsBar
                filled={event.seats_filled}
                total={event.total_seats}
                status={event.registration_status}
                compact
              />
            </div>
          </div>
        </div>
      </TicketShape>
    </motion.div>
  )
}

export function FeaturedStack({ events }: FeaturedStackProps) {
  const featured = events.filter((e) => e.is_featured)
  const displayEvents = (featured.length > 0 ? featured : events).slice(0, 4)

  if (displayEvents.length === 0) return null

  return (
    <section id="featured" className="py-24 md:py-32 border-b-2 border-bone/15 bg-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-bone/15 pb-6">
          <div className="space-y-1">
            <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
              CURATED SELECTION
            </span>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-bone tracking-tight">
              Featured Campus Passes
            </h2>
          </div>
          <p className="font-sans text-xs sm:text-sm text-bone/60 max-w-xs">
            The headline passes students are booking this week.
          </p>
        </div>

        {/* Vertical Stacking Cards Container */}
        <div className="relative space-y-10 pb-16">
          {displayEvents.map((event, idx) => (
            <FeaturedCardItem key={event.id} event={event} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  )
}
