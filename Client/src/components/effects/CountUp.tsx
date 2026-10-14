import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface CountUpProps {
  end: number
  duration?: number
  className?: string
  fallback?: string
}

export function CountUp({
  end,
  duration = 1.2,
  className = '',
  fallback = '--',
}: CountUpProps) {
  const prefersReduced = usePrefersReducedMotion()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (prefersReduced || end === 0) return

    let startTimestamp: number | null = null
    let frameId: number

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easedProgress * end))

      if (progress < 1) {
        frameId = requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }

    frameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frameId)
  }, [end, duration, prefersReduced])

  if (prefersReduced) {
    return <span className={className}>{end.toLocaleString()}</span>
  }

  if (end === 0) {
    return <span className={className}>{fallback}</span>
  }

  return <span className={className}>{count.toLocaleString()}</span>
}
