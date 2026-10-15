import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * Reusable shimmering placeholder block with Bone opacity pulse
 */
export function SkeletonBlock({
  className = '',
  aspectRatio,
}: {
  className?: string
  aspectRatio?: string
}) {
  return (
    <div
      style={aspectRatio ? { aspectRatio } : undefined}
      className={`relative overflow-hidden bg-bone/[0.04] border border-bone/15 ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-bone/[0.08] to-transparent" />
    </div>
  )
}

/**
 * Skeleton that matches EventCard ticket pass 1:1 to eliminate layout shifts
 */
export function EventCardSkeleton() {
  return (
    <div className="flex flex-col border-2 border-bone/20 bg-ink p-0 select-none">
      {/* Top Pass Header */}
      <div className="flex items-center justify-between p-3 border-b border-bone/15 bg-bone/[0.02]">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-4 w-16" />
      </div>

      {/* 16:9 Image Placeholder */}
      <SkeletonBlock aspectRatio="16/9" className="w-full border-b border-bone/15" />

      {/* Perforation Divider */}
      <div className="w-full border-perforation py-0.5" />

      {/* Title & Blurb */}
      <div className="p-4 space-y-3">
        <SkeletonBlock className="h-6 w-3/4" />
        <SkeletonBlock className="h-3.5 w-full" />
        <SkeletonBlock className="h-3.5 w-4/5" />
      </div>

      {/* Ticket Stub Footer */}
      <div className="p-3 bg-bone/[0.02] border-t-2 border-bone/15 flex items-center justify-between">
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="h-2 w-28" />
      </div>
    </div>
  )
}

import { notifyOverlayActive, notifyOverlayCleared } from '@/lib/pageReady'

/**
 * Initial on-brand Page Loader: under 1.2s, played once per session, skippable.
 * Counter 0 to 100, wordmark wiping in, curtain splitting open to reveal hero.
 */
export function PageLoader({ onComplete }: { onComplete?: () => void }) {
  const [progress, setProgress] = useState(0)
  const [isSplitting, setIsSplitting] = useState(false)
  const clearedRef = useRef(false)

  const handleFinish = useCallback(() => {
    if (clearedRef.current) return
    clearedRef.current = true
    notifyOverlayCleared('landing-intro')
    onComplete?.()
  }, [onComplete])

  useEffect(() => {
    notifyOverlayActive('landing-intro')

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          setIsSplitting(true)
          setTimeout(handleFinish, 400)
          return 100
        }
        const step = Math.floor(Math.random() * 25) + 30
        return Math.min(100, prev + step)
      })
    }, 50) // Completes in under 0.8s total

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearInterval(timer)
        handleFinish()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      clearInterval(timer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleFinish])

  return (
    <AnimatePresence>
      <div
        onClick={() => onComplete?.()}
        className="fixed inset-0 z-[10000] select-none cursor-pointer overflow-hidden"
      >
        {/* Top Curtain Half */}
        <motion.div
          animate={isSplitting ? { y: '-100%' } : { y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 right-0 h-1/2 bg-ink border-b-2 border-volt flex flex-col justify-between p-6 md:p-12"
        >
          <div className="flex items-center justify-between font-mono text-xs text-bone/60">
            <span>CAMPUS EVENT HUB</span>
            <span className="text-[10px] text-volt font-bold">CLICK OR ESC TO SKIP</span>
          </div>

          <div className="space-y-2">
            <motion.div
              initial={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' }}
              animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
              transition={{ duration: 0.5 }}
              className="font-display text-5xl md:text-8xl font-black text-bone tracking-tight uppercase"
            >
              OFFSCRIPT
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Curtain Half */}
        <motion.div
          animate={isSplitting ? { y: '100%' } : { y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-0 left-0 right-0 h-1/2 bg-ink border-t-2 border-volt flex flex-col justify-between p-6 md:p-12"
        >
          <div className="space-y-4 max-w-xl">
            <p className="font-mono text-xs md:text-sm text-volt tracking-widest uppercase font-bold">
              #beoffscript // Loading campus passes...
            </p>

            {/* Sharp Ticket Progress Track */}
            <div className="h-1.5 w-full bg-bone/10 border border-bone/20 overflow-hidden">
              <div
                className="h-full bg-volt transition-all duration-75 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-end justify-between font-mono text-bone">
            <span className="text-xs text-bone/40 uppercase">EVENT PASS ACCESS</span>
            <span className="text-3xl md:text-5xl font-black text-volt tracking-tight">
              {progress}%
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
