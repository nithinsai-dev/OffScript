import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'motion/react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { SectionError } from '@/components/ui/SectionError'
import type { EventDetail } from '@/types/event'
import { MOTION, MOTION_SCALE } from '@/lib/motion'
import { formatPrizeAmount } from '@/lib/formatters'
import { logAnimationStart } from '@/lib/pageReady'
import {
  shouldPlayFullSequence,
  runMechanicalAssemblySequence,
  runCardQuickSequence,
  runCardFadeSequence,
} from './cardSequence'

interface FlipCardBentoProps {
  event: EventDetail | null
  isDetailLoading?: boolean
  isDetailError?: boolean
  onRetry?: () => void
  onOpenFull: (cardId: string, originatingElement?: HTMLElement | null) => void
  activeCardOverride?: string | null
  isShutterReady?: boolean
}

export interface CardDef {
  id: string
  number: string
  title: string
  countBadge?: string
  desktopSpan: string // Tailwind col-span classes
  hasData: boolean
}

export function FlipCardBento({
  event,
  isDetailLoading = false,
  isDetailError = false,
  onRetry,
  onOpenFull,
  activeCardOverride,
  isShutterReady = true,
}: FlipCardBentoProps) {
  const prefersReduced = usePrefersReducedMotion()
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Single parent store tracking active flipped card ID (only one card flipped at a time)
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const isFlipLockedRef = useRef(false)
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const punchedCardsRef = useRef<Set<string>>(new Set())
  const [punchedCards, setPunchedCards] = useState<Set<string>>(() => new Set())

  // Determine whether to play full drop-shatter sequence
  const willRunFull = useMemo(() => {
    return shouldPlayFullSequence(Boolean(isLite), prefersReduced)
  }, [isLite, prefersReduced])

  // Sequence completion tracking
  const [sequenceDone, setSequenceDone] = useState(!willRunFull)
  const [isInView, setIsInView] = useState(false)
  const hasTriggeredRef = useRef(false)
  const cancelSequenceRef = useRef<(() => void) | null>(null)

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const frontBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const backHeadingRefs = useRef<Record<string, HTMLHeadingElement | null>>({})
  const gridWrapperRef = useRef<HTMLDivElement | null>(null)

  // Cleanup on unmount: kill running timeline & reset flip state
  useEffect(() => {
    return () => {
      if (cancelSequenceRef.current) {
        cancelSequenceRef.current()
        cancelSequenceRef.current = null
      }
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current)
      }
    }
  }, [])

  // IntersectionObserver: cards section in view (threshold 0.1) or already in view at mount
  useEffect(() => {
    if (hasTriggeredRef.current || !gridWrapperRef.current) return

    // Immediate check if section is already in viewport
    const rect = gridWrapperRef.current.getBoundingClientRect()
    if (rect.top < window.innerHeight) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry && entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(gridWrapperRef.current)
    return () => observer.disconnect()
  }, [])

  // Card definitions with real data wiring (Eligibility card removed, re-flowed without holes)
  const cards: CardDef[] = useMemo(() => {
    const list: CardDef[] = [
      {
        id: 'overview',
        number: '01',
        title: 'Overview',
        countBadge: 'Briefing',
        desktopSpan: 'lg:col-span-2',
        hasData: Boolean(event?.description || event?.blurb),
      },
      {
        id: 'highlights',
        number: '02',
        title: 'Highlights',
        countBadge: event?.highlights?.length ? `${event.highlights.length} perks` : 'Perks',
        desktopSpan: 'lg:col-span-1',
        hasData: Boolean(event?.highlights && event.highlights.length > 0),
      },
      {
        id: 'expect',
        number: '03',
        title: 'What to expect',
        countBadge: event?.what_to_expect?.length ? `${event.what_to_expect.length} items` : 'Expect',
        desktopSpan: 'lg:col-span-1',
        hasData: Boolean(event?.what_to_expect && event.what_to_expect.length > 0),
      },
      {
        id: 'prerequisites',
        number: '04',
        title: 'Prerequisites',
        countBadge: event?.prerequisites?.length ? `${event.prerequisites.length} items` : 'Items',
        desktopSpan: 'lg:col-span-2',
        hasData: Boolean(event?.prerequisites && event.prerequisites.length > 0),
      },
      {
        id: 'rules',
        number: '05',
        title: 'Rules',
        countBadge: event?.rules?.length ? `${event.rules.length} rules` : 'Rules',
        desktopSpan: 'lg:col-span-2',
        hasData: Boolean(event?.rules && event.rules.length > 0),
      },
      {
        id: 'schedule',
        number: '06',
        title: 'Schedule',
        countBadge: event?.schedules?.length
          ? `${event.schedules.length} dates`
          : event?.schedule_summary?.start_date
          ? '1 date'
          : 'Dates',
        desktopSpan: 'lg:col-span-1',
        hasData: Boolean((event?.schedules && event.schedules.length > 0) || event?.schedule_summary?.start_date),
      },
      {
        id: 'prizes',
        number: '07',
        title: 'Prizes',
        countBadge: event?.prizes?.length ? `${event.prizes.length} tiers` : 'Tiers',
        desktopSpan: 'lg:col-span-2',
        hasData: Boolean(event?.prizes && event.prizes.length > 0),
      },
      {
        id: 'faqs',
        number: '08',
        title: 'FAQs',
        countBadge: event?.faqs?.length ? `${event.faqs.length} FAQs` : 'FAQs',
        desktopSpan: 'lg:col-span-1',
        hasData: Boolean(event?.faqs && event.faqs.length > 0),
      },
      {
        id: 'gallery',
        number: '09',
        title: 'Gallery',
        countBadge: event?.gallery_images?.length ? `${event.gallery_images.length} photos` : 'Photos',
        desktopSpan: 'lg:col-span-2',
        hasData: Boolean(event?.gallery_images && event.gallery_images.length > 0),
      },
      {
        id: 'contact',
        number: '10',
        title: 'Contact',
        countBadge:
          (event?.organizers?.length || 0) + (event?.coordinators?.length || 0) > 0
            ? `${(event?.organizers?.length || 0) + (event?.coordinators?.length || 0)} crew`
            : 'Crew',
        desktopSpan: 'lg:col-span-1',
        hasData: Boolean(
          (event?.organizers && event.organizers.length > 0) ||
          (event?.coordinators && event.coordinators.length > 0)
        ),
      },
    ]

    // While loading skeleton, keep all cards visible to avoid layout jump
    if (isDetailLoading && !event?.description && !event?.rules) {
      return list
    }

    // Hide a card ONLY if its data is truly empty after loading
    return list.filter((c) => c.hasData)
  }, [event, isDetailLoading])

  // Start condition: cards data loaded (not skeleton) AND in view AND shutter ready
  // Starts only when: event data loaded, first content painted, and LCP rendered
  useEffect(() => {
    if (hasTriggeredRef.current) return
    if (isDetailLoading || cards.length === 0) return
    if (!isInView || !isShutterReady) return

    hasTriggeredRef.current = true

    // Double requestAnimationFrame ensures first paint and LCP rendered before starting
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(() => {
        const gridEl = gridWrapperRef.current
        if (!gridEl) {
          setSequenceDone(true)
          return
        }

        const cardEls = Array.from(
          gridEl.querySelectorAll<HTMLElement>('.flip-card-item')
        )

        if (cardEls.length === 0) {
          setSequenceDone(true)
          return
        }

        logAnimationStart('Event Detail Card Assembly')

        if (prefersReduced) {
          cancelSequenceRef.current = runCardFadeSequence(gridEl, cardEls, () => {
            setSequenceDone(true)
          })
        } else if (willRunFull) {
          cancelSequenceRef.current = runMechanicalAssemblySequence(gridEl, cardEls, () => {
            setSequenceDone(true)
          })
        } else {
          cancelSequenceRef.current = runCardQuickSequence(gridEl, cardEls, () => {
            setSequenceDone(true)
          })
        }
      })
      return () => cancelAnimationFrame(r2)
    })

    return () => cancelAnimationFrame(r1)
  }, [isDetailLoading, cards.length, isInView, isShutterReady, willRunFull, prefersReduced])

  // THE SURPRISE: "ticket punch"
  // After flip settles: Volt ring scales 0 to 1 in 20px slot (0.2s),
  // diamond chip pops out of that ring, arcs up ~24px and fades (0.8s),
  // contained inside card box (overflow hidden, cannot cross footer).
  // First flip of each card in session only.
  // Lite mode and reduced motion: ring shows statically, no chip.
  const triggerTicketPunch = useCallback(
    (cardId: string) => {
      if (punchedCardsRef.current.has(cardId)) return
      punchedCardsRef.current.add(cardId)
      setPunchedCards(new Set(punchedCardsRef.current))

      if (isLite || prefersReduced) return

      const cardEl = cardRefs.current[cardId]
      if (!cardEl) return

      const slotEl = cardEl.querySelector(`[data-punch-slot="${cardId}"]`) as HTMLElement | null
      if (!slotEl) return

      // 1. Volt ring scales from 0 to 1 in the 20px slot (0.2s)
      gsap.fromTo(
        slotEl,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.2 * MOTION_SCALE, ease: 'back.out(2)' }
      )

      // 2. Diamond chip pops out of that ring, arcs up about 24px and fades (0.8s)
      const chip = document.createElement('div')
      chip.className = 'ticket-punch-chip pointer-events-none absolute z-50'
      chip.style.width = '8px'
      chip.style.height = '8px'
      chip.style.backgroundColor = '#D4FF3F'
      chip.style.transform = 'rotate(45deg)'
      chip.style.left = '6px'
      chip.style.top = '6px'
      slotEl.appendChild(chip)

      const punchTl = gsap.timeline({
        onComplete: () => {
          chip.remove()
        },
      })

      // Arcs up about 24px (0.35s) then fades out (0.45s) = 0.8s total
      punchTl.to(chip, {
        y: -24,
        x: -4,
        rotation: 90,
        duration: 0.35 * MOTION_SCALE,
        ease: 'power1.out',
      })
      punchTl.to(chip, {
        y: -10,
        x: -8,
        opacity: 0,
        rotation: 180,
        duration: 0.45 * MOTION_SCALE,
        ease: 'power2.in',
      })
    },
    [isLite, prefersReduced]
  )

  // FLIP MECHANICS: 1.1s duration, ease power3.inOut, lift scale 1.04 + deeper hard Volt shadow + sheen during rotation
  const flipCardToBack = useCallback(
    (cardId: string) => {
      if (isDetailLoading) return
      if (isFlipLockedRef.current) return
      if (flippedId === cardId) return

      // If another card is flipped, reset it immediately without animation
      if (flippedId && flippedId !== cardId) {
        const prevCard = cardRefs.current[flippedId]
        if (prevCard) {
          gsap.set(prevCard, { rotateY: 0, scale: 1, boxShadow: '0 0 0 transparent' })
        }
      }

      isFlipLockedRef.current = true
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      lockTimerRef.current = setTimeout(() => {
        isFlipLockedRef.current = false
      }, 1500)

      setFlippedId(cardId)
      window.history.replaceState(null, '', `#${cardId}`)

      const cardEl = cardRefs.current[cardId]
      if (!cardEl) {
        isFlipLockedRef.current = false
        return
      }

      if (isLite || prefersReduced) {
        gsap.set(cardEl, { rotateY: 180 })
        isFlipLockedRef.current = false
        triggerTicketPunch(cardId)
        setTimeout(() => {
          backHeadingRefs.current[cardId]?.focus()
        }, 50)
        return
      }

      const sheenEl = cardEl.querySelector('.card-shiny-sheen')
      const tl = gsap.timeline({
        onComplete: () => {
          isFlipLockedRef.current = false
          backHeadingRefs.current[cardId]?.focus()
          triggerTicketPunch(cardId)
        },
      })

      // Lift: scale to 1.04 and deep hard Volt offset shadow
      tl.to(
        cardEl,
        {
          scale: 1.04,
          boxShadow: '0 0 0 2px #D4FF3F, 8px 8px 0px #D4FF3F',
          duration: 0.55 * MOTION_SCALE,
          ease: 'power3.out',
        },
        0
      )

      // Rotate: 0 -> 180deg (1.1s, power3.inOut)
      tl.to(
        cardEl,
        {
          rotateY: 180,
          duration: 1.1 * MOTION_SCALE,
          ease: 'power3.inOut',
        },
        0
      )

      // Sheen sweeps across DURING rotation
      if (sheenEl) {
        tl.fromTo(
          sheenEl,
          { x: '-100%', opacity: 1 },
          { x: '200%', opacity: 0, duration: 0.9 * MOTION_SCALE, ease: 'power2.inOut' },
          0.1
        )
      }

      // Settle back with tiny overshoot (0.25s)
      tl.to(
        cardEl,
        {
          scale: 1.0,
          boxShadow: '0 0 0 0px transparent, 0px 0px 0px transparent',
          duration: 0.25 * MOTION_SCALE,
          ease: 'back.out(1.8)',
        },
        1.1 * MOTION_SCALE
      )
    },
    [isDetailLoading, flippedId, isLite, prefersReduced, triggerTicketPunch]
  )

  const flipCardToFront = useCallback(
    (cardId: string) => {
      if (isFlipLockedRef.current) return

      isFlipLockedRef.current = true
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      lockTimerRef.current = setTimeout(() => {
        isFlipLockedRef.current = false
      }, 1500)

      setFlippedId(null)

      const cardEl = cardRefs.current[cardId]
      if (!cardEl) {
        isFlipLockedRef.current = false
        return
      }

      if (isLite || prefersReduced) {
        gsap.set(cardEl, { rotateY: 0 })
        isFlipLockedRef.current = false
        setTimeout(() => {
          frontBtnRefs.current[cardId]?.focus()
        }, 50)
        return
      }

      const tl = gsap.timeline({
        onComplete: () => {
          isFlipLockedRef.current = false
          frontBtnRefs.current[cardId]?.focus()
        },
      })

      // Lift: scale to 1.04 and Volt shadow
      tl.to(
        cardEl,
        {
          scale: 1.04,
          boxShadow: '0 0 0 2px #D4FF3F, 8px 8px 0px #D4FF3F',
          duration: 0.55 * MOTION_SCALE,
          ease: 'power3.out',
        },
        0
      )

      // Rotate: 180 -> 0deg (1.1s, power3.inOut)
      tl.to(
        cardEl,
        {
          rotateY: 0,
          duration: 1.1 * MOTION_SCALE,
          ease: 'power3.inOut',
        },
        0
      )

      // Settle back with tiny overshoot at end (0.25s)
      tl.to(
        cardEl,
        {
          scale: 1.0,
          boxShadow: '0 0 0 0px transparent, 0px 0px 0px transparent',
          duration: 0.25 * MOTION_SCALE,
          ease: 'back.out(1.8)',
        },
        1.1 * MOTION_SCALE
      )
    },
    [isLite, prefersReduced]
  )

  // Esc key flips back the currently flipped card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && flippedId && !isFlipLockedRef.current) {
        e.preventDefault()
        flipCardToFront(flippedId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flippedId, flipCardToFront])

  // Listen to global route exit event: clean up timeline and flip back without animating
  useEffect(() => {
    const handleRouteExit = () => {
      if (cancelSequenceRef.current) {
        cancelSequenceRef.current()
        cancelSequenceRef.current = null
      }
      setFlippedId(null)
      isFlipLockedRef.current = false
      Object.values(cardRefs.current).forEach((el) => {
        if (el) {
          gsap.set(el, { rotateY: 0, scale: 1, boxShadow: 'none' })
        }
      })
    }

    window.addEventListener('offscript:route-exit', handleRouteExit)
    return () => window.removeEventListener('offscript:route-exit', handleRouteExit)
  }, [])

  // Hash deep links (#faqs, #rules, etc.): scroll to card and flip it using replaceState
  useEffect(() => {
    if (typeof window === 'undefined' || isDetailLoading) return
    const rawHash = window.location.hash.replace('#', '')
    if (rawHash && cards.some((c) => c.id === rawHash)) {
      const timer = window.setTimeout(() => {
        const targetCard = cardRefs.current[rawHash]
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        flipCardToBack(rawHash)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isDetailLoading, cards, flipCardToBack])

  // Listen to activeCardOverride from parent (e.g. sticky note "All eligibility")
  useEffect(() => {
    if (activeCardOverride && cards.some((c) => c.id === activeCardOverride)) {
      const timer = window.setTimeout(() => {
        const targetCard = cardRefs.current[activeCardOverride]
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        flipCardToBack(activeCardOverride)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [activeCardOverride, cards, flipCardToBack])

  if (isDetailError) {
    return (
      <div className="py-8">
        <SectionError
          title="Information Unavailable"
          message="Event detail sections could not be synchronized."
          onRetry={onRetry}
        />
      </div>
    )
  }

  // RENDER BACK FACE BODY (Body row in 3-row flex column)
  const renderBackPreview = (cardId: string) => {
    switch (cardId) {
      case 'overview': {
        const text = event?.description || event?.blurb || 'Full pass details available in briefing.'
        return (
          <p className="font-sans text-xs text-bone/80 leading-relaxed">
            {text}
          </p>
        )
      }

      case 'highlights': {
        const items = event?.highlights || []
        const previewItems = items.slice(0, 4)
        return (
          <div className="space-y-1.5">
            {previewItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-bone/85">
                <span className="w-1.5 h-1.5 bg-volt mt-1.5 shrink-0 rotate-45" />
                <span className="line-clamp-2">{item}</span>
              </div>
            ))}
          </div>
        )
      }

      case 'expect': {
        const items = event?.what_to_expect || []
        const previewItems = items.slice(0, 3)
        return (
          <div className="space-y-1.5">
            {previewItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-bone/85">
                <span className="w-1.5 h-1.5 bg-volt mt-1.5 shrink-0 rotate-45" />
                <span className="line-clamp-2">{item}</span>
              </div>
            ))}
          </div>
        )
      }

      case 'prerequisites': {
        const items = event?.prerequisites || []
        const previewItems = items.slice(0, 3)
        return (
          <div className="space-y-1.5">
            {previewItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-bone/85">
                <span className="font-mono text-volt font-bold">›</span>
                <span className="line-clamp-2">{item}</span>
              </div>
            ))}
          </div>
        )
      }

      case 'rules': {
        const items = event?.rules || []
        const previewItems = items.slice(0, 3)
        return (
          <div className="space-y-1.5">
            {previewItems.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-bone/85">
                <span className="font-mono text-[10px] text-volt bg-ink px-1 border border-volt/40 shrink-0 font-bold">
                  #{i + 1}
                </span>
                <span className="line-clamp-2">{rule}</span>
              </div>
            ))}
          </div>
        )
      }

      case 'schedule': {
        const dates = event?.schedules || []
        const summary = event?.schedule_summary
        const dateList = dates.length > 0 ? dates : summary?.start_date ? [{ event_date: summary.start_date, start_time: summary.start_time, end_time: summary.end_time, venue: 'Campus Arena' }] : []
        const previewDates = dateList.slice(0, 2)

        return (
          <div className="space-y-2">
            {previewDates.map((item, i) => {
              const dateObj = new Date(item.event_date)
              const day = Number.isNaN(dateObj.getTime()) ? item.event_date.slice(-2) : String(dateObj.getDate()).padStart(2, '0')
              const month = Number.isNaN(dateObj.getTime()) ? 'TBA' : dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              return (
                <div key={i} className="flex items-center gap-3 p-2 border border-bone/15 bg-bone/[0.02]">
                  <div className="border border-bone/25 px-2 py-1 text-center bg-ink shrink-0">
                    <span className="font-display font-black text-sm text-volt leading-none block">{day}</span>
                    <span className="font-mono text-[8px] text-bone/60 uppercase block">{month}</span>
                  </div>
                  <div className="font-mono text-[11px] text-bone/80 truncate">
                    <span className="text-volt font-bold block">{item.start_time || 'TBA'}{item.end_time ? ` - ${item.end_time}` : ''}</span>
                    <span className="text-bone/50 text-[10px] truncate block">{item.venue || 'Campus venue'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }

      case 'prizes': {
        const prizes = event?.prizes || []
        const previewPrizes = prizes.slice(0, 3)
        return (
          <div className="space-y-2">
            {previewPrizes.map((p, i) => {
              const formatted = formatPrizeAmount(p.amount)
              return (
                <div key={i} className="flex items-center justify-between p-2 border border-bone/15 bg-bone/[0.02] font-mono text-xs">
                  <span className="text-bone font-bold truncate max-w-[150px]">
                    #{p.rank || i + 1} {p.title || 'Award'}
                  </span>
                  {formatted && (
                    <span className="text-volt font-bold text-xs shrink-0">
                      {formatted}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )
      }

      case 'faqs': {
        const faqs = event?.faqs || []
        const previewFaqs = faqs.slice(0, 2)
        return (
          <div className="space-y-2">
            {previewFaqs.map((f, i) => (
              <div key={i} className="p-2 border border-bone/15 bg-bone/[0.02] space-y-1">
                <span className="font-mono text-xs text-volt font-bold line-clamp-1">Q: {f.question}</span>
                <span className="font-sans text-[11px] text-bone/70 line-clamp-2 block">{f.answer}</span>
              </div>
            ))}
          </div>
        )
      }

      case 'gallery': {
        const images = event?.gallery_images || []
        const previewImages = images.slice(0, 3)
        return (
          <div className="grid grid-cols-3 gap-2 items-center">
            {previewImages.map((img, i) => (
              <div key={i} className="aspect-video border border-bone/20 overflow-hidden bg-bone/5">
                <img
                  src={img}
                  alt={`Gallery preview ${i + 1}`}
                  loading="lazy"
                  decoding="async"
                  width={200}
                  height={150}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )
      }

      case 'contact': {
        const orgs = event?.organizers || []
        const coords = event?.coordinators || []
        return (
          <div className="space-y-2 font-mono text-xs">
            {orgs.length > 0 && (
              <p className="text-bone font-bold line-clamp-1">
                Org: <span className="text-bone/80 font-normal">{orgs.map((o) => o.name).join(', ')}</span>
              </p>
            )}
            {coords.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-center justify-between text-[11px] border-b border-bone/10 pb-1">
                <span className="text-bone/90">{c.name}</span>
                {c.contact && (
                  <a
                    href={`mailto:${c.contact}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-volt hover:underline"
                  >
                    email ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      }

      default:
        return null
    }
  }

  // Animation variants for card exit: reverse stagger of 25ms (Part 6)
  const containerVariants = {
    exit: {
      transition: {
        staggerChildren: MOTION.eventDetailExit.cardsStagger, // 0.025s (25ms)
        staggerDirection: -1,
      },
    },
  }

  // Card exit: fly toward the viewer, scale to 1.15 and opacity to 0, 0.45s, ease-in (Part 6)
  const cardExitVariants = useMemo(() => {
    if (prefersReduced) {
      return {
        exit: {
          transition: { duration: 0 },
        },
      }
    }
    if (isLite) {
      return {
        exit: {
          opacity: 0,
          transition: { duration: MOTION.eventDetailExit.liteFade, ease: 'easeOut' as const },
        },
      }
    }
    return {
      exit: {
        opacity: 0,
        scale: MOTION.eventDetailExit.cardsScale, // 1.15
        transition: {
          duration: MOTION.eventDetailExit.cardsDuration, // 0.45s
          ease: [0.4, 0, 1, 1] as const, // ease-in
        },
      },
    }
  }, [prefersReduced, isLite])

  return (
    <section className="space-y-6">
      {/* Section Heading: Single plain heading "What's inside" */}
      <div className="space-y-1 pb-2 border-b-2 border-bone/15">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          PASS INFORMATION
        </span>
        <h2 className="font-display text-3xl sm:text-4xl font-black uppercase text-bone tracking-tight">
          What's inside
        </h2>
      </div>

      {/* Bento Grid Wrapper: Static perspective, desktop varied sizes, mobile single column */}
      <motion.div
        ref={gridWrapperRef}
        data-enter={sequenceDone ? undefined : 'pending'}
        variants={containerVariants}
        exit="exit"
        className="flip-grid-wrapper relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 select-none"
      >
        {cards.map((card) => {
          const isFlipped = flippedId === card.id

          return (
            <motion.div
              key={card.id}
              data-card-id={card.id}
              variants={cardExitVariants}
              onAnimationStart={(def) => {
                if (def === 'exit') {
                  const el = cardRefs.current[card.id]
                  if (el) el.style.willChange = 'transform, opacity'
                }
              }}
              onAnimationComplete={(def) => {
                if (def === 'exit') {
                  const el = cardRefs.current[card.id]
                  if (el) el.style.willChange = 'auto'
                }
              }}
              className={`flip-card-item relative ${card.desktopSpan} min-h-[190px] flex`}
              style={{ perspective: 1200 }}
            >
              <div
                ref={(el) => {
                  cardRefs.current[card.id] = el
                }}
                className="w-full h-full relative"
                style={{
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* FRONT FACE: Heading alone, big and bold, number, tiny count badge, small flip icon */}
                <button
                  ref={(el) => {
                    frontBtnRefs.current[card.id] = el
                  }}
                  type="button"
                  role="button"
                  aria-expanded={isFlipped}
                  aria-disabled={isDetailLoading}
                  aria-label={`${card.title}, ${card.countBadge || ''}. Flip to read.`}
                  aria-hidden={isFlipped}
                  tabIndex={isFlipped ? -1 : 0}
                  onClick={() => flipCardToBack(card.id)}
                  disabled={isDetailLoading}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className={`flip-card-front absolute inset-0 w-full h-full text-left p-5 sm:p-6 border-2 border-bone/25 bg-[#111210] flex flex-col justify-between overflow-hidden clip-chamfer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt group cursor-pointer ${
                    isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
                  }`}
                >
                  {/* Shiny Sheen Pseudo-Element (Desktop hover) */}
                  <div aria-hidden="true" className="card-shiny-sheen" />

                  {/* Top Bar: Number & Tiny Count Badge */}
                  <div className="flex items-center justify-between font-mono text-xs w-full relative z-10">
                    <span className="text-volt font-black tracking-wider text-sm">{card.number}</span>
                    <span
                      className={`px-2 py-0.5 border border-bone/20 text-bone/60 text-[10px] uppercase font-bold tracking-wider bg-bone/[0.03] ${
                        isDetailLoading ? 'animate-pulse bg-bone/15 text-transparent border-transparent' : ''
                      }`}
                    >
                      {card.countBadge}
                    </span>
                  </div>

                  {/* Big Bold Heading Alone (No body text on front) */}
                  <div className="space-y-1 relative z-10 my-auto py-2">
                    <h3 className="font-display font-black text-2xl sm:text-3xl uppercase tracking-tight text-bone group-hover:text-volt transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  {/* Bottom: Subtle flip-hint affordance icon */}
                  <div className="flex items-center justify-between pt-2 border-t border-bone/10 font-mono text-[10px] text-bone/40 uppercase tracking-widest relative z-10">
                    <span className="group-hover:text-bone transition-colors">TAP / CLICK TO FLIP</span>
                    {/* Small flip icon */}
                    <span
                      aria-hidden="true"
                      className="text-volt font-bold text-sm group-hover:rotate-180 transition-transform duration-300"
                    >
                      ⤾
                    </span>
                  </div>
                </button>

                {/* BACK FACE: 3-row flex column with reserved space */}
                <div
                  aria-hidden={!isFlipped}
                  inert={!isFlipped}
                  onClick={() => flipCardToFront(card.id)}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  className={`flip-card-back absolute inset-0 w-full h-full border-2 border-bone/35 bg-[#161715] flex flex-col justify-between overflow-hidden clip-chamfer cursor-pointer ${
                    !isFlipped ? 'pointer-events-none' : 'pointer-events-auto'
                  }`}
                >
                  {/* ROW 1: HEADER ROW (small label + count on the left, a 20px "punch hole" slot on the right) */}
                  <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-bone/15 bg-bone/[0.03]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-volt font-black shrink-0">{card.number}</span>
                      <h4
                        ref={(el) => {
                          backHeadingRefs.current[card.id] = el
                        }}
                        tabIndex={-1}
                        className="font-display font-black text-xs sm:text-sm uppercase tracking-tight text-bone focus:outline-none truncate"
                      >
                        {card.title}
                      </h4>
                      {card.countBadge && (
                        <span className="font-mono text-[10px] text-bone/50 border border-bone/20 px-1.5 py-0.5 shrink-0">
                          {card.countBadge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          flipCardToFront(card.id)
                        }}
                        aria-label={`Flip ${card.title} card back to front`}
                        className="clip-chamfer px-2.5 py-0.5 bg-volt text-ink hover:bg-bone font-mono text-[10px] uppercase font-black tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span className="text-[9px]">⤾</span>
                        <span>BACK</span>
                      </button>

                      {/* 20px punch hole slot */}
                      <div
                        className="punch-hole-slot relative w-5 h-5 flex items-center justify-center shrink-0"
                        aria-label="Ticket punch slot"
                      >
                        <div
                          data-punch-slot={card.id}
                          className={`w-5 h-5 rounded-full border-2 border-volt transition-opacity ${
                            punchedCards.has(card.id) ? 'opacity-100' : 'opacity-0'
                          }`}
                          style={{ transformOrigin: 'center center' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ROW 2: BODY (scrollable if needed) */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 select-none">
                    {renderBackPreview(card.id)}
                  </div>

                  {/* ROW 3: FOOTER ROW (Open full button, always its own row, never overlapped) */}
                  <div className="shrink-0 px-4 py-2 border-t border-bone/15 bg-bone/[0.02] flex items-center justify-between font-mono text-xs">
                    <span className="text-bone/50 text-[10px] truncate">
                      {card.countBadge || 'Full details'}
                    </span>
                    <button
                      type="button"
                      aria-label={`Open full ${card.title} panel`}
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenFull(card.id, e.currentTarget as HTMLElement)
                      }}
                      className="text-volt uppercase font-black hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Open full</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
export default FlipCardBento
