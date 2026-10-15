import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { useLenis } from '@/hooks/useLenis'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import { MOTION } from '@/lib/motion'
import OverviewPane from './detail-tabs/OverviewPane'
import ListContentPane from './detail-tabs/ListContentPane'
import SchedulePane from './detail-tabs/SchedulePane'
import PrizesPane from './detail-tabs/PrizesPane'
import FaqsPane from './detail-tabs/FaqsPane'
import GalleryPane from './detail-tabs/GalleryPane'
import ContactPane from './detail-tabs/ContactPane'
import type { EventDetail } from '@/types/event'

export interface OpenFullPanelProps {
  cardId: string | null
  event: EventDetail
  availableCardIds: string[]
  onClose: () => void
  onNavigate: (nextCardId: string) => void
  originatingElement?: HTMLElement | null
}

const TAB_TITLES: Record<string, string> = {
  overview: '01 Overview',
  highlights: '02 Highlights',
  expect: '03 What to Expect',
  prerequisites: '04 Prerequisites',
  rules: '05 Rules & Guidelines',
  schedule: '06 Schedule & Timeline',
  prizes: '07 Prizes & Awards',
  faqs: '08 Frequently Asked Questions',
  gallery: '09 Event Gallery',
  contact: '10 Contact & Crew',
}

