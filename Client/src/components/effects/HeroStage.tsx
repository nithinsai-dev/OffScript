/**
 * ============================================================================
 * HERO STAGE SLOT (Phase 2 3D Scene Container)
 * ============================================================================
 * Reserved boundary for future 3D canvas (Three.js / React Three Fiber / Spline).
 * Kept invisible when empty per design requirements, ready for drop-in canvas.
 * ============================================================================
 */
interface HeroStageProps {
  className?: string
}

export function HeroStage({ className = '' }: HeroStageProps) {
  return (
    <div
      id="hero-stage-slot"
      data-testid="hero-stage"
      aria-hidden="true"
      className={`pointer-events-none relative w-full ${className}`}
    />
  )
}
