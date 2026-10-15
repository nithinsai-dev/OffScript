import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface TicketShapeProps {
  id?: string
  children: ReactNode
  stubContent?: ReactNode
  overlayContent?: ReactNode
  className?: string
  bodyClassName?: string
  stubWidth?: number // desktop stub width (default 130px)
  stubHeight?: number // mobile stub height (default 110px)
  isHovered?: boolean
  tearOnHover?: boolean // ONLY true for Featured stacking cards
  hoverStroke?: boolean // default true, false disables hover border color change
  hasPerforation?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Global shared path cache to avoid recalculating SVG strings on re-render/hover
 */
const pathCache = new Map<string, string>()

function generateTicketPath(
  W: number,
  H: number,
  P: number,
  isMobile: boolean,
  hasPerforation: boolean = true
): string {
  const key = `${W}_${H}_${P}_${isMobile}_${hasPerforation}`
  const cached = pathCache.get(key)
  if (cached) return cached

  const R_corner = 12
  const R_perf = 9
  const R_mid = 7

  let path: string

  if (!hasPerforation) {
    path = `
      M ${R_corner} 0
      L ${W - R_corner} 0
      A ${R_corner} ${R_corner} 0 0 0 ${W} ${R_corner}
      L ${W} ${H / 2 - R_mid}
      A ${R_mid} ${R_mid} 0 0 0 ${W} ${H / 2 + R_mid}
      L ${W} ${H - R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${W - R_corner} ${H}
      L ${R_corner} ${H}
      A ${R_corner} ${R_corner} 0 0 0 0 ${H - R_corner}
      L 0 ${H / 2 + R_mid}
      A ${R_mid} ${R_mid} 0 0 0 0 ${H / 2 - R_mid}
      L 0 ${R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${R_corner} 0
      Z
    `
  } else if (isMobile) {
    path = `
      M ${R_corner} 0
      L ${W / 2 - R_mid} 0
      A ${R_mid} ${R_mid} 0 0 0 ${W / 2 + R_mid} 0
      L ${W - R_corner} 0
      A ${R_corner} ${R_corner} 0 0 0 ${W} ${R_corner}
      L ${W} ${P - R_perf}
      A ${R_perf} ${R_perf} 0 0 0 ${W} ${P + R_perf}
      L ${W} ${H - R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${W - R_corner} ${H}
      L ${W / 2 + R_mid} ${H}
      A ${R_mid} ${R_mid} 0 0 0 ${W / 2 - R_mid} ${H}
      L ${R_corner} ${H}
      A ${R_corner} ${R_corner} 0 0 0 0 ${H - R_corner}
      L 0 ${P + R_perf}
      A ${R_perf} ${R_perf} 0 0 0 0 ${P - R_perf}
      L 0 ${R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${R_corner} 0
      Z
    `
  } else {
    path = `
      M ${R_corner} 0
      L ${P - R_perf} 0
      A ${R_perf} ${R_perf} 0 0 0 ${P + R_perf} 0
      L ${W - R_corner} 0
      A ${R_corner} ${R_corner} 0 0 0 ${W} ${R_corner}
      L ${W} ${H / 2 - R_mid}
      A ${R_mid} ${R_mid} 0 0 0 ${W} ${H / 2 + R_mid}
      L ${W} ${H - R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${W - R_corner} ${H}
      L ${P + R_perf} ${H}
      A ${R_perf} ${R_perf} 0 0 0 ${P - R_perf} ${H}
      L ${R_corner} ${H}
      A ${R_corner} ${R_corner} 0 0 0 0 ${H - R_corner}
      L 0 ${H / 2 + R_mid}
      A ${R_mid} ${R_mid} 0 0 0 0 ${H / 2 - R_mid}
      L 0 ${R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${R_corner} 0
      Z
    `
  }

  pathCache.set(key, path)
  return path
}

/**
 * Deterministic Barcode generator from an ID string
 */
export function TicketBarcode({ id = 'OFFSCRIPT', className = '' }: { id?: string; className?: string }) {
  let seed = 0
  for (let i = 0; i < id.length; i++) {
    seed = (seed * 31 + id.charCodeAt(i)) % 1000
  }

  let d = ''
  let currentX = 2
  for (let i = 0; i < 20; i++) {
    const pseudoRandom = Math.sin(seed + i * 7.5) * 10000
    const val = Math.floor(Math.abs(pseudoRandom)) % 3
    const width = val === 0 ? 1.5 : val === 1 ? 2.5 : 3.5
    d += `M${currentX.toFixed(1)} 0 V24 `
    currentX += width + 2
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${Math.ceil(currentX + 2)} 24`}
      className={`h-5 w-auto overflow-hidden select-none stroke-bone opacity-75 ${className}`}
      strokeWidth="2"
    >
      <path d={d} />
    </svg>
  )
}

/**
 * Reusable TicketShape Component
 * Features:
 * - Single source of truth for silhouette, border, stub divider, and perforation
 * - Concave quarter-circle scooped corners
 * - Semicircle notches precisely aligned at perforation line
 * - Detachable stub on right (desktop) with tear tilt ONLY IF tearOnHover === true
 * - Synchronous initial layout measurement + ResizeObserver + fonts.ready + img load listeners
 */
export function TicketShape({
  id = 'pass-01',
  children,
  stubContent,
  overlayContent,
  className = '',
  bodyClassName,
  stubWidth = 170,
  stubHeight = 110,
  isHovered: externalHover,
  tearOnHover = false,
  hoverStroke = true,
  hasPerforation = stubContent !== undefined,
  onMouseEnter,
  onMouseLeave,
}: TicketShapeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )
  const [dimensions, setDimensions] = useState(() => {
    const mobile = typeof window !== 'undefined' ? window.innerWidth < 640 : false
    return {
      width: typeof window !== 'undefined' ? (mobile ? Math.min(380, window.innerWidth - 32) : 360) : 360,
      height: mobile ? 545 : 480,
    }
  })
  const [internalHover, setInternalHover] = useState(false)
  const prefersReduced = usePrefersReducedMotion()

  const isHovered = externalHover !== undefined ? externalHover : internalHover

  // Synchronous layout effect on mount to avoid initial 360x480 flash or scaling desync
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateDimensions = () => {
      const w = Math.round(el.offsetWidth)
      const h = Math.round(el.offsetHeight)
      const mobile = window.innerWidth < 640
      setIsMobile(mobile)
      if (w > 0 && h > 0) {
        setDimensions((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }))
      }
    }

    updateDimensions()

    const ro = new ResizeObserver(() => {
      updateDimensions()
    })
    ro.observe(el)

    window.addEventListener('resize', updateDimensions, { passive: true })

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(updateDimensions)
    }

    const images = el.querySelectorAll('img')
    images.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', updateDimensions, { once: true })
      }
    })

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updateDimensions)
    }
  }, [])

  const { width: W, height: H } = dimensions

  // Desktop: stub is right column of width `stubWidth`. Perforation is at `W - stubWidth`.
  // Mobile: stub is bottom row of height `stubHeight`. Perforation is at `H - stubHeight`.
  const P = isMobile ? Math.max(80, H - stubHeight) : Math.max(120, W - stubWidth)

  const R_perf = 9
  const ticketPath = generateTicketPath(W, H, P, isMobile, hasPerforation)

  const handleEnter = () => {
    setInternalHover(true)
    onMouseEnter?.()
  }

  const handleLeave = () => {
    setInternalHover(false)
    onMouseLeave?.()
  }

  const clipId = `ticket-clip-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        // Define stub width CSS variable as single source of truth
        ['--stub-w' as string]: `${stubWidth}px`,
        ['--stub-h' as string]: `${stubHeight}px`,
      }}
      className={`relative group select-none ${className}`}
    >
      {/* SVG Outline and Background Silhouette - exact box match */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={ticketPath} />
          </clipPath>
        </defs>

        {/* Ticket Base Fill with 2px Bone/25 stroke */}
        <path
          d={ticketPath}
          fill="#111210"
          stroke={hoverStroke && isHovered ? '#D4FF3F' : '#EDEBE0'}
          strokeWidth="2"
          strokeOpacity={hoverStroke && isHovered ? 0.9 : 0.22}
          className="transition-colors duration-200"
        />

        {/* SVG Punch Hole Perforation Line - sits exactly on stub boundary */}
        {hasPerforation &&
          (isMobile ? (
            <line
              className="ticket-perforation"
              x1={R_perf}
              y1={P}
              x2={W - R_perf}
              y2={P}
              stroke={hoverStroke && isHovered ? '#D4FF3F' : '#EDEBE0'}
              strokeWidth="2"
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeOpacity="0.45"
            />
          ) : (
            <line
              className="ticket-perforation"
              x1={P}
              y1={R_perf}
              x2={P}
              y2={H - R_perf}
              stroke={hoverStroke && isHovered ? '#D4FF3F' : '#EDEBE0'}
              strokeWidth="2"
              strokeDasharray="2 6"
              strokeLinecap="round"
              strokeOpacity="0.45"
            />
          ))}
      </svg>

      {/* Clipped Content Container */}
      <div
        className="relative z-10 w-full h-full flex flex-col sm:flex-row overflow-hidden items-stretch"
        style={{ clipPath: `url(#${clipId})` }}
      >
        {overlayContent}

        {/* Main Body - content padding larger than scoop radius so nothing crosses outline */}
        <div
          className={`featured-ticket-content flex-1 flex flex-col min-w-0 relative z-10 self-stretch ${
            bodyClassName || 'p-6 sm:p-7'
          }`}
        >
          {children}
        </div>

        {/* Revealed "View" label in the perforation tear gap - ONLY for tearOnHover (Featured) */}
        {!isMobile && tearOnHover && (
          <div
            aria-hidden="true"
            className="absolute z-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              right: 'calc(var(--stub-w) - 14px)',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <span className="font-mono text-[9px] uppercase tracking-widest text-volt font-black -rotate-90 bg-ink px-1 border border-volt/50">
              View
            </span>
          </div>
        )}

        {/* Detachable Ticket Stub with Hover Tear Tilt ONLY if tearOnHover */}
        {stubContent && (
          <motion.div
            animate={
              tearOnHover && isHovered && !prefersReduced
                ? isMobile
                  ? { y: 3, rotate: 1.5 }
                  : { x: 4, rotate: 3.5, originX: 0, originY: 0.5 }
                : { x: 0, y: 0, rotate: 0 }
            }
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            style={{
              width: isMobile ? '100%' : 'var(--stub-w)',
              height: isMobile ? 'var(--stub-h)' : '100%',
              alignSelf: 'stretch',
              borderLeft: isMobile ? 'none' : '1px solid rgba(237,235,224,0.1)',
              borderTop: isMobile ? '1px solid rgba(237,235,224,0.1)' : 'none',
            }}
            className="featured-stub-column shrink-0 bg-bone/[0.02] p-4 sm:p-5 flex flex-col justify-between items-center text-center relative z-10 self-stretch"
          >
            {stubContent}
          </motion.div>
        )}
      </div>
    </div>
  )
}
