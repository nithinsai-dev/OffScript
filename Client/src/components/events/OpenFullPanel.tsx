import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLenis } from '@/hooks/useLenis'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
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
  eligibility: '04 Eligibility',
  prerequisites: '05 Prerequisites',
  rules: '06 Rules & Guidelines',
  schedule: '07 Schedule & Timeline',
  prizes: '08 Prizes & Awards',
  faqs: '09 Frequently Asked Questions',
  gallery: '10 Event Gallery',
  contact: '11 Contact & Crew',
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
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'

  // Lenis scroll lock & lite mode body overflow hidden
  useEffect(() => {
    if (!cardId) return

    const lenis = getLenis()
    if (lenis) {
      lenis.stop()
    } else {
      document.body.style.overflow = 'hidden'
    }

    // Move initial focus to close button or modal container
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 80)

    return () => {
      clearTimeout(timer)
      const currentLenis = getLenis()
      if (currentLenis) {
        currentLenis.start()
      }
      document.body.style.overflow = ''
      // Return focus to originating element
      originatingElement?.focus()
    }
  }, [cardId, getLenis, originatingElement])

  // Keydown listener for Esc and Tab focus trap
  useEffect(() => {
    if (!cardId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
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
  }, [cardId, onClose])

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
      case 'eligibility':
        return (
          <ListContentPane
            title="Participation Eligibility"
            label="ADMISSION CRITERIA"
            items={event?.eligibility || []}
            type="checked"
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
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="open-full-panel-title"
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      >
        {/* Backdrop (Page Dimmed) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#111210]/85 backdrop-blur-md z-0"
        />

        {/* Panel Container (Framer Motion shared layoutId or Spring) */}
        <motion.div
          ref={modalRef}
          layoutId={prefersReduced || isLite ? undefined : `card-footprint-${cardId}`}
          initial={prefersReduced ? { opacity: 0 } : { y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={prefersReduced ? { opacity: 0 } : { y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          data-lenis-prevent="true"
          className="relative z-10 w-full max-w-4xl max-h-[88vh] md:max-h-[85vh] bg-[#111210] border-2 border-bone/30 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden clip-chamfer rounded-t-2xl md:rounded-none"
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
                onClick={onClose}
                aria-label="Close pass details panel"
                className="px-3.5 py-1.5 border border-bone/30 bg-bone/5 hover:border-volt hover:text-volt text-bone font-mono text-xs uppercase font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
              >
                ✕ Close
              </button>
            </div>
          </div>

          {/* Scrollable Content Body with data-lenis-prevent */}
          <div
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
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
export default OpenFullPanel
