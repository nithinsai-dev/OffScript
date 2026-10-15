import { useRef, useEffect, type ReactNode } from 'react'
import { registerReveal, type RevealTechnique, normalizeTechnique } from '@/lib/reveal'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

export type RevealVariant =
  | RevealTechnique
  | 'clip-up'
  | 'scale-snap'

interface RevealProps {
  children: ReactNode
  className?: string
  variant?: RevealVariant
  delay?: number
  duration?: number
}

export function Reveal({
  children,
  className = '',
  variant = 'card',
  delay = 0,
}: RevealProps) {
  const elRef = useRef<HTMLDivElement | null>(null)
  const prefersReduced = usePrefersReducedMotion()
  const technique = normalizeTechnique(variant) as RevealTechnique

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    if (delay > 0) {
      el.style.transitionDelay = `${delay}s`
    }

    const unregister = registerReveal(el, technique)
    return () => unregister()
  }, [technique, delay, prefersReduced])

  return (
    <div
      ref={elRef}
      className={className}
      data-reveal={technique}
    >
      {children}
    </div>
  )
}

export default Reveal
