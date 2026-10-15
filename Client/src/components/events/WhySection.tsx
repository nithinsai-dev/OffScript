import { useState, useRef, type MouseEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Stamp } from '@/components/ui/Stamp'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

export function WhySection() {
  const prefersReduced = usePrefersReducedMotion()

  // 1. "Find anything" - Magnifier mask following pointer
  const card1Ref = useRef<HTMLDivElement | null>(null)
  const [card1Hover, setCard1Hover] = useState(false)
  const [magPos, setMagPos] = useState({ x: 100, y: 100 })

  const handleCard1MouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!card1Ref.current || prefersReduced) return
    const rect = card1Ref.current.getBoundingClientRect()
    setMagPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  // 2. "Register fast" - Stamp slam & shake
  const [card2Hover, setCard2Hover] = useState(false)

  // 3. "Meet your people" - 6 converging Volt dots
  const [card3Hover, setCard3Hover] = useState(false)

  return (
    <section id="why" className="py-24 md:py-36 border-b-2 border-bone/15 bg-ink content-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="space-y-2 text-center max-w-xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
            WHY OFFSCRIPT
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase text-bone tracking-tight">
            Built For Campus Life
          </h2>
          <p className="font-sans text-xs sm:text-sm text-bone/60">
            Everything your campus fest needs, minus the administrative friction.
          </p>
        </div>

        {/* 3 Interactive Cards with Individual Signature Hovers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* CARD 1: FIND ANYTHING (Magnifier Mask) */}
          <div
            ref={card1Ref}
            onMouseMove={handleCard1MouseMove}
            onMouseEnter={() => setCard1Hover(true)}
            onMouseLeave={() => setCard1Hover(false)}
            className="group relative border-2 border-bone/20 bg-bone/[0.02] p-8 transition-all duration-300 hover:border-volt flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Base Content */}
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-bone/15 pb-3">
                <span className="font-mono text-xs text-volt font-black tracking-widest">#01</span>
                <span className="font-mono text-[10px] text-bone/40 uppercase">DIRECTORY</span>
              </div>

              {/* Title with Slot-Roll */}
              <div className="overflow-hidden h-9">
                <motion.h3
                  animate={card1Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-bone"
                >
                  Find Anything
                </motion.h3>
                <motion.h3
                  aria-hidden="true"
                  animate={card1Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-volt"
                >
                  Find Anything
                </motion.h3>
              </div>

              <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
                Browse every hackathon, gig, workshop, and tournament happening across campus.
              </p>
            </div>

            {/* Revealed Volt Layer underneath pointer circular mask */}
            {card1Hover && !prefersReduced && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-volt text-ink p-8 flex flex-col justify-between z-20 pointer-events-none transition-[clip-path] duration-75"
                style={{
                  clipPath: `circle(80px at ${magPos.x}px ${magPos.y}px)`,
                }}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-ink/20 pb-3">
                    <span className="font-mono text-xs text-ink font-black">#01 // DISCOVER</span>
                    <span className="font-mono text-[10px] text-ink/60 uppercase">EXPLORE</span>
                  </div>
                  <h3 className="font-display text-2xl font-black uppercase text-ink">
                    Instant Search
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-ink/80 leading-relaxed font-bold">
                    Filter by mode, tags, and open seats with live updates.
                  </p>
                </div>
                <div className="pt-4 font-mono text-[10px] font-black text-ink uppercase">
                  MAGNIFIER ACTIVE
                </div>
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-dashed border-bone/15 flex items-center justify-between relative z-10">
              <span className="font-mono text-[10px] text-bone/40 uppercase">HOVER TO REVEAL</span>
              <span className="font-mono text-xs text-volt">⊙</span>
            </div>
          </div>

          {/* CARD 2: REGISTER FAST (Stamp Slam & Shake) */}
          <motion.div
            onMouseEnter={() => setCard2Hover(true)}
            onMouseLeave={() => setCard2Hover(false)}
            animate={card2Hover && !prefersReduced ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }}
            transition={{ duration: 0.3 }}
            className="group relative border-2 border-bone/20 bg-bone/[0.02] p-8 transition-all duration-300 hover:border-volt flex flex-col justify-between overflow-hidden select-none"
          >
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-bone/15 pb-3">
                <span className="font-mono text-xs text-volt font-black tracking-widest">#02</span>
                <span className="font-mono text-[10px] text-bone/40 uppercase">TICKETING</span>
              </div>

              {/* Title with Slot-Roll */}
              <div className="overflow-hidden h-9">
                <motion.h3
                  animate={card2Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-bone"
                >
                  Register Fast
                </motion.h3>
                <motion.h3
                  aria-hidden="true"
                  animate={card2Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-volt"
                >
                  Register Fast
                </motion.h3>
              </div>

              <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
                Simple signups with live seat trackers and instant entry confirmation.
              </p>
            </div>

            {/* Stamp Slam Animation on Enter */}
            <AnimatePresence>
              {card2Hover && !prefersReduced && (
                <motion.div
                  initial={{ scale: 2.2, opacity: 0, rotate: 18 }}
                  animate={{ scale: 1, opacity: 1, rotate: -4 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 450 }}
                  className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                >
                  <Stamp variant="volt" rotate={-4} className="text-base py-2 px-4 shadow-hard-bone">
                    ADMIT ONE PASS
                  </Stamp>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-6 mt-6 border-t border-dashed border-bone/15 flex items-center justify-between relative z-10">
              <span className="font-mono text-[10px] text-bone/40 uppercase">CONFIRMED SEATS</span>
              <span className="font-mono text-xs text-volt">✓</span>
            </div>
          </motion.div>

          {/* CARD 3: MEET YOUR PEOPLE (6 Converging Volt Dots) */}
          <div
            onMouseEnter={() => setCard3Hover(true)}
            onMouseLeave={() => setCard3Hover(false)}
            className="group relative border-2 border-bone/20 bg-bone/[0.02] p-8 transition-all duration-300 hover:border-volt flex flex-col justify-between overflow-hidden select-none"
          >
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between border-b border-bone/15 pb-3">
                <span className="font-mono text-xs text-volt font-black tracking-widest">#03</span>
                <span className="font-mono text-[10px] text-bone/40 uppercase">COMMUNITY</span>
              </div>

              {/* Title with Slot-Roll */}
              <div className="overflow-hidden h-9">
                <motion.h3
                  animate={card3Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-bone"
                >
                  Meet Your People
                </motion.h3>
                <motion.h3
                  aria-hidden="true"
                  animate={card3Hover && !prefersReduced ? { y: '-100%' } : { y: '0%' }}
                  transition={{ duration: 0.25 }}
                  className="font-display text-2xl font-black uppercase text-volt"
                >
                  Meet Your People
                </motion.h3>
              </div>

              <p className="font-sans text-xs sm:text-sm text-bone/70 leading-relaxed">
                Connect with builders, designers, musicians, and creators from every hostel.
              </p>
            </div>

            {/* 6 Volt Dots Converging from card edges to cluster */}
            {!prefersReduced && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {[
                  { startX: -20, startY: 20, endX: 130, endY: 70 },
                  { startX: 300, startY: 30, endX: 150, endY: 65 },
                  { startX: -10, startY: 200, endX: 140, endY: 80 },
                  { startX: 280, startY: 220, endX: 160, endY: 75 },
                  { startX: 120, startY: -15, endX: 135, endY: 60 },
                  { startX: 160, startY: 320, endX: 155, endY: 85 },
                ].map((dot, idx) => (
                  <motion.span
                    key={idx}
                    animate={
                      card3Hover
                        ? { x: dot.endX, y: dot.endY, opacity: 1, scale: 1.3 }
                        : { x: dot.startX, y: dot.startY, opacity: 0, scale: 0.5 }
                    }
                    transition={{ type: 'spring', damping: 20, stiffness: 350, delay: idx * 0.02 }}
                    className="absolute w-2 h-2 bg-volt rotate-45"
                  />
                ))}
              </div>
            )}

            <div className="pt-6 mt-6 border-t border-dashed border-bone/15 flex items-center justify-between relative z-10">
              <span className="font-mono text-[10px] text-bone/40 uppercase">CAMPUS CREW</span>
              <span className="font-mono text-xs text-volt">::</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
