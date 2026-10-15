import { motion, AnimatePresence } from 'motion/react'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { useLenis, easeOutExpo } from '@/hooks/useLenis'

export function BackToTop() {
  const { isPastHero, progress } = useScrollProgress()
  const { scrollTo } = useLenis()

  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - progress * circumference

  return (
    <AnimatePresence>
      {isPastHero && (
        <motion.button
          type="button"
          onClick={() => scrollTo(0, { duration: 0.9, easing: easeOutExpo })}
          initial={{ opacity: 0, scale: 0.8, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 15 }}
          transition={{ duration: 0.2 }}
          aria-label="Scroll to top of page"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 group flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-ink border-2 border-bone/30 text-bone shadow-hard-bone hover:border-volt hover:text-volt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt select-none"
          style={{
            clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
          }}
        >
          {/* Circular SVG Scroll Progress Ring */}
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-1"
            viewBox="0 0 48 48"
          >
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="stroke-bone/10"
              strokeWidth="2.5"
              fill="transparent"
            />
            <circle
              cx="24"
              cy="24"
              r={radius}
              className="stroke-volt transition-[stroke-dashoffset] duration-75"
              strokeWidth="2.5"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          <span className="relative z-10 font-mono text-base sm:text-lg font-bold group-hover:-translate-y-0.5 transition-transform">
            ↑
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  )
}