export function OpenFullPanel({
  cardId,
  event,
  availableCardIds,
  onClose,
  onNavigate,
  originatingElement,
}: OpenFullPanelProps) {
  const { getLenis } = useLenis()
  const prefersReduced = usePrefersReducedMotion()
  const modalRef = useRef<HTMLDivElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const chipRef = useRef<HTMLDivElement | null>(null)
  const isClosingRef = useRef(false)

  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Scroll lock while open
  useEffect(() => {
    if (!cardId) return

    const lenis = getLenis()
    if (lenis) {
      lenis.stop()
    } else {
      document.body.style.overflow = 'hidden'
    }

    return () => {
      const currentLenis = getLenis()
      if (currentLenis) {
        currentLenis.start()
      }
      document.body.style.overflow = ''
    }
  }, [cardId, getLenis])

  // CLOSE HANDLER: Different animation (scaleY fold 0.35s + chip swallowed into card 0.25s + Volt pulse + restore focus)
  const handleCloseRequest = useCallback(() => {
    if (isClosingRef.current) return
    isClosingRef.current = true

    const modalEl = modalRef.current
    const backdropEl = backdropRef.current
    const chipEl = chipRef.current

    if (prefersReduced) {
      originatingElement?.focus()
      onClose()
      return
    }

    if (isLite || !modalEl || !backdropEl || !chipEl) {
      if (modalEl && backdropEl) {
        gsap.to([modalEl, backdropEl], {
          opacity: 0,
          duration: MOTION.openFullPanel.liteFade,
          ease: 'power2.in',
          onComplete: () => {
            originatingElement?.focus()
            onClose()
          },
        })
      } else {
        originatingElement?.focus()
        onClose()
      }
      return
    }

    // Measure target return position (the button or card origin)
    const btnRect = originatingElement
      ? originatingElement.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
    const targetX = btnRect.left + (btnRect.width > 0 ? btnRect.width / 2 : 0) - 28
    const targetY = btnRect.top + (btnRect.height > 0 ? btnRect.height / 2 : 0) - 18

    const modalRect = modalEl.getBoundingClientRect()
    const chipStartX = modalRect.left + modalRect.width / 2 - 28
    const chipStartY = modalRect.top + modalRect.height / 2 - 18

    const closeTl = gsap.timeline({
      onComplete: () => {
        // Quick Volt pulse on originating card border
        if (originatingElement) {
          const cardContainer = originatingElement.closest('.flip-card-item') || originatingElement
          gsap.fromTo(
            cardContainer,
            { boxShadow: '0 0 16px 2px #D4FF3F' },
            { boxShadow: '0 0 0px 0px transparent', duration: 0.35 }
          )
        }
        originatingElement?.focus()
        onClose()
      },
    })

    // 1. Fold down: scaleY to thin strip (0.35s)
    closeTl.to(modalEl, {
      scaleY: 0.02,
      scaleX: 0.8,
      duration: MOTION.openFullPanel.foldDown,
      ease: 'power2.in',
    })

    // 2. Hide modal strip, spawn chip at center
    closeTl.set(modalEl, { opacity: 0 })
    closeTl.set(chipEl, {
      x: chipStartX,
      y: chipStartY,
      scale: 1,
      opacity: 1,
      rotation: 0,
    })

    // 3. Chip swallowed back into card (0.25s)
    closeTl.to(
      chipEl,
      {
        x: targetX,
        y: targetY,
        scale: 0.2,
        opacity: 0,
        duration: MOTION.openFullPanel.swallowBack,
        ease: 'power2.in',
      },
      MOTION.openFullPanel.foldDown
    )

    // 4. Backdrop fades out
    closeTl.to(
      backdropEl,
      {
        opacity: 0,
        duration: MOTION.openFullPanel.backdropFade,
        ease: 'power2.in',
      },
      MOTION.openFullPanel.foldDown * 0.8
    )
  }, [prefersReduced, isLite, originatingElement, onClose])

  // OPEN ANIMATION: Volt chip detaches from button (0.5s arc) -> unfolds to panel (0.55s) -> content staggers (0.05s)
  useEffect(() => {
    if (!cardId) return

    const modalEl = modalRef.current
    const backdropEl = backdropRef.current
    const chipEl = chipRef.current
    if (!modalEl || !backdropEl || !chipEl) return

    if (prefersReduced) {
      gsap.set(backdropEl, { opacity: 0.7 })
      gsap.set(modalEl, { opacity: 1, scale: 1 })
      closeButtonRef.current?.focus()
      return
    }

    if (isLite) {
      gsap.fromTo(backdropEl, { opacity: 0 }, { opacity: 0.7, duration: MOTION.openFullPanel.liteFade })
      gsap.fromTo(
        modalEl,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION.openFullPanel.liteFade,
          onComplete: () => closeButtonRef.current?.focus(),
        }
      )
      return
    }

    // Full Mode FLIP Opening Animation
    const btnRect = originatingElement
      ? originatingElement.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 }
    const startX = btnRect.left + (btnRect.width > 0 ? btnRect.width / 2 : 0) - 28
    const startY = btnRect.top + (btnRect.height > 0 ? btnRect.height / 2 : 0) - 18

    // Hide panel container initially while chip flies
    gsap.set(modalEl, { opacity: 0 })
    gsap.set(chipEl, {
      x: startX,
      y: startY,
      scale: 1,
      opacity: 1,
      rotation: 0,
    })

    const openTl = gsap.timeline({
      onComplete: () => {
        closeButtonRef.current?.focus()
      },
    })

    // 1. Overlay fades in (0.3s)
    openTl.to(
      backdropEl,
      {
        opacity: 0.7,
        duration: MOTION.openFullPanel.backdropFade,
        ease: 'power2.out',
      },
      0
    )

    // Calculate center target for panel
    const modalRect = modalEl.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    const targetX = isMobile ? window.innerWidth / 2 - 28 : modalRect.left + modalRect.width / 2 - 28
    const targetY = isMobile ? window.innerHeight - 80 : modalRect.top + modalRect.height / 2 - 18

    // 2. Chip flies along curved path (GSAP arc 0.5s)
    openTl.to(
      chipEl,
      {
        x: targetX,
        duration: MOTION.openFullPanel.chipArc,
        ease: 'power2.inOut',
      },
      0
    )
    openTl.to(
      chipEl,
      {
        y: targetY - 60,
        duration: MOTION.openFullPanel.chipArc * 0.5,
        ease: 'power2.out',
      },
      0
    )
    openTl.to(
      chipEl,
      {
        y: targetY,
        duration: MOTION.openFullPanel.chipArc * 0.5,
        ease: 'power2.in',
      },
      MOTION.openFullPanel.chipArc * 0.5
    )
    openTl.to(
      chipEl,
      {
        rotation: 12,
        duration: MOTION.openFullPanel.chipArc * 0.5,
        ease: 'power1.out',
      },
      0
    )
    openTl.to(
      chipEl,
      {
        rotation: 0,
        duration: MOTION.openFullPanel.chipArc * 0.5,
        ease: 'power1.in',
      },
      MOTION.openFullPanel.chipArc * 0.5
    )

    // 3. Chip vanishes at arrival, panel unfolds (0.55s, ease power3.out)
    const unfoldTime = MOTION.openFullPanel.chipArc
    openTl.set(chipEl, { opacity: 0 }, unfoldTime)
    openTl.fromTo(
      modalEl,
      {
        opacity: 1,
        scaleX: Math.max(0.05, 56 / (modalRect.width || 800)),
        scaleY: Math.max(0.05, 36 / (modalRect.height || 600)),
        transformOrigin: isMobile ? '50% 100%' : '50% 50%',
      },
      {
        scaleX: 1,
        scaleY: 1,
        duration: MOTION.openFullPanel.panelUnfold,
        ease: 'power3.out',
      },
      unfoldTime
    )

    // 4. Content elements fade up with 0.05s stagger
    const contentChildren = contentRef.current ? Array.from(contentRef.current.children) : []
    if (contentChildren.length > 0) {
      openTl.fromTo(
        contentChildren,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          stagger: MOTION.openFullPanel.contentStagger,
          duration: 0.35,
          ease: 'power2.out',
        },
        unfoldTime + 0.15
      )
    }
  }, [cardId, prefersReduced, isLite, originatingElement])

  // Keydown listener for Esc and Tab focus trap
  useEffect(() => {
    if (!cardId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCloseRequest()
        return
      }

      if (e.key === 'Tab') {
        const modal = modalRef.current
        if (!modal) return

        const focusables = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const visibleFocusables = Array.from(focusables).filter(
          (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
        )

        if (visibleFocusables.length === 0) return

        const first = visibleFocusables[0]
        const last = visibleFocusables[visibleFocusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cardId, handleCloseRequest])

  const currentIndex = cardId ? availableCardIds.indexOf(cardId) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < availableCardIds.length - 1

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(availableCardIds[currentIndex - 1])
    }
  }, [hasPrev, currentIndex, availableCardIds, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(availableCardIds[currentIndex + 1])
    }
  }, [hasNext, currentIndex, availableCardIds, onNavigate])

  if (!cardId) return null

  const renderContent = () => {
    switch (cardId) {
      case 'overview':
        return <OverviewPane description={event?.description} blurb={event?.blurb} />
      case 'highlights':
        return (
          <ListContentPane
            title="Highlights & Key Perks"
            label="REASONS TO ATTEND"
            items={event?.highlights || []}
            type="numbered"
          />
        )
      case 'expect':
        return (
          <ListContentPane
            title="What To Expect"
            label="STAGE & SESSIONS"
            items={event?.what_to_expect || []}
            type="marked"
          />
        )
      case 'prerequisites':
        return (
          <ListContentPane
            title="Pass Prerequisites"
            label="WHAT TO BRING"
            items={event?.prerequisites || []}
            type="checked"
          />
        )
      case 'rules':
        return (
          <ListContentPane
            title="Rules & Guidelines"
            label="OFFICIAL CONDUCT"
            items={event?.rules || []}
            type="rule"
          />
        )
      case 'schedule':
        return <SchedulePane schedules={event?.schedules} scheduleSummary={event?.schedule_summary} />
      case 'prizes':
        return <PrizesPane prizes={event?.prizes} />
      case 'faqs':
        return <FaqsPane faqs={event?.faqs} />
      case 'gallery':
        return <GalleryPane galleryImages={event?.gallery_images} />
      case 'contact':
        return <ContactPane organizers={event?.organizers} coordinators={event?.coordinators} />
      default:
        return <OverviewPane description={event?.description} blurb={event?.blurb} />
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-full-panel-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
    >
      {/* Detaching Volt Chamfered Chip ("ADMIT ONE") */}
      <div
        ref={chipRef}
        aria-hidden="true"
        className="fixed z-[60] w-[56px] h-[36px] bg-volt text-ink font-mono text-[9px] font-black uppercase flex items-center justify-center tracking-wider clip-chamfer pointer-events-none select-none shadow-md opacity-0"
      >
        ADMIT ONE
      </div>

      {/* Backdrop (Page Dimmed at 70% Ink opacity) */}
      <div
        ref={backdropRef}
        onClick={handleCloseRequest}
        className="fixed inset-0 bg-[#111210]/70 backdrop-blur-sm z-0 opacity-0 cursor-pointer"
      />

      {/* Panel Container */}
      <div
        ref={modalRef}
        data-lenis-prevent="true"
        className="relative z-10 w-full max-w-4xl max-h-[88vh] md:max-h-[85vh] bg-[#111210] border-2 border-bone/30 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden clip-chamfer rounded-t-2xl md:rounded-none will-change-transform"
      >
        {/* Header Bar */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b-2 border-bone/20 bg-bone/[0.03]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-volt rotate-45 shrink-0" />
            <h2
              id="open-full-panel-title"
              className="font-display font-black text-lg sm:text-xl uppercase tracking-tight text-bone"
            >
              {TAB_TITLES[cardId] || 'Pass Details'}
            </h2>
          </div>

          {/* Panel Navigation & Close Controls */}
          <div className="flex items-center gap-2">
            {/* Prev / Next Panel Arrows without closing */}
            <div className="hidden sm:flex items-center border border-bone/20 font-mono text-xs">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!hasPrev}
                aria-label="Previous section"
                className={`px-3 py-1.5 border-r border-bone/20 transition-colors uppercase ${
                  hasPrev ? 'hover:bg-volt hover:text-ink text-bone font-bold' : 'text-bone/25 cursor-not-allowed'
                }`}
              >
                ←
              </button>
              <span className="px-3 py-1.5 text-bone/50 text-[10px]">
                {currentIndex + 1} / {availableCardIds.length}
              </span>
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasNext}
                aria-label="Next section"
                className={`px-3 py-1.5 transition-colors uppercase ${
                  hasNext ? 'hover:bg-volt hover:text-ink text-bone font-bold' : 'text-bone/25 cursor-not-allowed'
                }`}
              >
                →
              </button>
            </div>

            {/* Close Button */}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleCloseRequest}
              aria-label="Close pass details panel"
              className="px-3.5 py-1.5 border border-bone/30 bg-bone/5 hover:border-volt hover:text-volt text-bone font-mono text-xs uppercase font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Scrollable Content Body with data-lenis-prevent */}
        <div
          ref={contentRef}
          data-lenis-prevent="true"
          className="flex-1 overflow-y-auto p-5 sm:p-8 overscroll-contain space-y-6"
        >
          {renderContent()}
        </div>

        {/* Footer Bar with Prev/Next buttons on mobile */}
        <div className="sm:hidden shrink-0 flex items-center justify-between p-3 border-t border-bone/15 bg-bone/[0.02] font-mono text-xs">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`px-3 py-1.5 border border-bone/20 uppercase ${
              hasPrev ? 'text-bone font-bold' : 'text-bone/30'
            }`}
          >
            ← Prev
          </button>
          <span className="text-bone/50 text-[11px]">
            {currentIndex + 1} / {availableCardIds.length}
          </span>
          <button
            type="button"
            onClick={handleNext}
            disabled={!hasNext}
            className={`px-3 py-1.5 border border-bone/20 uppercase ${
              hasNext ? 'text-bone font-bold' : 'text-bone/30'
            }`}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

export default OpenFullPanel
