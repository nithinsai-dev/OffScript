import { useRef, useState, useEffect, useCallback } from 'react'
import { TicketShape, TicketBarcode } from '@/components/ui/TicketShape'
import { CountUp } from '@/components/effects/CountUp'
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery'
import type { Prize } from '@/types/event'

interface ScratchCardPrizeProps {
  prize: Prize
  index: number
  isFirstRank: boolean
}

export function ScratchCardPrize({ prize, index, isFirstRank }: ScratchCardPrizeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isScratchingRef = useRef(false)
  const prefersReduced = usePrefersReducedMotion()
  const [isRevealed, setIsRevealed] = useState(() => prefersReduced)
  const [isCanvasFaded, setIsCanvasFaded] = useState(() => prefersReduced)

  const amountVal = Number(prize.amount) || 0
  const rankNumber = prize.rank || index + 1
  const rankLabel = rankNumber === 1 ? '1ST PRIZE' : rankNumber === 2 ? '2ND PRIZE' : rankNumber === 3 ? '3RD PRIZE' : `RANK #${rankNumber}`

  const handleReveal = useCallback(() => {
    setIsCanvasFaded(true)
    setTimeout(() => {
      setIsRevealed(true)
    }, 280)
  }, [])

  // Scratch reveal threshold (~55% cleared)
  const checkScratchPercentage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || isRevealed) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    if (width === 0 || height === 0) return

    // Coarse 8x8 grid check (64 sampled pixels) to avoid heavy readbacks
    const sampleCols = 8
    const sampleRows = 8
    let clearedCount = 0
    const totalSamples = sampleCols * sampleRows

    for (let r = 0; r < sampleRows; r++) {
      for (let c = 0; c < sampleCols; c++) {
        const x = Math.floor((c + 0.5) * (width / sampleCols))
        const y = Math.floor((r + 0.5) * (height / sampleRows))
        const pixel = ctx.getImageData(x, y, 1, 1).data
        // If alpha is near 0, pixel is cleared
        if (pixel[3] < 30) {
          clearedCount++
        }
      }
    }

    const ratio = clearedCount / totalSamples
    if (ratio >= 0.52) {
      handleReveal()
    }
  }, [isRevealed, handleReveal])

  // Initialize Canvas Scratch Layer
  useEffect(() => {
    if (prefersReduced) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Cap DPR at 1 for max performance and exact 320x160 CSS pixels
    const width = 300
    const height = 110
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Base dark Ink fill
    ctx.fillStyle = '#111210'
    ctx.fillRect(0, 0, width, height)

    // Faint Volt neobrutalist noise/crosshatch pattern
    ctx.strokeStyle = 'rgba(212, 255, 63, 0.12)'
    ctx.lineWidth = 1
    for (let i = -width; i < width * 2; i += 16) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i + height, height)
      ctx.stroke()
    }

    // Border line inside canvas
    ctx.strokeStyle = 'rgba(212, 255, 63, 0.35)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(6, 6, width - 12, height - 12)

    // "Scratch here" text
    ctx.fillStyle = '#D4FF3F'
    ctx.font = 'bold 12px "JetBrains Mono", monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('SCRATCH HERE', width / 2, height / 2 - 4)

    ctx.fillStyle = 'rgba(237, 235, 224, 0.5)'
    ctx.font = '10px "JetBrains Mono", monospace'
    ctx.fillText('CLICK & DRAG TO REVEAL', width / 2, height / 2 + 14)

    // Pointer events drawing with globalCompositeOperation destination-out
    let rafId: number | null = null

    const scratchAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    const onPointerDown = (e: PointerEvent) => {
      isScratchingRef.current = true
      canvas.setPointerCapture(e.pointerId)
      scratchAt(e.clientX, e.clientY)
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isScratchingRef.current) return
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        scratchAt(e.clientX, e.clientY)
        checkScratchPercentage()
        rafId = null
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      if (isScratchingRef.current) {
        isScratchingRef.current = false
        try {
          canvas.releasePointerCapture(e.pointerId)
        } catch {
          // pointer capture might already be released
        }
        checkScratchPercentage()
      }
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [prefersReduced, checkScratchPercentage])

  const stub = (
    <div className="flex flex-col justify-between items-center h-full py-1 font-mono text-[9px] text-bone/50 select-none">
      <span className="text-volt font-bold">REWARD</span>
      <span className="text-bone/40 -rotate-90 uppercase text-[8px] tracking-wider my-2">ADMIT</span>
      <TicketBarcode id={`PRZ-${index}`} className="w-14 opacity-60" />
    </div>
  )

  return (
    <div className={`relative w-full ${isFirstRank ? 'shadow-hard-volt' : 'shadow-hard-bone'}`}>
      <TicketShape
        id={`scratch-prize-${index}`}
        tearOnHover={false}
        stubWidth={90}
        className="w-full"
        stubContent={stub}
      >
        <div className="p-3 sm:p-4 space-y-3 relative select-none">
          {/* Header row: Rank & Title */}
          <div className="flex items-center justify-between border-b border-bone/15 pb-2">
            <span
              className={`font-mono text-xs uppercase font-black tracking-widest ${
                isFirstRank ? 'text-volt' : 'text-bone/80'
              }`}
            >
              {rankLabel}
            </span>
            {prize.title && (
              <span className="font-mono text-[11px] text-bone/60 font-bold truncate max-w-[130px]">
                {prize.title}
              </span>
            )}
          </div>

          {/* Amount Box with Scratch Canvas Layer */}
          <div className="relative h-[110px] w-full border border-bone/20 bg-bone/[0.02] flex items-center justify-center overflow-hidden">
            {/* Underlying Amount (Always in DOM for accessibility) */}
            <div
              className="flex flex-col items-center justify-center p-2 text-center"
              aria-live="polite"
            >
              <span className="font-mono text-[10px] text-bone/40 uppercase tracking-widest block">
                CASH REWARD
              </span>
              <div className="font-display text-3xl sm:text-4xl font-black text-volt tracking-tight">
                Rs {isRevealed ? <CountUp end={amountVal} /> : amountVal.toLocaleString('en-IN')}
              </div>
              {isRevealed && (
                <span className="inline-block mt-1 px-2 py-0.5 border border-volt/60 bg-ink text-volt font-mono text-[9px] font-black uppercase tracking-wider -rotate-3 animate-stampIn">
                  UNLOCKED
                </span>
              )}
            </div>

            {/* Canvas Scratch Layer (touch-action: none ONLY on canvas) */}
            {!isRevealed && !prefersReduced && (
              <canvas
                ref={canvasRef}
                style={{
                  touchAction: 'none',
                  transition: 'opacity 250ms ease-out',
                  opacity: isCanvasFaded ? 0 : 1,
                }}
                className="absolute inset-0 w-full h-full cursor-crosshair z-10"
              />
            )}
          </div>

          {/* Card Description */}
          {prize.description && (
            <p className="font-sans text-xs text-bone/70 line-clamp-2 leading-relaxed">
              {prize.description}
            </p>
          )}

          {/* Reveal button: keyboard-operable and screen-reader friendly */}
          {!isRevealed && !prefersReduced && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handleReveal}
                aria-label="Reveal prize amount"
                className="font-mono text-[10px] uppercase font-bold text-volt hover:text-bone underline transition-colors"
              >
                Reveal
              </button>
            </div>
          )}
        </div>
      </TicketShape>
    </div>
  )
}
