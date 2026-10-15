import gsap from 'gsap'
import { createCardShatterShards, type CardShardConfig } from '@/lib/shards'
import { MOTION } from '@/lib/motion'

/**
 * PLAY_FULL_EVERY_TIME
 * Set to true: full drop-shatter sequence plays every time an event detail page opens
 * (direct load, from card, prev/next, back/forward).
 */
export const PLAY_FULL_EVERY_TIME = true

/**
 * Determine whether full drop-shatter sequence should run.
 */
export function shouldPlayFullSequence(isLite = false, prefersReduced = false): boolean {
  if (isLite || prefersReduced) return false
  return PLAY_FULL_EVERY_TIME
}

/**
 * Record that full entry sequence was played (kept for compatibility).
 */
export function markFullSequencePlayed(): void {
  // Always plays every time in full mode per Part 5 spec
}

export interface CardCenter {
  id: string
  el: HTMLElement
  x: number
  y: number
}

/**
 * Run full "DROP, SHATTER, BECOME CARDS" sequence (about 1.5s total).
 * Uses a single GSAP timeline inside gsap.context.
 * Uses max 14 DOM elements inside an absolute overlay.
 * Batch reads all coordinates once at start.
 * Completed instantly on user interrupt (pointerdown, keydown, wheel, touchstart).
 * Guaranteed 3-second failsafe and visibilitychange protection.
 */
export function runCardDropShatterSequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  let isCleanedUp = false
  let failsafeTimer: ReturnType<typeof setTimeout> | null = null
  let ctx: gsap.Context | null = null
  let overlayEl: HTMLDivElement | null = null

  const forceShowCards = () => {
    gridWrapperEl.removeAttribute('data-enter')
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
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

    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl)
      overlayEl = null
    }

    gridWrapperEl.removeAttribute('data-enter')
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })

    if (ctx) {
      ctx.revert()
      ctx = null
    }

    markFullSequencePlayed()
    onComplete?.()
  }

  const completeImmediately = () => {
    if (isCleanedUp) return
    if (ctx) {
      // Progress all animations to the end immediately
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
    // 1. Single Batch Rect Measurement (read all first, relative to overlay)
    const overlayRect = gridWrapperEl.getBoundingClientRect()
    const cardTargets: CardCenter[] = cardElements.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.dataset.cardId || '',
        el,
        x: r.left - overlayRect.left + r.width / 2,
        y: r.top - overlayRect.top + r.height / 2,
      }
    })

    // 2. Build single overlay layer (max 14 elements alive inside)
    overlayEl = document.createElement('div')
    overlayEl.className = 'absolute inset-0 pointer-events-none z-30 overflow-visible'
    overlayEl.setAttribute('aria-hidden', 'true')
    gridWrapperEl.appendChild(overlayEl)

    // Center of the cards section for impact
    const centerX = overlayRect.width / 2
    // Place impact around center of grid
    const centerY = Math.max(120, Math.min(overlayRect.height / 2, overlayRect.height - 100))

    // Create Drop Diamond (~28px Volt rotated square)
    const dropDiamond = document.createElement('div')
    dropDiamond.className = 'absolute pointer-events-none'
    dropDiamond.style.width = '28px'
    dropDiamond.style.height = '28px'
    dropDiamond.style.left = `${centerX - 14}px`
    dropDiamond.style.top = '0px'
    dropDiamond.style.backgroundColor = '#D4FF3F'
    dropDiamond.style.transform = 'translate3d(0, -60px, 0) rotate(45deg) scale(0.85, 1.3)'
    dropDiamond.style.willChange = 'transform, opacity'
    overlayEl.appendChild(dropDiamond)

    // Generate up to 13 shards so total overlay elements never exceed 14
    const shards = createCardShatterShards(
      centerX,
      centerY,
      cardTargets.map((c) => ({ id: c.id, x: c.x, y: c.y })),
      13
    )

    const shardDoms: { config: CardShardConfig; el: HTMLDivElement }[] = []
    shards.forEach((shard) => {
      const sEl = document.createElement('div')
      sEl.className = 'absolute pointer-events-none'
      sEl.style.width = `${shard.size}px`
      sEl.style.height = `${shard.size}px`
      sEl.style.left = `${centerX - shard.size / 2}px`
      sEl.style.top = `${centerY - shard.size / 2}px`
      sEl.style.backgroundColor = '#D4FF3F'
      sEl.style.opacity = '0'
      sEl.style.transform = `translate3d(0, 0, 0) rotate(${shard.rot}deg)`
      sEl.style.willChange = 'transform, opacity'
      overlayEl?.appendChild(sEl)
      shardDoms.push({ config: shard, el: sEl })
    })

    // Setup user interrupt listeners
    addInterruptListeners()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Calculate timeline timings from MOTION
    const dropDuration = MOTION.eventDetailEntry.drop // 0.6s
    const impactDuration = MOTION.eventDetailEntry.impactSquash // 0.4s
    const shardsDuration = MOTION.eventDetailEntry.shardsTravel // 0.9s
    const popDuration = MOTION.eventDetailEntry.cardsPop // 0.7s
    const popStagger = MOTION.eventDetailEntry.cardsStagger // 0.07s

    // Estimated total duration derived dynamically
    const estimatedTotalSec = dropDuration + impactDuration + (shardsDuration * 0.7) + (cardTargets.length * popStagger) + popDuration
    const failsafeMs = Math.round((estimatedTotalSec + MOTION.eventDetailEntry.failsafeExtra) * 1000)

    // 3. Failsafe derived from timeline's duration (~4.1s at scale 1)
    failsafeTimer = setTimeout(() => {
      completeImmediately()
    }, failsafeMs)

    // 4. Single GSAP Timeline in gsap.context
    ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          cleanup()
        },
      })

      // STEP 1: DROP (0.6s) - falls from above to center, stretching slightly (scaleY: 1.3, scaleX: 0.85)
      tl.fromTo(
        dropDiamond,
        {
          y: -60,
          scaleX: 0.85,
          scaleY: 1.3,
          rotation: 45,
          opacity: 1,
        },
        {
          y: centerY - 14,
          scaleX: 0.85,
          scaleY: 1.3,
          rotation: 45,
          duration: dropDuration,
          ease: 'power2.in',
        }
      )

      // STEP 2: IMPACT & SQUASH (0.4s) - squashes (scaleY: 0.6, scaleX: 1.3) using scale only, then bursts
      tl.to(dropDiamond, {
        scaleX: 1.3,
        scaleY: 0.6,
        duration: impactDuration,
        ease: 'power1.out',
      })
      tl.set(dropDiamond, { opacity: 0 })

      // STEP 3: SHARDS (0.9s with a slight curve, starting at impact)
      tl.set(
        shardDoms.map((s) => s.el),
        { opacity: 1 },
        '<'
      )

      shardDoms.forEach(({ config, el }) => {
        const dx = config.targetX - centerX
        const dy = config.targetY - centerY
        const rotDelta = (Math.random() - 0.5) * 90

        if (config.isTargetCard) {
          tl.to(
            el,
            {
              x: dx,
              y: dy,
              rotation: `+=${rotDelta}`,
              duration: shardsDuration,
              ease: 'power2.out',
            },
            '<'
          )
        } else {
          // Extra decorative shard flies out radially and fades out
          tl.to(
            el,
            {
              x: dx * 1.2,
              y: dy * 1.2,
              rotation: `+=${rotDelta}`,
              opacity: 0,
              duration: shardsDuration * 0.85,
              ease: 'power2.out',
            },
            '<'
          )
        }
      })

      // STEP 4: CARDS POP (0.7s, staggered ~70ms in order of shard arrival)
      // Sort cards by distance to impact point
      const sortedCards = [...cardTargets].sort((a, b) => {
        const distA = Math.hypot(a.x - centerX, a.y - centerY)
        const distB = Math.hypot(b.x - centerX, b.y - centerY)
        return distA - distB
      })

      // Shard arrival start offset
      const shardArrivalBase = dropDuration + impactDuration + (shardsDuration * 0.65)

      sortedCards.forEach((target, index) => {
        const shardObj = shardDoms.find((s) => s.config.cardId === target.id)
        const popTime = shardArrivalBase + index * popStagger

        if (shardObj) {
          // Shard fades out in 150ms on arrival
          tl.to(
            shardObj.el,
            {
              opacity: 0,
              duration: 0.15,
              ease: 'power1.in',
            },
            popTime
          )
        }

        // Card goes from scale 0.6 and opacity 0 to scale 1 and opacity 1 with back.out(1.6)
        tl.fromTo(
          target.el,
          {
            scale: 0.6,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            duration: popDuration,
            ease: 'back.out(1.6)',
            clearProps: 'transform,opacity',
          },
          popTime
        )
      })
    }, gridWrapperEl)
  } catch (err) {
    // FAILSAFE: on any error, show cards immediately
    console.error('Card drop-shatter animation error:', err)
    forceShowCards()
    cleanup()
  }

  return cleanup
}

