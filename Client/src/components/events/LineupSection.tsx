import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { Stamp } from '@/components/ui/Stamp'
import { Button } from '@/components/ui/Button'
import { formatPrice, formatTeamSize } from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'
import { useCursor } from '@/hooks/useCursor'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import type { Event } from '@/types/event'

gsap.registerPlugin(ScrollTrigger)

interface LineupSectionProps {
  events: Event[]
}

export function LineupSection({ events }: LineupSectionProps) {
  const { scrollTo } = useLenis()
  const { setCursor, resetCursor } = useCursor()
  const prefersReduced = usePrefersReducedMotion()

  const wrapperRef = useRef<HTMLElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const [progress, setProgress] = useState(0)
  const [activeIndex, setActiveIndex] = useState(1)
  const [isDesktop, setIsDesktop] = useState(false)
  const [wrapperHeight, setWrapperHeight] = useState<number | string>('300vh')

  // Sort upcoming events by start date, pick top 8
  const displayEvents = useMemo(() => {
    const list = [...events].sort((a, b) => {
      const timeA = new Date(a.schedule_summary?.start_date || a.registration_deadline || '').getTime() || 0
      const timeB = new Date(b.schedule_summary?.start_date || b.registration_deadline || '').getTime() || 0
      return timeA - timeB
    })
    return list.slice(0, 8)
  }, [events])

  // Track responsive screen width (>=1024px desktop)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Calculate layout dimensions for the sticky technique
  const recomputeLayout = useCallback(() => {
    if (!trackRef.current || !wrapperRef.current) return
    const track = trackRef.current
    const scrollWidth = track.scrollWidth
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Track scroll travel distance: track scrollWidth - viewportWidth + end padding
    const totalTravel = Math.max(0, scrollWidth - viewportWidth + 96)
    // Capped at about 2.5 extra viewport heights
    const maxTravel = Math.min(totalTravel, viewportHeight * 2.5)
    const computedHeight = maxTravel + viewportHeight

    setWrapperHeight(computedHeight)
    console.log(
      `[Lineup] scrollWidth: ${scrollWidth}px, viewportWidth: ${viewportWidth}px, totalTravel: ${totalTravel}px, wrapperHeight: ${computedHeight}px`
    )
    ScrollTrigger.refresh()
  }, [])

  // GSAP Sticky Technique Horizontal Scroll (without ScrollTrigger pin)
  useEffect(() => {
    if (!isDesktop || prefersReduced || displayEvents.length === 0) return

    const wrapper = wrapperRef.current
    const track = trackRef.current
    if (!wrapper || !track) return

    recomputeLayout()

    const ctx = gsap.context(() => {
      gsap.to(track, {
        x: () => {
          const scrollWidth = track.scrollWidth
          const viewportWidth = window.innerWidth
          const totalTravel = Math.max(0, scrollWidth - viewportWidth + 96)
          return -totalTravel
        },
        ease: 'none',
        scrollTrigger: {
          trigger: wrapper,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            setProgress(self.progress)
            const calculatedIdx = Math.min(
              displayEvents.length,
              Math.max(1, Math.round(self.progress * (displayEvents.length - 1)) + 1)
            )
            setActiveIndex(calculatedIdx)
          },
        },
      })
    }, wrapper)

    // Recompute with ResizeObserver, document.fonts.ready, and image load events
    const ro = new ResizeObserver(() => {
      recomputeLayout()
    })
    ro.observe(track)

    document.fonts.ready.then(() => {
      recomputeLayout()
    })

    const imgs = track.querySelectorAll('img')
    imgs.forEach((img) => {
      if (img.complete) {
        recomputeLayout()
      } else {
        img.addEventListener('load', recomputeLayout)
      }
    })

    window.addEventListener('resize', recomputeLayout)

    return () => {
      ctx.revert()
      ro.disconnect()
      window.removeEventListener('resize', recomputeLayout)
      imgs.forEach((img) => img.removeEventListener('load', recomputeLayout))
    }
  }, [isDesktop, prefersReduced, displayEvents.length, recomputeLayout])

  if (displayEvents.length === 0) return null

  const handleSkipToFooter = () => {
    scrollTo('#footer', {
      offset: 0,
      duration: 0.9,
      easing: easeOutExpo,
    })
  }

  return (
    <section
      ref={wrapperRef}
      id="lineup"
      style={{
        height: isDesktop && !prefersReduced ? wrapperHeight : 'auto',
      }}
      className="relative w-full bg-ink select-none border-b-2 border-bone/20"
      onMouseEnter={() => setCursor('horizontal', 'Scroll')}
      onMouseLeave={resetCursor}
    >
      {/* Sticky Inner Container: top-0 h-screen overflow-clip (NOT hidden) */}
      <div
        className={
          isDesktop && !prefersReduced
            ? 'sticky top-0 h-screen overflow-clip w-full flex flex-col justify-between py-6 px-6 sm:px-10'
            : 'relative py-16 px-4 sm:px-6 w-full flex flex-col gap-8'
        }
      >
        {/* Top Bar: Heading, Progress Counter, and Skip to Footer Button */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-bone/15 pb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="w-2.5 h-2.5 bg-volt rotate-45 shrink-0" />
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase text-bone tracking-tight">
              Event Lineup
            </h2>
            <span className="hidden sm:inline-block font-mono text-xs text-bone/50 uppercase tracking-widest">
              NEXT 8 UPCOMING PASSES
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
            {/* Counter ("03 / 08") */}
            <div className="flex items-center gap-1.5 text-bone/70">
              <span className="text-volt font-black text-sm">
                {String(activeIndex).padStart(2, '0')}
              </span>
              <span>/</span>
              <span>{String(displayEvents.length).padStart(2, '0')}</span>
            </div>

            {/* Skip to Footer Button */}
            <button
              type="button"
              onClick={handleSkipToFooter}
              className="text-xs font-mono uppercase tracking-wider text-bone/60 hover:text-volt transition-colors flex items-center gap-1 border border-bone/20 px-3 py-1 bg-bone/[0.02]"
            >
              <span>Skip to Footer</span>
              <span>↓</span>
            </button>
          </div>
        </div>

        {/* Desktop Progress Bar */}
        {isDesktop && !prefersReduced && (
          <div className="w-full h-1 bg-bone/10 my-2 overflow-hidden">
            <div
              className="h-full bg-volt origin-left transition-transform duration-75 ease-out"
              style={{ transform: `scaleX(${progress})` }}
            />
          </div>
        )}

        {/* Track Container (GSAP sticky scrub on desktop, native scroll-snap on mobile) */}
        <div
          ref={trackRef}
          className={
            isDesktop && !prefersReduced
              ? 'flex items-center gap-8 will-change-transform py-4'
              : 'flex gap-6 overflow-x-auto snap-x snap-mandatory py-6 no-scrollbar'
          }
        >
          {displayEvents.map((event, idx) => {
            const stub = (
              <div className="h-full flex flex-col justify-between items-center py-2 font-mono select-none w-full">
                {/* Rotated Vertical "ADMIT ONE" */}
                <div className="w-full flex justify-center py-1">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-black">
                    ADMIT ONE
                  </span>
                </div>

                <div className="space-y-1 text-center">
                  <span className="font-mono text-[9px] text-bone/40 uppercase block">SERIAL</span>
                  <span className="font-mono text-[11px] text-volt font-black tracking-widest">
                    #{(event.id || 'PASS').substring(0, 8).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-1 w-full flex flex-col items-center">
                  <span className="font-mono text-[10px] text-bone/50 uppercase block">PRICE</span>
                  <span className="font-display font-black text-lg text-volt">
                    {formatPrice(event.price, event.is_per_head)}
                  </span>
                  <span className="font-mono text-[10px] text-bone/60">
                    {event.seats_left != null ? `${event.seats_left} SEATS LEFT` : 'OPEN SEATS'}
                  </span>
                  {/* Deterministic Barcode */}
                  <div className="pt-1">
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
              <div
                key={event.id}
                className={
                  isDesktop && !prefersReduced
                    ? 'w-[72vw] max-w-[820px] shrink-0'
                    : 'w-[88vw] sm:w-[420px] shrink-0 snap-start'
                }
              >
                <TicketShape
                  id={event.id}
                  stubContent={stub}
                  stubWidth={150}
                  className="w-full shadow-2xl"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full p-2">
                    {/* Visual Half with counter-parallax */}
                    <div className="md:col-span-6 relative aspect-video md:aspect-[4/3] overflow-hidden bg-bone/5 border border-bone/15 flex flex-col justify-between p-4">
                      <img
                        src={
                          (event.cover_image_url || FALLBACK_COVER_IMAGE).includes('images.pexels.com')
                            ? `${(event.cover_image_url || FALLBACK_COVER_IMAGE).split('?')[0]}?auto=compress&cs=tinysrgb&w=600&fit=crop`
                            : event.cover_image_url || FALLBACK_COVER_IMAGE
                        }
                        alt={event.cover_image_alt || event.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          transform: isDesktop && !prefersReduced
                            ? `translateX(${(0.5 - progress) * 36}px) scale(1.08)`
                            : 'none',
                        }}
                        className="absolute inset-0 w-full h-full object-cover opacity-60 transition-transform duration-300"
                      />
                      <div className="relative z-10 flex justify-between items-start">
                        <span className="font-mono text-[10px] uppercase tracking-widest bg-ink/90 border border-bone/30 px-2 py-0.5 text-volt font-bold">
                          PASS #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <Stamp variant="volt" rotate={-2}>
                          LINEUP
                        </Stamp>
                      </div>

                      <div className="relative z-10 font-mono text-[11px] text-bone/80 bg-ink/95 px-2 py-1 border border-bone/25 w-fit">
                        {event.schedule_summary?.start_date || 'Date TBA'}
                      </div>
                    </div>

                    {/* Info Half */}
                    <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-bold block">
                          {event.category || 'CAMPUS EVENT'}
                        </span>
                        <h3 className="font-display text-xl sm:text-2xl md:text-3xl font-black uppercase text-bone leading-tight">
                          {event.name}
                        </h3>
                        {event.blurb && (
                          <p className="font-sans text-xs sm:text-sm text-bone/70 line-clamp-2">
                            {event.blurb}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 pt-3 border-t border-dashed border-bone/20 font-mono text-xs text-bone/60">
                        <div className="flex items-center justify-between">
                          <span>Team: {formatTeamSize(event.min_teamsize, event.max_teamsize)}</span>
                          <span className="text-volt font-bold">
                            {formatPrice(event.price, event.is_per_head)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TicketShape>
              </div>
            )
          })}
        </div>

        {/* Bottom Hint */}
        <div className="hidden lg:flex items-center justify-between font-mono text-[11px] text-bone/40 pt-2 border-t border-bone/10">
          <span>SCROLL DOWN TO ADVANCE LINEUP</span>
          <span>RELEASES SMOOTHLY INTO FOOTER</span>
        </div>
      </div>
    </section>
  )
}
