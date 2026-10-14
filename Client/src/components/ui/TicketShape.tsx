import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface TicketShapeProps {
  id?: string
  children: ReactNode
  stubContent?: ReactNode
  className?: string
  stubWidth?: number // desktop stub width (default 130px)
  isHovered?: boolean
  tearOnHover?: boolean // ONLY true for Featured stacking cards
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

/**
 * Global shared path cache to avoid recalculating SVG strings on re-render/hover
 */
const pathCache = new Map<string, string>()

function generateTicketPath(W: number, H: number, P: number, isMobile: boolean): string {
  const key = `${W}_${H}_${P}_${isMobile}`
  const cached = pathCache.get(key)
  if (cached) return cached

  const R_corner = 12
  const R_perf = 9
  const R_mid = 7

  const path = isMobile
    ? `
      M ${R_corner} 0
      L ${W / 2 - R_mid} 0
      A ${R_mid} ${R_mid} 0 0 1 ${W / 2 + R_mid} 0
      L ${W - R_corner} 0
      A ${R_corner} ${R_corner} 0 0 0 ${W} ${R_corner}
      L ${W} ${P - R_perf}
      A ${R_perf} ${R_perf} 0 0 0 ${W} ${P + R_perf}
      L ${W} ${H - R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${W - R_corner} ${H}
      L ${W / 2 + R_mid} ${H}
      A ${R_mid} ${R_mid} 0 0 1 ${W / 2 - R_mid} ${H}
      L ${R_corner} ${H}
      A ${R_corner} ${R_corner} 0 0 0 0 ${H - R_corner}
      L 0 ${P + R_perf}
      A ${R_perf} ${R_perf} 0 0 0 0 ${P - R_perf}
      L 0 ${R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${R_corner} 0
      Z
    `
    : `
      M ${R_corner} 0
      L ${P - R_perf} 0
      A ${R_perf} ${R_perf} 0 0 1 ${P + R_perf} 0
      L ${W - R_corner} 0
      A ${R_corner} ${R_corner} 0 0 0 ${W} ${R_corner}
      L ${W} ${H / 2 - R_mid}
      A ${R_mid} ${R_mid} 0 0 1 ${W} ${H / 2 + R_mid}
      L ${W} ${H - R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${W - R_corner} ${H}
      L ${P + R_perf} ${H}
      A ${R_perf} ${R_perf} 0 0 1 ${P - R_perf} ${H}
      L ${R_corner} ${H}
      A ${R_corner} ${R_corner} 0 0 0 0 ${H - R_corner}
      L 0 ${H / 2 + R_mid}
      A ${R_mid} ${R_mid} 0 0 1 0 ${H / 2 - R_mid}
      L 0 ${R_corner}
      A ${R_corner} ${R_corner} 0 0 0 ${R_corner} 0
      Z
    `

  pathCache.set(key, path)
  return path
}

/**
 * Global Shared ResizeObserver singleton to avoid 1 observer per card
 */
type ResizeCallback = (entry: ResizeObserverEntry) => void
const observerCallbacks = new Map<Element, ResizeCallback>()
let sharedRO: ResizeObserver | null = null

function getSharedRO() {
  if (typeof window === 'undefined') return null
  if (!sharedRO) {
    sharedRO = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cb = observerCallbacks.get(entry.target)
        if (cb) cb(entry)
      }
    })
  }
  return sharedRO
}

/**
 * Deterministic Barcode generator from an ID string
 */
export function TicketBarcode({ id = 'OFFSCRIPT', className = '' }: { id?: string; className?: string }) {
  const bars = []
  let seed = 0
  for (let i = 0; i < id.length; i++) {
    seed = (seed * 31 + id.charCodeAt(i)) % 1000
  }

  for (let i = 0; i < 24; i++) {
    const pseudoRandom = Math.sin(seed + i * 7.5) * 10000
    const val = Math.floor(Math.abs(pseudoRandom)) % 3
    const width = val === 0 ? 1.5 : val === 1 ? 2.5 : 4
    bars.push({ width, isGap: i % 4 === 3 })
  }

  return (
    <div className={`flex items-center gap-[2px] h-6 overflow-hidden select-none ${className}`}>
      {bars.map((bar, idx) => (
        <span
          key={idx}
          className="h-full bg-bone opacity-75 shrink-0"
          style={{ width: `${bar.width}px` }}
        />
      ))}
    </div>
  )
}

