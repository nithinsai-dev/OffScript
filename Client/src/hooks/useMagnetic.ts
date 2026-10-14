import { useEffect, useRef, useState } from 'react'
import { useIsFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface MagneticOffset {
  x: number
  y: number
}

export function useMagnetic(strength = 0.25) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement | HTMLDivElement | null>(null)
  const [offset, setOffset] = useState<MagneticOffset>({ x: 0, y: 0 })
  const isFinePointer = useIsFinePointer()
  const prefersReduced = usePrefersReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || !isFinePointer || prefersReduced) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = node.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const deltaX = (e.clientX - centerX) * strength
      const deltaY = (e.clientY - centerY) * strength

      // Max magnetic pull distance to prevent runaway shifts
      const maxDistance = 20
      const clampedX = Math.max(-maxDistance, Math.min(maxDistance, deltaX))
      const clampedY = Math.max(-maxDistance, Math.min(maxDistance, deltaY))

      setOffset({ x: clampedX, y: clampedY })
    }

    const handleMouseLeave = () => {
      setOffset({ x: 0, y: 0 })
    }

    const mouseMoveListener: EventListener = (e) => handleMouseMove(e as MouseEvent)
    const mouseLeaveListener: EventListener = () => handleMouseLeave()

    node.addEventListener('mousemove', mouseMoveListener)
    node.addEventListener('mouseleave', mouseLeaveListener)

    return () => {
      node.removeEventListener('mousemove', mouseMoveListener)
      node.removeEventListener('mouseleave', mouseLeaveListener)
    }
  }, [strength, isFinePointer, prefersReduced])

  return { ref, offset }
}
