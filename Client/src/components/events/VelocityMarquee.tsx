import { useEffect, useRef } from 'react'
import { useLenis } from '@/hooks/useLenis'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

const MARQUEE_ITEMS = [
  'CAMPUS FEST 2026',
  '#BEOFFSCRIPT',
  'DISCOVER & REGISTER',
  'TICKETS LIVE NOW',
  'ALL HOSTELS WELCOME',
  'ZERO BORING LECTURES',
]

/**
 * Optimized Velocity Marquee:
 * - Pure CSS keyframe for base scrolling
 * - Subtle velocity skew applied via transform only when scrolling
 * - Pauses offscreen with IntersectionObserver
 */
export function VelocityMarquee() {
  const { getVelocity } = useLenis()
  const prefersReduced = usePrefersReducedMotion()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const isVisibleRef = useRef(true)

  // Pause offscreen via IntersectionObserver
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting
        if (trackRef.current) {
          trackRef.current.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
          trackRef.current.style.willChange = entry.isIntersecting ? 'transform' : 'auto'
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Apply velocity skew event-driven on scroll, NEVER in a continuous rAF loop (P5)
  useEffect(() => {
    const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'
    if (prefersReduced || isLite) return

    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const handleScroll = () => {
      if (!isVisibleRef.current || !trackRef.current) return
      const vel = getVelocity()
      if (Math.abs(vel) > 0.1) {
        const skew = Math.max(-4, Math.min(4, -vel * 0.3))
        trackRef.current.style.transform = `skewX(${skew}deg)`
      }

      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => {
        if (trackRef.current) {
          trackRef.current.style.transform = 'skewX(0deg)'
        }
      }, 120)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [getVelocity, prefersReduced])

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="relative w-full overflow-hidden border-y-2 border-bone/20 bg-ink py-3 select-none"
    >
      <div
        ref={trackRef}
        className="flex gap-8 whitespace-nowrap animate-marquee font-mono text-xs font-black uppercase tracking-widest text-bone/80 transition-transform duration-150"
      >
        {Array.from({ length: 4 }).map((_, repeatIdx) => (
          <div key={repeatIdx} className="flex gap-8 shrink-0 items-center">
            {MARQUEE_ITEMS.map((item, itemIdx) => (
              <span key={itemIdx} className="flex items-center gap-8">
                <span className="hover:text-volt transition-colors">{item}</span>
                <span className="w-1.5 h-1.5 bg-volt rotate-45 shrink-0" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
