import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useCountdown } from '@/hooks/useCountdown'
import { RegisterButton } from '@/components/ui/RegisterButton'
import type { Event } from '@/types/event'

export const FILL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

interface CountdownSectionProps {
  events: Event[]
}

function DigitCard({
  value,
  label,
  isInverted = false,
}: {
  value: string
  label: string
  isInverted?: boolean
}) {
  return (
    <div
      className={`flex-1 flex flex-col items-center border-2 p-4 sm:p-6 min-w-[70px] sm:min-w-[110px] md:min-w-[130px] relative transition-colors duration-200 ${
        isInverted
          ? 'bg-ink/5 border-ink/40'
          : 'bg-bone/[0.02] border-bone/20'
      }`}
    >
      {/* Retro Split Flap Slit Line */}
      <div
        aria-hidden="true"
        className={`absolute top-1/2 left-0 right-0 h-[1.5px] z-20 ${
          isInverted ? 'bg-ink/30' : 'bg-ink/80'
        }`}
      />

      <div className="relative overflow-hidden h-14 sm:h-20 md:h-26 flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: '80%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '-80%', opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`font-mono text-4xl sm:text-6xl md:text-7xl font-black tracking-tight ${
              isInverted ? 'text-ink' : 'text-bone'
            }`}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>

      <span
        className={`font-mono text-[10px] sm:text-xs uppercase tracking-widest pt-2 border-t w-full text-center font-bold ${
          isInverted
            ? 'text-ink border-ink/30'
            : 'text-volt border-bone/15'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export function CountdownSection({ events }: CountdownSectionProps) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelHeight, setPanelHeight] = useState<number>(500)
  const [isHovered, setIsHovered] = useState(false)
  const [isTapped, setIsTapped] = useState(false)
  const [isInView, setIsInView] = useState(true)

  const isFilled = isHovered || isTapped

  // Track viewport visibility to pause offscreen animations
  useEffect(() => {
    const el = panelRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Measure panel height dynamically for precise liquid text-inversion overlay
  useEffect(() => {
    const el = panelRef.current
    if (!el) return

    const updateHeight = () => {
      if (el) {
        setPanelHeight(el.offsetHeight)
      }
    }

    updateHeight()
    const ro = new ResizeObserver(updateHeight)
    ro.observe(el)
    window.addEventListener('resize', updateHeight)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [])

  const nearestTarget = useMemo(() => {
    const openEvents = events
      .filter((e) => e.registration_status === 'OPEN' && e.registration_deadline)
      .map((e) => ({
        event: e,
        time: new Date(e.registration_deadline || '').getTime(),
      }))
      .filter((item) => !Number.isNaN(item.time))
      .sort((a, b) => a.time - b.time)

    return openEvents[0] || null
  }, [events])

  const countdown = useCountdown(nearestTarget?.event.registration_deadline)

  // Calculate fill fraction: clamp(1 - remainingMs / FILL_WINDOW_MS, 0, 1) using countdown state
  const remainingMs = countdown.hasTarget
    ? countdown.totalSeconds * 1000
    : 8 * 24 * 60 * 60 * 1000

  const fillFraction = Math.min(1, Math.max(0, 1 - remainingMs / FILL_WINDOW_MS))
  const percentNumber = Math.round(fillFraction * 100)

  const renderPanelContent = (isInverted: boolean) => (
    <div className="space-y-8 sm:space-y-10 text-center select-none">
      {/* Header Badge & Title */}
      <div className="space-y-3 max-w-xl mx-auto">
        <div className="flex items-center justify-center gap-3">
          <span
            data-reveal="eyebrow"
            className={`font-mono text-[11px] sm:text-xs uppercase tracking-widest font-bold px-2 py-0.5 border ${
              isInverted
                ? 'border-ink text-ink bg-volt'
                : 'border-volt/40 text-volt bg-ink'
            }`}
          >
            NEXT PASS DEADLINE
          </span>
          <span
            className={`font-mono text-[11px] sm:text-xs font-bold uppercase tracking-widest ${
              isInverted ? 'text-ink/75' : 'text-bone/60'
            }`}
          >
            {percentNumber} percent of the way there
          </span>
        </div>

        <div className="overflow-hidden">
          <h2
            data-reveal="heading"
            className={`font-display text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight ${
              isInverted ? 'text-ink' : 'text-bone'
            }`}
          >
            {nearestTarget ? nearestTarget.event.name : 'Next Big Fest Pass'}
          </h2>
        </div>

        <p
          className={`font-sans text-xs sm:text-sm max-w-md mx-auto ${
            isInverted ? 'text-ink/80 font-medium' : 'text-bone/65'
          }`}
        >
          {nearestTarget
            ? 'Seats are filling rapidly. Grab your pass before the timer drops to zero.'
            : 'Check out upcoming registration windows across all university departments.'}
        </p>
      </div>

      {/* Large Flip Counter Digits */}
      <div data-reveal="stat" className="flex justify-center items-center gap-2 sm:gap-4 md:gap-6 max-w-3xl mx-auto">
        <DigitCard value={countdown.days} label="Days" isInverted={isInverted} />
        <DigitCard value={countdown.hours} label="Hours" isInverted={isInverted} />
        <DigitCard value={countdown.minutes} label="Minutes" isInverted={isInverted} />
        <DigitCard value={countdown.seconds} label="Seconds" isInverted={isInverted} />
      </div>

      {/* Action CTA & Fill Status Indicator */}
      <div className="pt-2 flex flex-col sm:flex-row justify-center items-center gap-4">
        {nearestTarget && (
          <RegisterButton
            event={nearestTarget.event}
            variant={isInverted ? 'outline' : 'chamfered'}
            size="lg"
            cursorLabel="Register"
            className={isInverted ? 'bg-ink text-volt border-ink hover:bg-ink/90' : ''}
          >
            Register Before Close
          </RegisterButton>
        )}

        <div
          className={`font-mono text-xs uppercase tracking-wider flex items-center gap-2 ${
            isInverted ? 'text-ink font-bold' : 'text-bone/60'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              isInverted ? 'bg-ink' : 'bg-volt'
            }`}
          />
          <span>Hover or tap to test liquid level</span>
        </div>
      </div>
    </div>
  )

  return (
    <section
      id="countdown"
      className="py-20 md:py-32 border-b-2 border-bone/15 bg-ink overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* The Liquid Fill Card Panel */}
        <div
          ref={panelRef}
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          onClick={() => setIsTapped((prev) => !prev)}
          className="relative border-2 border-bone/25 bg-ink/90 p-6 sm:p-10 md:p-14 overflow-hidden transition-colors duration-200 cursor-pointer shadow-2xl"
        >
          {/* Base Content Layer (Default colors: Bone text, Ink background) */}
          <div className="relative z-0">
            {renderPanelContent(false)}
          </div>

          {/* Liquid Fill Layer (Rises from bottom to fillFraction) */}
          <motion.div
            className="absolute inset-x-0 bottom-0 pointer-events-none z-10 overflow-hidden bg-volt"
            initial={{ height: '0%' }}
            animate={{
              height: isFilled ? `${Math.max(14, fillFraction * 100)}%` : '0%',
            }}
            transition={{
              type: 'spring',
              damping: 24,
              stiffness: 120,
              mass: 0.8,
            }}
          >
            {/* Gentle Wavy SVG Top Edge */}
            <div className="absolute top-0 inset-x-0 -translate-y-[85%] h-6 sm:h-8 overflow-hidden pointer-events-none">
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                className={`w-[200%] h-full fill-volt ${
                  isInView ? 'animate-wave-liquid' : ''
                } opacity-95`}
              >
                <path d="M0,45 C150,90 350,0 500,45 C650,90 850,0 1000,45 C1150,90 1350,0 1500,45 L1500,120 L0,120 Z" />
              </svg>
            </div>

            {/* Inverted Duplicate Content Layer (Pinned to the exact bottom to align 1:1) */}
            <div
              className="absolute bottom-0 inset-x-0 text-ink pointer-events-none flex flex-col justify-end"
              style={{ height: panelHeight ? `${panelHeight}px` : '100%' }}
            >
              <div className="p-6 sm:p-10 md:p-14">
                {renderPanelContent(true)}
              </div>
            </div>
          </motion.div>

          {/* Static Corner Accents */}
          <div
            aria-hidden="true"
            className="absolute top-2 left-2 w-2 h-2 border-t-2 border-l-2 border-bone/40 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute top-2 right-2 w-2 h-2 border-t-2 border-r-2 border-bone/40 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-2 left-2 w-2 h-2 border-b-2 border-l-2 border-bone/40 pointer-events-none"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-2 right-2 w-2 h-2 border-b-2 border-r-2 border-bone/40 pointer-events-none"
          />
        </div>
      </div>
    </section>
  )
}
