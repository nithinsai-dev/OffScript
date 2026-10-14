import { useEffect, useRef } from 'react'
import { useIsFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery'

/**
 * Performant Grain and Interactive Grid Background Overlay (Optimized)
 * - Static tiled SVG dot-matrix noise (no runtime feTurbulence or SVG filters)
 * - GPU compositing layer (transform: translateZ(0))
 * - Single radial gradient layer for pointer glow, skipped when idle
 */
export function GrainOverlay() {
  const isFinePointer = useIsFinePointer()
  const prefersReduced = usePrefersReducedMotion()
  const glowRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastPosRef = useRef({ x: -500, y: -500 })

  useEffect(() => {
    if (!isFinePointer || prefersReduced) return

    const handlePointerMove = (e: PointerEvent) => {
      lastPosRef.current = { x: e.clientX, y: e.clientY }
      if (rafRef.current) return

      rafRef.current = requestAnimationFrame(() => {
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${lastPosRef.current.x}px, ${lastPosRef.current.y}px, 0)`
          glowRef.current.style.opacity = '1'
        }
        rafRef.current = null
      })
    }

    const handlePointerLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0'
      }
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('mouseleave', handlePointerLeave)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('mouseleave', handlePointerLeave)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [isFinePointer, prefersReduced])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Target #5: Static lightweight tiled SVG pattern (no feTurbulence runtime filter) */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23EDEBE0'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Faint Grid Lines */}
      <div className="absolute inset-0 bg-raw-grid opacity-45" />

      {/* Target #3: Single Interactive Grid Cell Glow (Volt at very low opacity, desktop only) */}
      {isFinePointer && !prefersReduced && (
        <div
          ref={glowRef}
          className="absolute -top-[250px] -left-[250px] w-[500px] h-[500px] rounded-full opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(212, 255, 63, 0.05) 0%, rgba(212, 255, 63, 0.01) 40%, transparent 70%)',
          }}
        />
      )}
    </div>
  )
}
