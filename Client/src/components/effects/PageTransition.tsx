import { type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface PageTransitionProps {
  children: ReactNode
  locationKey: string
}

export function PageTransition({ children, locationKey }: PageTransitionProps) {
  const prefersReduced = usePrefersReducedMotion()

  if (prefersReduced) {
    return <div key={locationKey}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={locationKey} className="relative w-full">
        {/* Chamfered Volt Shutter Wipe */}
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-volt clip-chamfer border-b-4 border-ink"
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          exit={{ scaleY: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ originY: 0 }}
        >
          <motion.div
            initial={{ opacity: 1, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 1, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 font-display text-4xl md:text-6xl font-black text-ink tracking-tight uppercase"
          >
            <span>OFFSCRIPT</span>
            <span className="font-mono text-xs tracking-widest bg-ink text-volt px-3 py-1 border border-ink uppercase font-black">
              #beoffscript
            </span>
          </motion.div>
        </motion.div>

        {/* Page Content Entry (opacity only so ancestors have zero transform breaking position:sticky) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