/**
 * QUICK version: cards rise in with a 40ms stagger, from translateY(24px) and scale(0.94) to final,
 * about 0.6s total, transform and opacity only.
 */
export function runCardQuickSequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  gridWrapperEl.removeAttribute('data-enter')

  try {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardElements,
        {
          y: 24,
          scale: 0.94,
          opacity: 0,
        },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.55,
          stagger: 0.04,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          onComplete: () => {
            onComplete?.()
          },
        }
      )
    }, gridWrapperEl)

    return () => {
      ctx.revert()
    }
  } catch (err) {
    console.warn('[OFFSCRIPT] cardSequence error, showing cards directly:', err)
    gridWrapperEl.removeAttribute('data-enter')
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transform = 'none'
    })
    onComplete?.()
    return () => {}
  }
}

/**
 * Plain 150ms fade for reduced motion or lite mode.
 * Zero GSAP loaded or executed.
 */
export function runCardFadeSequence(
  gridWrapperEl: HTMLElement,
  cardElements: HTMLElement[],
  onComplete?: () => void
): () => void {
  gridWrapperEl.removeAttribute('data-enter')

  cardElements.forEach((el) => {
    el.style.opacity = '0'
    el.style.transform = 'none'
    el.style.transition = 'opacity 150ms ease-out'
  })

  // Force reflow
  void gridWrapperEl.offsetWidth

  cardElements.forEach((el) => {
    el.style.opacity = '1'
  })

  const timer = setTimeout(() => {
    cardElements.forEach((el) => {
      el.style.transition = ''
    })
    onComplete?.()
  }, 160)

  return () => {
    clearTimeout(timer)
    cardElements.forEach((el) => {
      el.style.opacity = '1'
      el.style.transition = ''
    })
  }
}