/**
 * Reusable TicketShape Component
 * Features:
 * - Concave quarter-circle scooped corners
 * - Semicircle notches at perforation line (top/bottom) and outer edge centers (left/right)
 * - Exact SVG outline stroke and fill
 * - Detachable stub on right (desktop) with tear tilt ONLY IF tearOnHover === true (FeaturedStack)
 * - Shared ResizeObserver and memoized SVG paths
 */
export function TicketShape({
  id = 'pass-01',
  children,
  stubContent,
  className = '',
  stubWidth = 130,
  isHovered: externalHover,
  tearOnHover = false,
  onMouseEnter,
  onMouseLeave,
}: TicketShapeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [dimensions, setDimensions] = useState({ width: 360, height: 480 })
  const [isMobile, setIsMobile] = useState(false)
  const [internalHover, setInternalHover] = useState(false)
  const prefersReduced = usePrefersReducedMotion()

  const isHovered = externalHover !== undefined ? externalHover : internalHover

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        const roundedW = Math.round(rect.width)
        const roundedH = Math.round(rect.height)
        setDimensions((prev) => (prev.width === roundedW && prev.height === roundedH ? prev : { width: roundedW, height: roundedH }))
      }
      setIsMobile(window.innerWidth < 640)
    }

    updateDimensions()
    const ro = getSharedRO()
    if (ro) {
      observerCallbacks.set(el, updateDimensions)
      ro.observe(el)
    }

    return () => {
      if (ro) {
        observerCallbacks.delete(el)
        ro.unobserve(el)
      }
    }
  }, [])

  const { width: W, height: H } = dimensions

  // On desktop, stub is on right; on mobile, stub is at bottom
  const P = isMobile ? Math.max(120, H - 110) : Math.max(140, W - stubWidth)

  const ticketPath = generateTicketPath(W, H, P, isMobile)

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
      className={`relative group select-none ${className}`}
    >
      {/* SVG Outline and Background Silhouette */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
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
          stroke={isHovered ? '#D4FF3F' : '#EDEBE0'}
          strokeWidth="2"
          strokeOpacity={isHovered ? 0.9 : 0.22}
          className="transition-colors duration-200"
        />

        {/* SVG Punch Hole Perforation Line */}
        {isMobile ? (
          <line
            x1="12"
            y1={P}
            x2={W - 12}
            y2={P}
            stroke={isHovered ? '#D4FF3F' : '#EDEBE0'}
            strokeWidth="2"
            strokeDasharray="1 6"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        ) : (
          <line
            x1={P}
            y1="12"
            x2={P}
            y2={H - 12}
            stroke={isHovered ? '#D4FF3F' : '#EDEBE0'}
            strokeWidth="2"
            strokeDasharray="1 6"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        )}
      </svg>

      {/* Clipped Content Container */}
      <div
        className="relative z-10 w-full h-full flex flex-col sm:flex-row overflow-hidden"
        style={{ clipPath: `url(#${clipId})` }}
      >
        {/* Main Body */}
        <div className="flex-1 flex flex-col min-w-0 p-4 sm:p-5 relative z-10">
          {children}
        </div>

        {/* Revealed "View" label in the perforation tear gap - ONLY for tearOnHover (Featured) */}
        {!isMobile && tearOnHover && (
          <div
            aria-hidden="true"
            className="absolute z-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              right: `${stubWidth - 14}px`,
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
              width: isMobile ? '100%' : `${stubWidth}px`,
              borderLeft: isMobile ? 'none' : '1px solid rgba(237,235,224,0.1)',
              borderTop: isMobile ? '1px solid rgba(237,235,224,0.1)' : 'none',
            }}
            className="shrink-0 bg-bone/[0.02] p-3 sm:p-4 flex flex-col justify-between items-center text-center relative z-10"
          >
            {stubContent}
          </motion.div>
        )}
      </div>
    </div>
  )
}
