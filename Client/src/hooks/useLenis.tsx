import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import type Lenis from 'lenis'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

export interface ScrollToOptions {
  offset?: number
  immediate?: boolean
  duration?: number
  easing?: (t: number) => number
  onComplete?: () => void
}

interface LenisContextValue {
  scrollTo: (target: string | number | HTMLElement, options?: ScrollToOptions) => void
  getLenis: () => Lenis | null
  getVelocity: () => number
}

const LenisContext = createContext<LenisContextValue>({
  scrollTo: () => {},
  getLenis: () => null,
  getVelocity: () => 0,
})

export function LenisProvider({ children }: { children: ReactNode }) {
  const prefersReduced = usePrefersReducedMotion()
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // If reduced motion or lite mode is active, use native scrolling without lerp smoothing
    const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'
    if (prefersReduced || isLite) {
      return
    }

    let cleanup: (() => void) | undefined
    let isCancelled = false
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 200))
    const handle = schedule(() => {
      Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]).then(([{ default: LenisConstructor }, { default: gsap }, { ScrollTrigger }]) => {
        if (isCancelled) return
        gsap.registerPlugin(ScrollTrigger)

        const lenis = new LenisConstructor({
          duration: 0.9,
          easing: easeOutExpo,
          smoothWheel: true,
          touchMultiplier: 1.5,
        })

        lenisRef.current = lenis

        // Sync Lenis scroll with GSAP ScrollTrigger
        lenis.on('scroll', ScrollTrigger.update)

        const tickerCallback = (time: number) => {
          lenis.raf(time * 1000)
        }

        gsap.ticker.add(tickerCallback)
        gsap.ticker.lagSmoothing(0)

        cleanup = () => {
          gsap.ticker.remove(tickerCallback)
          lenis.destroy()
          lenisRef.current = null
        }
      })
    })

    return () => {
      isCancelled = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number)
      if (cleanup) cleanup()
    }
  }, [prefersReduced])

  const scrollTo = (
    target: string | number | HTMLElement,
    options?: ScrollToOptions
  ) => {
    const defaultOptions: ScrollToOptions = {
      offset: -96,
      duration: 0.9,
      easing: easeOutExpo,
      ...options,
    }

    if (lenisRef.current && !prefersReduced) {
      lenisRef.current.scrollTo(target, defaultOptions)
    } else {
      if (typeof target === 'number') {
        window.scrollTo({ top: target, behavior: 'auto' })
      } else if (typeof target === 'string') {
        const el = document.querySelector(target)
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY + (defaultOptions.offset ?? 0)
          window.scrollTo({ top, behavior: 'auto' })
        }
      } else if (target instanceof HTMLElement) {
        const top = target.getBoundingClientRect().top + window.scrollY + (defaultOptions.offset ?? 0)
        window.scrollTo({ top, behavior: 'auto' })
      }
      defaultOptions.onComplete?.()
    }
  }

  const getLenis = () => lenisRef.current
  const getVelocity = () => lenisRef.current?.velocity ?? 0

  return (
    <LenisContext.Provider value={{ scrollTo, getLenis, getVelocity }}>
      {children}
    </LenisContext.Provider>
  )
}

export function useLenis() {
  return useContext(LenisContext)
}
