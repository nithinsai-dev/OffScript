import React, { useMemo, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { Stamp } from '@/components/ui/Stamp'
import { Button } from '@/components/ui/Button'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { SeatsBar } from '@/components/events/SeatsBar'
import { SplitText } from '@/components/effects/SplitText'
import { CountUp } from '@/components/effects/CountUp'
import { EventRail } from '@/components/events/EventRail'
import { SectionError } from '@/components/ui/SectionError'
import { SkeletonBlock } from '@/components/ui/Skeletons'
import { useCountdown } from '@/hooks/useCountdown'
import { useEventDetailQuery, useEventsQuery } from '@/features/events/queries'
import { useLenis } from '@/hooks/useLenis'
import {
  formatEventDateTime,
  formatPrice,
  formatTeamSize,
} from '@/lib/formatters'
import { FALLBACK_COVER_IMAGE } from '@/lib/schemas'
import { REGISTRATION_URL_BASE } from '@/lib/config'
import type { EventDetail, Prize, ScheduleItem, FAQ, Coordinator, Organizer } from '@/types/event'

export function EventDetailPage() {
  const { eventId } = useParams({ strict: false }) as { eventId: string }
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
  const { getLenis } = useLenis()

  const [imageError, setImageError] = useState(false)
  const [shakeDisabled, setShakeDisabled] = useState(false)
  const [activeBentoId, setActiveBentoId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '')
      return hash || null
    }
    return null
  })
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Track originating card button ref for focus restoration
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const modalPanelRef = useRef<HTMLDivElement | null>(null)
  const [timelineProgress, setTimelineProgress] = useState(0.2)

  const countdown = useCountdown(event?.registration_deadline)

  // Debug logging to verify all normalized detail arrays in dev
  useEffect(() => {
    if (import.meta.env.DEV && detailEvent) {
      console.log('[OFFSCRIPT EVENT DETAIL] Normalized event loaded:', {
        id: detailEvent.id,
        name: detailEvent.name,
        description: detailEvent.description ? `${detailEvent.description.substring(0, 35)}...` : '(none)',
        highlights: detailEvent.highlights?.length ?? 0,
        what_to_expect: detailEvent.what_to_expect?.length ?? 0,
        eligibility: detailEvent.eligibility?.length ?? 0,
        prerequisites: detailEvent.prerequisites?.length ?? 0,
        rules: detailEvent.rules?.length ?? 0,
        prizes: detailEvent.prizes?.length ?? 0,
        schedules: detailEvent.schedules?.length ?? 0,
        faqs: detailEvent.faqs?.length ?? 0,
        gallery_images: detailEvent.gallery_images?.length ?? 0,
        organizers: detailEvent.organizers?.length ?? 0,
        coordinators: detailEvent.coordinators?.length ?? 0,
      })
    }
  }, [detailEvent])

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

  const closeBento = useCallback(() => {
    const prevId = activeBentoId
    setActiveBentoId(null)
    window.history.replaceState(null, '', window.location.pathname)
    if (prevId && cardRefs.current[prevId]) {
      cardRefs.current[prevId]?.focus()
    }
  }, [activeBentoId])

  // Lenis control & focus trap during in-place expanded modal
  useEffect(() => {
    const lenis = getLenis()
    if (activeBentoId || lightboxImage) {
      lenis?.stop()
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        modalPanelRef.current?.focus()
      }, 50)
    } else {
      lenis?.start()
      document.body.style.overflow = ''
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null)
        } else if (activeBentoId) {
          closeBento()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      lenis?.start()
      document.body.style.overflow = ''
    }
  }, [activeBentoId, lightboxImage, getLenis, closeBento])

  const openBento = (id: string) => {
    setActiveBentoId(id)
    window.history.replaceState(null, '', `#${id}`)
  }

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

  // Description paragraphs
  const descriptionParagraphs = useMemo(() => {
    if (!detailEvent?.description) return []
    return detailEvent.description
      .split('\n\n')
      .map((p: string) => p.trim())
      .filter(Boolean)
  }, [detailEvent])

  // First 2 lines of description for overview gist
  const descriptionGist = useMemo(() => {
    if (!detailEvent?.description) return event?.blurb || 'Discover pass rules, schedule, and team requirements.'
    const lines = detailEvent.description.split('\n').filter(Boolean)
    return lines.slice(0, 2).join(' ')
  }, [detailEvent, event?.blurb])

  // Schedule dates calculation
  const scheduleDates = useMemo(() => {
    if (!detailEvent?.schedules || detailEvent.schedules.length === 0) return null
    const firstSched = detailEvent.schedules[0]
    const rawDate = firstSched.event_date || event?.schedule_summary?.start_date || ''
    let day = '--'
    let month = 'TBA'
    if (rawDate) {
      const d = new Date(rawDate)
      if (!Number.isNaN(d.getTime())) {
        day = String(d.getDate()).padStart(2, '0')
        month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
      }
    }
    return {
      day,
      month,
      venue: firstSched.venue || 'Campus Hall',
      totalDays: detailEvent.schedules.length,
    }
  }, [detailEvent, event?.schedule_summary])

  // Available Bento Cards Data Structure
  interface BentoItem {
    id: string
    title: string
    label: string
    colSpan: string
    gist: ReactNode
    expanded: ReactNode
  }

  // Bento cards derived strictly from detailEvent (hiding truly empty arrays)
  const bentoCards: BentoItem[] = useMemo(() => {
    if (!detailEvent) return []
    const cards: BentoItem[] = []

    // 1. OVERVIEW
    cards.push({
      id: 'overview',
      title: 'Overview',
      label: 'BRIEFING',
      colSpan: 'col-span-12 md:col-span-8',
      gist: (
        <div className="space-y-3">
          <p className="font-sans text-xs sm:text-sm text-bone/75 line-clamp-2 leading-relaxed">
            {descriptionGist}
          </p>
          <div className="flex items-center gap-2 font-mono text-xs text-volt font-bold">
            <span>Read full overview</span>
            <span>→</span>
          </div>
        </div>
      ),
      expanded: (
        <div className="space-y-4 font-sans text-sm sm:text-base text-bone/85 leading-relaxed">
          {descriptionParagraphs.length > 0 ? (
            descriptionParagraphs.map((para: string, idx: number) => <p key={idx}>{para}</p>)
          ) : (
            <p>{detailEvent.blurb || 'Full event briefing details will be announced.'}</p>
          )}
        </div>
      ),
    })

    // 2. HIGHLIGHTS
    if (detailEvent.highlights && detailEvent.highlights.length > 0) {
      const remainingCount = Math.max(0, detailEvent.highlights.length - 2)
      cards.push({
        id: 'highlights',
        title: 'Highlights',
        label: `${detailEvent.highlights.length} KEY PERKS`,
        colSpan: 'col-span-12 md:col-span-4',
        gist: (
          <div className="space-y-2.5">
            {detailEvent.highlights.slice(0, 2).map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 font-sans text-xs text-bone/80">
                <span className="w-1.5 h-1.5 bg-volt rotate-45 shrink-0 mt-1.5" />
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
                +{remainingCount} MORE PERKS
              </span>
            )}
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.highlights.map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-start gap-3 p-3.5 border border-bone/15 bg-bone/[0.02]"
              >
                <span className="font-mono text-xs text-volt font-black shrink-0 mt-0.5">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <p className="font-sans text-sm text-bone/85 leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 3. WHAT TO EXPECT
    if (detailEvent.what_to_expect && detailEvent.what_to_expect.length > 0) {
      const remainingCount = Math.max(0, detailEvent.what_to_expect.length - 2)
      cards.push({
        id: 'expect',
        title: 'What To Expect',
        label: 'EXPERIENCE',
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            {detailEvent.what_to_expect.slice(0, 2).map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 font-sans text-xs text-bone/80">
                <span className="text-volt font-mono font-bold">›</span>
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
                +{remainingCount} MORE
              </span>
            )}
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.what_to_expect.map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-3.5 border border-bone/15 bg-bone/[0.02] flex items-start gap-3"
              >
                <span className="w-2 h-2 bg-volt rotate-45 shrink-0 mt-1.5" />
                <p className="font-sans text-sm text-bone/85 leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 4. ELIGIBILITY
    if (detailEvent.eligibility && detailEvent.eligibility.length > 0) {
      const remainingCount = Math.max(0, detailEvent.eligibility.length - 2)
      cards.push({
        id: 'eligibility',
        title: 'Eligibility',
        label: 'WHO CAN JOIN',
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            {detailEvent.eligibility.slice(0, 2).map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 font-sans text-xs text-bone/80">
                <span className="text-volt font-mono font-bold">✓</span>
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
                +{remainingCount} MORE
              </span>
            )}
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.eligibility.map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-3.5 border border-bone/15 bg-bone/[0.02] flex items-start gap-3"
              >
                <span className="font-mono text-volt font-bold text-xs shrink-0 mt-0.5">ELIG</span>
                <p className="font-sans text-sm text-bone/85 leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 5. PREREQUISITES
    if (detailEvent.prerequisites && detailEvent.prerequisites.length > 0) {
      const remainingCount = Math.max(0, detailEvent.prerequisites.length - 2)
      cards.push({
        id: 'prerequisites',
        title: 'Prerequisites',
        label: 'REQUIREMENTS',
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            {detailEvent.prerequisites.slice(0, 2).map((item: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 font-sans text-xs text-bone/80">
                <span className="text-volt font-mono font-bold">✓</span>
                <span className="line-clamp-1">{item}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
                +{remainingCount} MORE
              </span>
            )}
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.prerequisites.map((item: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-3.5 border border-bone/15 bg-bone/[0.02] flex items-start gap-3"
              >
                <span className="font-mono text-volt font-bold text-xs shrink-0 mt-0.5">REQ</span>
                <p className="font-sans text-sm text-bone/85 leading-relaxed">{item}</p>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 6. RULES
    if (detailEvent.rules && detailEvent.rules.length > 0) {
      const remainingCount = Math.max(0, detailEvent.rules.length - 1)
      cards.push({
        id: 'rules',
        title: 'Rules & Protocol',
        label: `${detailEvent.rules.length} RULES`,
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            <p className="font-sans text-xs text-bone/80 line-clamp-2">
              <span className="font-mono text-volt font-bold mr-1">#01</span>
              {detailEvent.rules[0]}
            </p>
            {remainingCount > 0 && (
              <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
                +{remainingCount} MORE RULES
              </span>
            )}
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.rules.map((rule: string, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="p-3.5 border border-bone/15 bg-bone/[0.02] flex items-start gap-3"
              >
                <span className="font-mono text-xs font-black text-volt shrink-0 mt-0.5">
                  #{String(idx + 1).padStart(2, '0')}
                </span>
                <p className="font-sans text-sm text-bone/85 leading-relaxed">{rule}</p>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 7. PRIZES
    if (detailEvent.prizes && detailEvent.prizes.length > 0) {
      const firstPrize = detailEvent.prizes[0]
      const firstAmountNum = Number(firstPrize.amount) || 0
      const formattedFirst = `₹ ${firstAmountNum.toLocaleString('en-IN')}`

      cards.push({
        id: 'prizes',
        title: 'Prizes & Rewards',
        label: `${detailEvent.prizes.length} TIERS`,
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-bone/50 uppercase">1ST PRIZE</span>
              <span className="font-display text-2xl font-black text-volt tracking-tight">
                {formattedFirst}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-bone/60 pt-1 border-t border-bone/10">
              <span>{detailEvent.prizes.length} PODIUM REWARDS</span>
              <span className="text-volt font-bold">VIEW ALL →</span>
            </div>
          </div>
        ),
        expanded: (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {detailEvent.prizes.map((prize: Prize, idx: number) => {
                const amountVal = Number(prize.amount) || 0
                return (
                  <div key={idx} className="w-full">
                    {/* Three static ticket-shaped prize cards */}
                    <TicketShape
                      id={`prize-${idx}`}
                      tearOnHover={false}
                      stubWidth={90}
                      className="w-full"
                      stubContent={
                        <div className="flex flex-col justify-between items-center h-full py-1 font-mono text-[9px] text-bone/50">
                          <span className="text-volt font-bold">PRIZE</span>
                          <TicketBarcode id={`PRZ-${idx}`} className="w-12 opacity-60" />
                        </div>
                      }
                    >
                      <div className="space-y-2 p-2">
                        <span className="font-mono text-[10px] uppercase font-bold text-bone/50 block">
                          RANK #{prize.rank || idx + 1}
                        </span>
                        <div className="font-display text-2xl font-black text-volt">
                          ₹ <CountUp end={amountVal} />
                        </div>
                        {prize.title && (
                          <span className="font-mono text-xs text-bone font-bold block">
                            {prize.title}
                          </span>
                        )}
                        {prize.description && (
                          <p className="font-sans text-xs text-bone/70 line-clamp-2">
                            {prize.description}
                          </p>
                        )}
                      </div>
                    </TicketShape>
                  </div>
                )
              })}
            </div>
          </div>
        ),
      })
    }

    // 8. SCHEDULE
    if (detailEvent.schedules && detailEvent.schedules.length > 0 && scheduleDates) {
      cards.push({
        id: 'schedule',
        title: 'Schedule & Venue',
        label: `${scheduleDates.totalDays} DAYS`,
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="flex items-center gap-4">
            <div className="border-2 border-bone/25 p-2 text-center min-w-[56px] bg-bone/[0.02]">
              <span className="font-display text-2xl font-black text-volt block leading-none">
                {scheduleDates.day}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-bone/60 block pt-1">
                {scheduleDates.month}
              </span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <span className="text-bone font-bold block">{scheduleDates.venue}</span>
              <span className="text-volt text-[10px] uppercase font-bold block">
                {scheduleDates.totalDays} Day Timeline Available →
              </span>
            </div>
          </div>
        ),
        expanded: (
          <div className="space-y-6 relative pl-6 border-l-2 border-bone/25">
            {/* Dynamic drawing vertical timeline line */}
            <div
              className="absolute left-[-2px] top-0 w-0.5 bg-volt transition-all duration-150"
              style={{ height: `${Math.max(15, timelineProgress * 100)}%` }}
            />
            {detailEvent.schedules.map((item: ScheduleItem, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="space-y-2 relative"
              >
                <div className="absolute -left-[31px] top-1 w-3 h-3 bg-volt rotate-45 border-2 border-ink" />
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                  <span className="font-black text-volt uppercase">
                    {item.event_date || `DAY ${idx + 1}`}
                  </span>
                  {(item.start_time || item.end_time) && (
                    <span className="text-bone/60">
                      {item.start_time} - {item.end_time}
                    </span>
                  )}
                  {item.venue && (
                    <span className="bg-bone/10 px-2 py-0.5 text-bone/80 text-[11px]">
                      {item.venue}
                    </span>
                  )}
                </div>
                <div className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
                  Session scheduled at {item.venue || 'Campus Arena'}.
                </div>
              </motion.div>
            ))}
          </div>
        ),
      })
    }

    // 9. FAQS
    if (detailEvent.faqs && detailEvent.faqs.length > 0) {
      cards.push({
        id: 'faqs',
        title: 'FAQs',
        label: `${detailEvent.faqs.length} QUESTIONS`,
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            <p className="font-sans text-xs text-bone/80 line-clamp-2">
              <span className="text-volt font-mono font-bold mr-1">Q:</span>
              {detailEvent.faqs[0].question}
            </p>
            <span className="inline-block font-mono text-[10px] uppercase tracking-wider text-volt font-bold pt-1">
              +{detailEvent.faqs.length - 1} MORE QUESTIONS
            </span>
          </div>
        ),
        expanded: (
          <div className="space-y-3">
            {detailEvent.faqs.map((faq: FAQ, idx: number) => {
              const isOpen = openFaqIndex === idx
              return (
                <div
                  key={idx}
                  className="border-2 border-bone/20 bg-bone/[0.02] p-4 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center text-left gap-4 font-mono text-xs sm:text-sm text-bone font-bold uppercase tracking-tight"
                  >
                    <span>{faq.question}</span>
                    <span className="text-volt font-mono text-base">{isOpen ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden pt-3 border-t border-bone/15 mt-3"
                      >
                        <p className="font-sans text-xs sm:text-sm text-bone/75 leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        ),
      })
    }

    // 10. GALLERY
    if (detailEvent.gallery_images && detailEvent.gallery_images.length > 0) {
      cards.push({
        id: 'gallery',
        title: 'Pass Gallery',
        label: `${detailEvent.gallery_images.length} PHOTOS`,
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 aspect-[21/9] overflow-hidden">
              {detailEvent.gallery_images.slice(0, 2).map((img: string, idx: number) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Preview ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover border border-bone/20 opacity-70"
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-volt uppercase font-bold block pt-1">
              +{detailEvent.gallery_images.length} PHOTOS LIGHTBOX →
            </span>
          </div>
        ),
        expanded: (
          <div className="space-y-4">
            <div className="flex gap-4 overflow-x-auto py-2 no-scrollbar snap-x">
              {detailEvent.gallery_images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setLightboxImage(img)}
                  className="w-64 aspect-video shrink-0 overflow-hidden border border-bone/20 hover:border-volt group transition-colors snap-start"
                >
                  <img
                    src={img}
                    alt={`Gallery ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </button>
              ))}
            </div>
          </div>
        ),
      })
    }

    // 11. CONTACT & ORGANIZERS
    if (
      (detailEvent.organizers && detailEvent.organizers.length > 0) ||
      (detailEvent.coordinators && detailEvent.coordinators.length > 0)
    ) {
      const organizersList = detailEvent.organizers || []
      const coordinatorsList = detailEvent.coordinators || []

      cards.push({
        id: 'contact',
        title: 'Contact & Crew',
        label: 'ORGANIZERS',
        colSpan: 'col-span-12 md:col-span-6',
        gist: (
          <div className="space-y-2 font-mono text-xs">
            {organizersList.length > 0 && (
              <p className="text-bone font-bold line-clamp-1">
                {organizersList.map((o: Organizer) => o.name).join(', ')}
              </p>
            )}
            <span className="text-bone/60 block text-[11px]">
              {coordinatorsList.length} Event Coordinators Assigned
            </span>
            <span className="text-volt font-bold block pt-1 text-[10px] uppercase">
              VIEW CONTACTS →
            </span>
          </div>
        ),
        expanded: (
          <div className="space-y-6">
            {organizersList.length > 0 && (
              <div className="space-y-2">
                <span className="font-mono text-xs uppercase text-bone/50 block">ORGANIZERS</span>
                <div className="flex flex-wrap gap-2">
                  {organizersList.map((org: Organizer, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1 border border-bone/25 bg-bone/[0.03] font-mono text-xs text-bone font-bold"
                    >
                      {org.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {coordinatorsList.length > 0 && (
              <div className="space-y-3">
                <span className="font-mono text-xs uppercase text-bone/50 block">COORDINATORS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {coordinatorsList.map((coord: Coordinator, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 border border-bone/20 bg-bone/[0.02] space-y-1 font-mono text-xs"
                    >
                      <span className="text-bone font-bold block">{coord.name}</span>
                      {coord.role && <span className="text-bone/50 block text-[11px]">{coord.role}</span>}
                      {coord.contact && (
                        <a
                          href={`mailto:${coord.contact}`}
                          className="text-volt hover:underline block pt-1 text-[11px]"
                        >
                          {coord.contact}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
      })
    }

    return cards
  }, [
    detailEvent,
    descriptionGist,
    descriptionParagraphs,
    scheduleDates,
    openFaqIndex,
    timelineProgress,
  ])

  // Current active bento item for expansion
  const activeBentoItem = useMemo(
    () => bentoCards.find((c) => c.id === activeBentoId) || null,
    [bentoCards, activeBentoId]
  )

  const activeIndex = useMemo(
    () => bentoCards.findIndex((c) => c.id === activeBentoId),
    [bentoCards, activeBentoId]
  )

  const handlePrevBento = useCallback(() => {
    if (activeIndex === -1 || bentoCards.length === 0) return
    const prevIdx = (activeIndex - 1 + bentoCards.length) % bentoCards.length
    openBento(bentoCards[prevIdx].id)
  }, [activeIndex, bentoCards])

  const handleNextBento = useCallback(() => {
    if (activeIndex === -1 || bentoCards.length === 0) return
    const nextIdx = (activeIndex + 1) % bentoCards.length
    openBento(bentoCards[nextIdx].id)
  }, [activeIndex, bentoCards])

  // Handle panel scroll to update drawing timeline line
  const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const scrolled = el.scrollTop
    const maxScroll = el.scrollHeight - el.clientHeight
    const pct = maxScroll > 0 ? Math.min(1, scrolled / maxScroll) : 1
    setTimelineProgress(pct)
  }

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

  if (!event) return null

  const isRegistrationOpen = event.registration_status === 'OPEN'
  const registrationHref = `${REGISTRATION_URL_BASE}?eventId=${encodeURIComponent(event.id)}`
  const rawHeroImage = imageError
    ? FALLBACK_COVER_IMAGE
    : event.banner_image_url || event.cover_image_url || FALLBACK_COVER_IMAGE

  const heroImageSrc = rawHeroImage.includes('images.pexels.com')
    ? `${rawHeroImage.split('?')[0]}?auto=compress&cs=tinysrgb&w=1200&fit=crop`
    : rawHeroImage

  // STICKY NOTE: "Who can participate"
  const stickyNote = (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      transition={{ type: 'spring', damping: 14, stiffness: 220 }}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)',
      }}
      className="relative bg-volt text-ink p-5 sm:p-6 border-2 border-ink/40 rotate-[-2deg] shadow-xl select-none"
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
            ENTRY NOTE // CAMPUS FEST
          </span>
          <h3 className="font-display italic font-black text-xl text-ink leading-tight">
            Who can participate
          </h3>
        </div>

        {/* Team Size line */}
        <div className="font-mono text-xs text-ink/90 font-bold border-b border-ink/20 pb-2">
          <span>Team: {formatTeamSize(event.min_teamsize, event.max_teamsize)}</span>
        </div>

        {/* Eligibility items (max 3) */}
        <div className="space-y-1.5 font-sans text-xs text-ink/90 font-medium leading-snug">
          {detailEvent?.eligibility && detailEvent.eligibility.length > 0 ? (
            <>
              {detailEvent.eligibility.slice(0, 3).map((item: string, idx: number) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <span className="font-mono font-bold text-ink">›</span>
                  <span className="line-clamp-2">{item}</span>
                </div>
              ))}
              {detailEvent.eligibility.length > 3 && (
                <button
                  type="button"
                  onClick={() => openBento('eligibility')}
                  className="font-mono text-[10px] uppercase font-black tracking-wider text-ink underline block pt-1"
                >
                  +{detailEvent.eligibility.length - 3} more criteria
                </button>
              )}
            </>
          ) : (
            <p>Open for all registered university students with valid student ID card.</p>
          )}
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
        {/* Price & Billing Header */}
        <div className="space-y-1 border-b border-bone/15 pb-3">
          <div className="flex items-baseline justify-between">
            <span className="font-display font-black text-3xl sm:text-4xl text-volt tracking-tight">
              {formatPrice(event.price, event.is_per_head)}
            </span>
            <span className="font-mono text-[10px] uppercase text-bone/60 font-bold">
              {event.is_per_head ? 'PER HEAD' : 'PER TEAM'}
            </span>
          </div>
          <span className="font-mono text-xs text-bone/70 block">
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
          to="/"
          className="flex items-center gap-2 hover:text-volt transition-colors font-bold uppercase"
        >
          <span>← All Events</span>
        </Link>

        <div className="flex items-center gap-4">
          {prevEvent && (
            <Link
              to="/events/$eventId"
              params={{ eventId: prevEvent.id }}
              className="hover:text-volt transition-colors font-bold uppercase flex items-center gap-1"
            >
              <span>[← Prev Pass]</span>
            </Link>
          )}
          {nextEvent && (
            <Link
              to="/events/$eventId"
              params={{ eventId: nextEvent.id }}
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
            className="font-display font-black text-3xl sm:text-5xl md:text-6xl uppercase tracking-tight text-bone leading-[0.95]"
          >
            <SplitText text={event.name} tag="span" />
          </motion.h1>

          {/* Meta Info Pills */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-bone/80">
            <Badge variant="volt">{event.category || 'GENERAL'}</Badge>
            <Badge variant="outline">{event.event_mode || 'OFFLINE'}</Badge>
            <Badge variant="outline">
              {formatEventDateTime(event.schedule_summary?.start_date, event.schedule_summary?.start_time)}
            </Badge>
            <Badge variant="outline">{formatPrice(event.price, event.is_per_head)}</Badge>
          </div>
        </div>
      </section>

      {/* MOBILE ONLY: STICKY NOTE DIRECTLY AFTER HERO */}
      <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {stickyNote}
      </div>

      {/* 3. TWO COLUMNS LAYOUT: LEFT BENTO GRID, RIGHT STICKY STACK */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: BENTO GRID OF GIST CARDS */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-12">
            <div className="space-y-2">
              <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
                PASS EXPLORER // BENTO GISTS
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone tracking-tight">
                Event Gist Grid
              </h2>
            </div>

            {/* Bento Grid or Per-Card Skeletons */}
            {isDetailLoading && !detailEvent ? (
              <div className="grid grid-cols-12 gap-4 sm:gap-6 animate-pulse">
                <div className="col-span-12 md:col-span-8 h-36 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-32" />
                </div>
                <div className="col-span-12 md:col-span-4 h-36 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-20" />
                  <SkeletonBlock className="h-4 w-full" />
                  <SkeletonBlock className="h-4 w-24" />
                </div>
                <div className="col-span-12 md:col-span-6 h-32 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>
                <div className="col-span-12 md:col-span-6 h-32 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-4/5" />
                </div>
                <div className="col-span-12 md:col-span-6 h-32 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-4 w-3/4" />
                </div>
                <div className="col-span-12 md:col-span-6 h-32 border-2 border-bone/20 bg-bone/[0.02] p-5 flex flex-col justify-between">
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-4 w-2/3" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 sm:gap-6">
                {bentoCards.map((card, idx) => (
                  <motion.button
                    key={card.id}
                    ref={(el) => {
                      cardRefs.current[card.id] = el
                    }}
                    layoutId={`bento-card-${card.id}`}
                    onClick={() => openBento(card.id)}
                    initial={{ opacity: 0, y: 20, rotate: idx % 2 === 0 ? -1 : 1 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.04 }}
                    className={`${card.colSpan} text-left border-2 border-bone/25 bg-ink p-5 sm:p-6 hover:border-volt hover:bg-bone/[0.02] transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt shadow-lg`}
                  >
                    {/* Chamfered corner accents */}
                    <div
                      aria-hidden="true"
                      className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-bone/40 group-hover:border-volt"
                    />
                    <div
                      aria-hidden="true"
                      className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-bone/40 group-hover:border-volt"
                    />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-bone/15 pb-2">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-volt font-bold">
                          {card.label}
                        </span>
                        <span className="font-mono text-xs text-bone/40 group-hover:text-volt transition-colors font-bold">
                          [+]
                        </span>
                      </div>

                      <h3 className="font-display text-lg sm:text-xl font-black uppercase text-bone leading-tight">
                        {card.title}
                      </h3>

                      {/* Gist content */}
                      <div>{card.gist}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

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

      {/* 4. EXPAND IN PLACE MODAL (Shared layoutId, Focus Trap, Esc, Prev/Next) */}
      <AnimatePresence>
        {activeBentoItem && (
          <div
            className="fixed inset-0 z-50 bg-ink/90 flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={closeBento}
          >
            <motion.div
              ref={modalPanelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={activeBentoItem.title}
              layoutId={`bento-card-${activeBentoItem.id}`}
              onClick={(e) => e.stopPropagation()}
              onScroll={handleModalScroll}
              drag={typeof window !== 'undefined' && window.innerWidth < 768 ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) closeBento()
              }}
              data-lenis-prevent
              className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[85vh] bg-ink border-t-2 sm:border-2 border-bone/35 overflow-y-auto p-6 sm:p-10 space-y-6 shadow-2xl focus:outline-none rounded-t-2xl sm:rounded-none"
            >
              {/* Mobile Drag Handle */}
              <div
                aria-hidden="true"
                className="w-12 h-1.5 bg-bone/30 rounded-full mx-auto sm:hidden -mt-2 mb-3 cursor-grab"
              />

              {/* Top Modal Controls */}
              <div className="flex items-center justify-between border-b-2 border-bone/20 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-volt rotate-45 shrink-0" />
                  <span className="font-mono text-xs uppercase tracking-widest text-volt font-black">
                    {activeBentoItem.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs select-none">
                  {/* Prev / Next Arrows */}
                  <div className="flex items-center gap-1 border border-bone/20 p-0.5 bg-bone/[0.02]">
                    <button
                      type="button"
                      onClick={handlePrevBento}
                      className="px-2 py-1 text-bone hover:text-volt hover:bg-bone/10 transition-colors"
                      aria-label="Previous card"
                    >
                      ←
                    </button>
                    <span className="text-bone/40 px-1">
                      {activeIndex + 1}/{bentoCards.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextBento}
                      className="px-2 py-1 text-bone hover:text-volt hover:bg-bone/10 transition-colors"
                      aria-label="Next card"
                    >
                      →
                    </button>
                  </div>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={closeBento}
                    className="border border-bone/25 px-3 py-1 text-bone hover:border-volt hover:text-volt transition-colors font-bold uppercase"
                  >
                    [ESC] CLOSE
                  </button>
                </div>
              </div>

              {/* Title */}
              <h2 className="font-display text-2xl sm:text-3xl font-black uppercase text-bone tracking-tight">
                {activeBentoItem.title}
              </h2>

              {/* Expanded Content */}
              <div className="pt-2">{activeBentoItem.expanded}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. GALLERY LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxImage && (
          <div
            className="fixed inset-0 z-50 bg-ink/95 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden border-2 border-bone/30">
              <img
                src={lightboxImage}
                alt="Full preview"
                className="w-full h-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-3 right-3 font-mono text-xs uppercase bg-ink/90 border border-bone/30 px-3 py-1 text-volt font-bold"
              >
                [ESC] CLOSE
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. RELATED PASSES RAIL (Static TicketShape Cards) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 border-t-2 border-bone/15 mt-20">
        <EventRail
          events={relatedEvents}
          title="More Campus Passes"
          subtitle="EXPLORE MORE"
        />
      </section>
    </article>
  )
}
