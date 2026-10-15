import gsap from 'gsap'

/**
 * Direction cycle for mechanical assembly entry:
 * Card 1 from left, 2 from top, 3 from bottom, 4 from right, 5 from left, 6 from bottom...
 */
const DIRECTIONS = ['left', 'top', 'bottom', 'right', 'left', 'bottom'] as const
type Direction = typeof DIRECTIONS[number]

/**
 * Determine whether full mechanical assembly sequence should run.
 */
export function shouldPlayFullSequence(isLite = false, prefersReduced = false): boolean {
  if (isLite || prefersReduced) return false
  return true
}

/**
 * Compatibility stub
 */
export function markFullSequencePlayed(): void {}

/**
 * Run Mechanical Assembly Entry Sequence (Part B1)
 * - Faint dashed Volt guides drawn over 0.3s
 * - Cards travel from computed directional offsets (60-90 vw/vh)
 * - Fast mechanical travel, 3px latch overshoot + settle (0.12s), 1-frame Volt flash (0.18s)
 * - 2px translateY shake of the whole grid on last card latch
 * - Stagger 0.18s per card (~1.8s total)
 * - Zero layout shift (real card elements with transform: translate)
 * - 2.8s failsafe and instant interrupt on click/key/scroll
 */
export function runMechanicalAssemblySequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  let isCleanedUp = false
  let failsafeTimer: ReturnType<typeof setTimeout> | null = null
  let ctx: gsap.Context | null = null
  let overlayEl: HTMLDivElement | null = null

  // Ensure no horizontal scrollbar during offscreen card travel
  gridWrapperEl.style.overflowX = 'clip'

  const forceShowCards = () => {
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
      el.style.willChange = 'auto'
    })
    if (gridWrapperEl) {
      gridWrapperEl.style.transform = 'none'
      gridWrapperEl.removeAttribute('data-enter')
    }
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl)
      overlayEl = null
    }
  }

  const cleanup = () => {
    if (isCleanedUp) return
    isCleanedUp = true

    if (failsafeTimer) {
      clearTimeout(failsafeTimer)
      failsafeTimer = null
    }

    removeInterruptListeners()
    document.removeEventListener('visibilitychange', handleVisibilityChange)

    forceShowCards()

    if (ctx) {
      ctx.revert()
      ctx = null
    }

    onComplete?.()
  }

  const completeImmediately = () => {
    if (isCleanedUp) return
    if (ctx) {
      try {
        const activeTls = ctx.data as Array<{ progress?: (p: number) => void }>
        if (Array.isArray(activeTls)) {
          activeTls.forEach((item) => {
            if (typeof item.progress === 'function') {
              item.progress(1)
            }
          })
        }
      } catch {
        // Fallback
      }
    }
    cleanup()
  }

  const interruptEvents = ['pointerdown', 'keydown', 'wheel', 'touchstart']
  const handleInterrupt = () => {
    completeImmediately()
  }

  const addInterruptListeners = () => {
    interruptEvents.forEach((evt) => {
      window.addEventListener(evt, handleInterrupt, { capture: true, passive: true, once: true })
    })
  }

  const removeInterruptListeners = () => {
    interruptEvents.forEach((evt) => {
      window.removeEventListener(evt, handleInterrupt, { capture: true })
    })
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      completeImmediately()
    }
  }

  try {
    // 1. Overlay for guides and latch flash lines
    overlayEl = document.createElement('div')
    overlayEl.className = 'absolute inset-0 pointer-events-none z-20 overflow-visible'
    overlayEl.setAttribute('aria-hidden', 'true')
    gridWrapperEl.appendChild(overlayEl)

    const gridRect = gridWrapperEl.getBoundingClientRect()
    const guideElements: HTMLDivElement[] = []
    const flashElements: HTMLDivElement[] = []

    // 2. Measure card positions relative to grid wrapper
    cardElements.forEach((cardEl) => {
      const cardRect = cardEl.getBoundingClientRect()
      const relTop = cardRect.top - gridRect.top
      const relLeft = cardRect.left - gridRect.left
      const relWidth = cardRect.width
      const relHeight = cardRect.height

      // Faint dashed Volt outline at 25% opacity
      const guide = document.createElement('div')
      guide.className = 'absolute border border-dashed pointer-events-none'
      guide.style.borderColor = 'rgba(212, 255, 63, 0.25)'
      guide.style.top = `${relTop}px`
      guide.style.left = `${relLeft}px`
      guide.style.width = `${relWidth}px`
      guide.style.height = `${relHeight}px`
      guide.style.opacity = '0'
      guide.style.transformOrigin = 'top left'
      overlayEl?.appendChild(guide)
      guideElements.push(guide)

      // 1-frame Volt flash line on the card's top edge (2px line)
      const flash = document.createElement('div')
      flash.className = 'absolute bg-volt pointer-events-none h-[2px]'
      flash.style.top = `${relTop}px`
      flash.style.left = `${relLeft}px`
      flash.style.width = `${relWidth}px`
      flash.style.opacity = '0'
      overlayEl?.appendChild(flash)
      flashElements.push(flash)
    })

    // 3. Setup GSAP context
    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: cleanup,
      })

      // Phase 1: Draw guides by scaleX/scaleY over 0.3s
      tl.fromTo(
        guideElements,
        { scaleX: 0.1, scaleY: 0.1, opacity: 0 },
        { scaleX: 1, scaleY: 1, opacity: 1, duration: 0.3, ease: 'power2.out', stagger: 0.02 }
      )

      // Phase 2: Each card travels from directional offset and latches
      const vw = window.innerWidth
      const vh = window.innerHeight

      cardElements.forEach((cardEl, idx) => {
        const dir: Direction = DIRECTIONS[idx % DIRECTIONS.length]
        let startX = 0
        let startY = 0
        let latchX = 0
        let latchY = 0

        if (dir === 'left') {
          startX = -Math.max(vw * 0.75, 400)
          latchX = 3
        } else if (dir === 'right') {
          startX = Math.max(vw * 0.75, 400)
          latchX = -3
        } else if (dir === 'top') {
          startY = -Math.max(vh * 0.75, 350)
          latchY = 3
        } else {
          // bottom
          startY = Math.max(vh * 0.75, 350)
          latchY = -3
        }

        const cardStartTime = 0.25 + idx * 0.18
        const guideEl = guideElements[idx]
        const flashEl = flashElements[idx]

        // Set initial transform
        gsap.set(cardEl, {
          x: startX,
          y: startY,
          opacity: 1,
          willChange: 'transform',
        })

        // Travel: fast linear-ish travel into slot (0.42s)
        tl.to(
          cardEl,
          {
            x: latchX,
            y: latchY,
            duration: 0.42,
            ease: 'power2.inOut',
          },
          cardStartTime
        )

        // Settle & Latch: 3px overshoot settles to 0 (0.12s)
        tl.to(
          cardEl,
          {
            x: 0,
            y: 0,
            duration: 0.12,
            ease: 'power4.out',
            onStart: () => {
              // Fade out guide as card locks in
              if (guideEl) gsap.to(guideEl, { opacity: 0, duration: 0.15 })
              // 1-frame Volt flash on top edge (opacity 1 to 0 in 0.18s)
              if (flashEl) {
                gsap.fromTo(flashEl, { opacity: 1 }, { opacity: 0, duration: 0.18, ease: 'power2.out' })
              }
            },
          },
          cardStartTime + 0.42
        )
      })

      // Phase 3: 2px translateY shake of the whole grid only when the last card locks
      const lastLockTime = 0.25 + (cardElements.length - 1) * 0.18 + 0.42
      tl.to(
        gridWrapperEl,
        {
          y: 2,
          duration: 0.04,
          ease: 'power1.in',
        },
        lastLockTime
      )
      tl.to(
        gridWrapperEl,
        {
          y: -2,
          duration: 0.05,
          ease: 'power1.inOut',
        },
        lastLockTime + 0.04
      )
      tl.to(
        gridWrapperEl,
        {
          y: 0,
          duration: 0.05,
          ease: 'power2.out',
        },
        lastLockTime + 0.09
      )
    }, gridWrapperEl)

    addInterruptListeners()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Hard failsafe: 2.8s
    failsafeTimer = setTimeout(() => {
      cleanup()
    }, 2800)
  } catch {
    cleanup()
  }

  return cleanup
}

/**
 * Lite mode: simple 0.35s fade-up stagger, no guides, no latch shake
 */
export function runCardQuickSequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  gridWrapperEl.removeAttribute('data-enter')

  const tl = gsap.timeline({
    onComplete: () => {
      cardElements.forEach((el) => {
        el.style.opacity = '1'
        el.style.transform = 'none'
      })
      onComplete?.()
    },
  })

  tl.fromTo(
    cardElements,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' }
  )

  const failsafe = setTimeout(() => {
    tl.kill()
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
    onComplete?.()
  }, 1200)

  return () => {
    clearTimeout(failsafe)
    tl.kill()
  }
}

/**
 * Reduced motion: no animation, visible immediately
 */
export function runCardFadeSequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  gridWrapperEl.removeAttribute('data-enter')
  cardElements.forEach((el) => {
    el.style.opacity = '1'
    el.style.transform = 'none'
  })
  onComplete?.()
  return () => {}
}
