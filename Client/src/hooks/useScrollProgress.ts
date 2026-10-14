import { useEffect, useState } from 'react'

export interface ScrollProgressState {
  progress: number // 0 to 1
  percentage: number // 0 to 100
  scrollY: number
  scrollDirection: 'up' | 'down' | null
  isPastHero: boolean
  isNavHidden: boolean
}

export function useScrollProgress(): ScrollProgressState {
  const [state, setState] = useState<ScrollProgressState>({
    progress: 0,
    percentage: 0,
    scrollY: 0,
    scrollDirection: null,
    isPastHero: false,
    isNavHidden: false,
  })

  useEffect(() => {
    let lastScrollY = window.scrollY
    let ticking = false

    const updateScrollMetrics = () => {
      const currentScrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, currentScrollY / docHeight)) : 0
      const percentage = Math.round(progress * 100)

      const scrollDelta = currentScrollY - lastScrollY
      const isPastHero = currentScrollY > 350

      // Only determine direction if moved more than 5px to avoid jitter
      let direction: 'up' | 'down' | null = null

      if (Math.abs(scrollDelta) > 5) {
        direction = scrollDelta > 0 ? 'down' : 'up'
      }

      // Hide navbar when scrolling down past 120px, reveal when scrolling up
      const isNavHidden = currentScrollY > 120 && direction === 'down'

      lastScrollY = currentScrollY

      setState({
        progress,
        percentage,
        scrollY: currentScrollY,
        scrollDirection: direction,
        isPastHero,
        isNavHidden,
      })

      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollMetrics)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    updateScrollMetrics()

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return state
}
