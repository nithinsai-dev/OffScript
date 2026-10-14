import { useEffect, useState } from 'react'

/**
 * Lightweight performance governor:
 * - Detects hardwareConcurrency <= 4, touch / coarse pointer, or prefers-reduced-motion
 * - Measures average frame time during first 2 seconds of scroll
 * - Sets data-perf="lite" or data-perf="full" on <html>
 */
export function usePerfGovernor() {
  const [isLite, setIsLite] = useState(() => {
    if (typeof window === 'undefined') return false
    const lowCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return Boolean(lowCores || isTouch || reducedMotion)
  })

  useEffect(() => {
    // Initial attribute
    document.documentElement.setAttribute('data-perf', isLite ? 'lite' : 'full')
    if (isLite) return

    // Frame rate measurement during first scroll burst (up to 2 seconds)
    const frameTimes: number[] = []
    let lastTime = performance.now()
    let measuring = false
    let measureTimer: number | null = null

    const onFrame = (now: number) => {
      if (!measuring) return
      const delta = now - lastTime
      lastTime = now
      if (delta > 0 && delta < 200) {
        frameTimes.push(delta)
      }
      requestAnimationFrame(onFrame)
    }

    const startMeasuring = () => {
      if (measuring || frameTimes.length > 60) return
      measuring = true
      lastTime = performance.now()
      requestAnimationFrame(onFrame)

      measureTimer = window.setTimeout(() => {
        measuring = false
        if (frameTimes.length > 20) {
          const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
          if (avg > 24) {
            // Below ~40fps -> downgrade to lite mode
            setIsLite(true)
            document.documentElement.setAttribute('data-perf', 'lite')
          }
        }
      }, 2000)
    }

    window.addEventListener('scroll', startMeasuring, { once: true, passive: true })

    return () => {
      window.removeEventListener('scroll', startMeasuring)
      if (measureTimer) clearTimeout(measureTimer)
    }
  }, [isLite])

  return { isLite }
}
