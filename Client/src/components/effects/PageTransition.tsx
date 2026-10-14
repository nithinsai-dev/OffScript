import { useState, useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'

interface PageTransitionProps {
  children: ReactNode
  locationKey: string
}

export function PageTransition({ children, locationKey }: PageTransitionProps) {
  const [playIntro, setPlayIntro] = useState(false)

  useEffect(() => {
    // Only play on first visit, only in full mode, after load event
    const isLite = document.documentElement.getAttribute('data-perf') === 'lite'
    if (isLite) return

    try {
      const hasVisited = sessionStorage.getItem('offscript_visited')
      if (!hasVisited) {
        sessionStorage.setItem('offscript_visited', 'true')
        const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 120))
        schedule(() => {
          setPlayIntro(true)
        })
      }
    } catch {
      // Ignore sessionStorage errors
    }
  }, [])

  return (
    <div key={locationKey} className="relative w-full">
      {/* Real page content renders immediately at full opacity - no JS gating, no initial opacity 0 */}
      {children}

      {/* Volt Shutter Overlay: only plays on first visit in full mode, starts after load event */}
      {playIntro && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-volt clip-chamfer border-b-4 border-ink"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ originY: 0 }}
          onAnimationComplete={() => setPlayIntro(false)}
        >
          <motion.div
            initial={{ opacity: 1, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 font-display text-4xl md:text-6xl font-black text-ink tracking-tight uppercase"
          >
            <span>OFFSCRIPT</span>
            <span className="font-mono text-xs tracking-widest bg-ink text-volt px-3 py-1 border border-ink uppercase font-black">
              #beoffscript
            </span>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
