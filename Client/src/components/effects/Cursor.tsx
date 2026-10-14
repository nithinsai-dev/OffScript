import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import gsap from 'gsap'
import { useCursor } from '@/hooks/useCursor'
import { useIsFinePointer, usePrefersReducedMotion } from '@/hooks/useMediaQuery'

interface TrailPoint {
  x: number
  y: number
  time: number
}

interface Shard {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  vRot: number
  born: number
  duration: number
}

export function Cursor() {
  const { cursorLabel, cursorVariant } = useCursor()
  const isFinePointer = useIsFinePointer()
  const prefersReduced = usePrefersReducedMotion()

  const cursorRef = useRef<HTMLDivElement | null>(null)
  const labelRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Trail and shards stored in refs for zero React re-render overhead
  const trailRef = useRef<TrailPoint[]>([])
  const shardsRef = useRef<Shard[]>([])
  const rafIdRef = useRef<number | null>(null)
  const isLoopRunningRef = useRef(false)
  const lastFrameTimeRef = useRef(0)

  useEffect(() => {
    if (!isFinePointer || prefersReduced) return

    // Apply global body class for native cursor hiding on desktop
    document.body.classList.add('has-custom-cursor')

    const cursorEl = cursorRef.current
    const labelEl = labelRef.current
    const canvas = canvasRef.current
    if (!cursorEl || !canvas) return

    const quickCursorX = gsap.quickTo(cursorEl, 'x', { duration: 0.08, ease: 'power2.out' })
    const quickCursorY = gsap.quickTo(cursorEl, 'y', { duration: 0.08, ease: 'power2.out' })

    const quickLabelX = labelEl ? gsap.quickTo(labelEl, 'x', { duration: 0.12, ease: 'power2.out' }) : null
    const quickLabelY = labelEl ? gsap.quickTo(labelEl, 'y', { duration: 0.12, ease: 'power2.out' }) : null

    const ctx = canvas.getContext('2d')
    const DPR = Math.min(1.5, window.devicePixelRatio || 1) // Target: DPR max 1.5

    const handleResize = () => {
      if (!canvas || !ctx) return
      canvas.width = Math.round(window.innerWidth * DPR)
      canvas.height = Math.round(window.innerHeight * DPR)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const TRAIL_LIFETIME = 500 // ms
    const FPS_INTERVAL = 1000 / 30 // Target: 30fps cap

    const render = (time: number) => {
      if (document.hidden) {
        isLoopRunningRef.current = false
        return
      }

      // Throttle rendering to ~30fps for canvas ink trail
      if (time - lastFrameTimeRef.current >= FPS_INTERVAL) {
        lastFrameTimeRef.current = time

        if (ctx && canvas) {
          ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

          // 1. Draw tapering Volt ink trail
          const points = trailRef.current
          while (points.length > 0 && time - points[0].time > TRAIL_LIFETIME) {
            points.shift()
          }

          if (points.length > 1) {
            for (let i = 1; i < points.length; i++) {
              const p1 = points[i - 1]
              const p2 = points[i]
              const age = time - p2.time
              const progress = 1 - age / TRAIL_LIFETIME
              if (progress <= 0) continue

              const width = Math.max(0.5, progress * 3.5)
              const alpha = progress * 0.45

              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.strokeStyle = `rgba(212, 255, 63, ${alpha})`
              ctx.lineWidth = width
              ctx.lineCap = 'round'
              ctx.stroke()
            }
          }

          // 2. Draw flying Volt click shards
          const shards = shardsRef.current
          for (let i = shards.length - 1; i >= 0; i--) {
            const s = shards[i]
            const elapsed = time - s.born
            if (elapsed > s.duration) {
              shards.splice(i, 1)
              continue
            }

            const progress = elapsed / s.duration
            const alpha = 1 - progress

            s.x += s.vx
            s.y += s.vy
            s.vy += 0.08
            s.rotation += s.vRot

            ctx.save()
            ctx.translate(s.x, s.y)
            ctx.rotate((s.rotation * Math.PI) / 180)
            ctx.fillStyle = `rgba(212, 255, 63, ${alpha})`
            ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size * 1.4)
            ctx.restore()
          }
        }
      }

      // Stop loop when idle (no trail points and no shards left)
      if (trailRef.current.length === 0 && shardsRef.current.length === 0) {
        isLoopRunningRef.current = false
        if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        return
      }

      rafIdRef.current = requestAnimationFrame(render)
    }

    const ensureLoop = () => {
      if (!isLoopRunningRef.current && !document.hidden) {
        isLoopRunningRef.current = true
        lastFrameTimeRef.current = performance.now()
        rafIdRef.current = requestAnimationFrame(render)
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e
      quickCursorX(x)
      quickCursorY(y)

      if (quickLabelX && quickLabelY) {
        quickLabelX(x + 14)
        quickLabelY(y + 14)
      }

      // Add to ink trail
      trailRef.current.push({ x, y, time: performance.now() })
      ensureLoop()
    }

    const handleClick = (e: MouseEvent) => {
      // Spawn 8 Volt shards flying radially on click
      const now = performance.now()
      const newShards: Shard[] = []
      const shardCount = 8

      for (let i = 0; i < shardCount; i++) {
        const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
        const speed = 2.0 + Math.random() * 3.5
        newShards.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.5 + Math.random() * 3,
          rotation: Math.random() * 360,
          vRot: (Math.random() - 0.5) * 10,
          born: now,
          duration: 450,
        })
      }
      shardsRef.current.push(...newShards)
      ensureLoop()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        isLoopRunningRef.current = false
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('mousedown', handleClick, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.body.classList.remove('has-custom-cursor')
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
      isLoopRunningRef.current = false
    }
  }, [isFinePointer, prefersReduced])

  // Native cursor preserved on touch devices or reduced motion
  if (!isFinePointer || prefersReduced) {
    return null
  }

  const isHeading = cursorVariant === 'heading'
  const isInput = cursorVariant === 'input'
  const isButton = cursorVariant === 'button'
  const hasLabel = Boolean(cursorLabel)

  return (
    <>
      {/* 1. DPR-capped 30fps Idle-stopped Canvas Trail */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[99998]"
      />

      {/* 2. Core Point (Bone diamond: mix-blend-mode difference only on small diamond, normal on large circle) */}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[99999] -translate-x-1/2 -translate-y-1/2"
      >
        <motion.div
          animate={{
            scale: isHeading ? 4.0 : isButton ? 1.6 : isInput ? 1 : 1,
            rotate: isInput ? 0 : 45,
            borderRadius: isHeading ? '50%' : isInput ? '1px' : '0px',
            width: isInput ? 2 : 10,
            height: isInput ? 22 : 10,
            opacity: hasLabel ? 0.35 : 1,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 450 }}
          className="bg-bone shadow-sm"
          style={{
            mixBlendMode: isHeading ? 'normal' : 'difference', // Target #2: difference only on small diamond
          }}
        />
      </div>

      {/* 3. Contextual Ticket Label (No React re-render on move, positioned via GSAP quickTo) */}
      <div
        ref={labelRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-[99999]"
      >
        <AnimatePresence>
          {cursorLabel && (
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 4 }}
              transition={{ type: 'spring', damping: 22, stiffness: 450 }}
              className="clip-chamfer-sm bg-volt text-ink px-3 py-1 font-mono text-[11px] font-extrabold uppercase tracking-wider shadow-hard-bone border border-ink select-none whitespace-nowrap"
            >
              {cursorLabel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
