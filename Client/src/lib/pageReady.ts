import { useState, useEffect } from 'react'

/**
 * Shared Entry Animation Orchestrator (Part 2)
 *
 * Ensures all page entrance animations wait until the landing intro overlay
 * or route curtain has FULLY cleared the viewport + 150ms.
 */

type Listener = () => void

let isOverlayActive = false
let isPageRevealed = false
let curtainClearedTimestamp = 0
const listeners = new Set<Listener>()
let revealPromise: Promise<void> | null = null
let resolveRevealPromise: (() => void) | null = null
let failsafeTimer: ReturnType<typeof setTimeout> | null = null
let initialCheckTimer: ReturnType<typeof setTimeout> | null = null

function initPromise() {
  if (!revealPromise) {
    revealPromise = new Promise<void>((resolve) => {
      resolveRevealPromise = resolve
    })

    // Failsafe: if whenRevealed has not resolved after 4s, resolve anyway and force final states
    if (failsafeTimer) clearTimeout(failsafeTimer)
    failsafeTimer = setTimeout(() => {
      if (!isPageRevealed) {
        if (import.meta.env.DEV) {
          console.debug('[pageReady] 4s failsafe fired: forcing page reveal.')
        }
        triggerReveal()
      }
    }, 4000)
  }
}

initPromise()

function triggerReveal() {
  if (isPageRevealed) return
  isPageRevealed = true
  isOverlayActive = false
  curtainClearedTimestamp = performance.now()

  if (failsafeTimer) {
    clearTimeout(failsafeTimer)
    failsafeTimer = null
  }
  if (initialCheckTimer) {
    clearTimeout(initialCheckTimer)
    initialCheckTimer = null
  }

  if (resolveRevealPromise) {
    resolveRevealPromise()
  }

  listeners.forEach((listener) => listener())
}

/**
 * Notify the orchestrator that an overlay (intro or route curtain) has started
 */
export function notifyOverlayActive(overlayName = 'overlay') {
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (isLite || prefersReduced) {
    triggerReveal()
    return
  }

  isOverlayActive = true
  isPageRevealed = false
  // Create a new pending promise for this new transition
  revealPromise = new Promise<void>((resolve) => {
    resolveRevealPromise = resolve
  })

  if (failsafeTimer) clearTimeout(failsafeTimer)
  failsafeTimer = setTimeout(() => {
    if (!isPageRevealed) {
      if (import.meta.env.DEV) {
        console.debug(`[pageReady] 4s failsafe fired for ${overlayName}.`)
      }
      triggerReveal()
    }
  }, 4000)
}

/**
 * Notify the orchestrator that the curtain/intro overlay has FULLY cleared the screen
 * (its exit animation's onComplete).
 * Resolves only when overlay cleared PLUS 150ms.
 */
export function notifyOverlayCleared(overlayName = 'overlay') {
  const isLite = typeof document !== 'undefined' && document.documentElement.getAttribute('data-perf') === 'lite'
  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const delayMs = isLite || prefersReduced ? 0 : 150

  setTimeout(() => {
    if (import.meta.env.DEV) {
      console.debug(`[pageReady] Overlay "${overlayName}" cleared + ${delayMs}ms. Page is now revealed.`)
    }
    triggerReveal()
  }, delayMs)
}

/**
 * Double rAF check for initial load when no overlay runs
 */
if (typeof window !== 'undefined') {
  // Wait double rAF to check if any overlay mounted and claimed active
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // If no overlay claimed active within 2 frames, resolve right after first paint
      if (!isOverlayActive && !isPageRevealed) {
        triggerReveal()
      }
    })
  })
}

/**
 * Exposing whenRevealed(): Promise<void>
 */
export function whenRevealed(): Promise<void> {
  if (isPageRevealed) {
    return Promise.resolve()
  }
  initPromise()
  return revealPromise!
}

/**
 * React hook: usePageRevealed()
 */
export function usePageRevealed(): boolean {
  const [revealed, setRevealed] = useState(() => isPageRevealed)

  useEffect(() => {
    if (isPageRevealed) {
      setRevealed(true)
      return
    }

    const onReveal = () => setRevealed(true)
    listeners.add(onReveal)
    return () => {
      listeners.delete(onReveal)
    }
  }, [])

  return revealed
}

export function getCurtainClearedTimestamp(): number {
  return curtainClearedTimestamp
}

interface TimingRecord {
  name: string
  animStart: number
  cleared: number
  diff: number
}

declare global {
  interface Window {
    __OFFSCRIPT_TIMINGS__?: TimingRecord[]
  }
}

/**
 * Verification logging helper (dev only console.debug, records on window for testing)
 */
export function logAnimationStart(name: string) {
  const animStart = performance.now()
  const cleared = curtainClearedTimestamp
  const diff = cleared > 0 ? animStart - cleared : 0

  if (typeof window !== 'undefined') {
    if (!window.__OFFSCRIPT_TIMINGS__) {
      window.__OFFSCRIPT_TIMINGS__ = []
    }
    window.__OFFSCRIPT_TIMINGS__.push({ name, animStart, cleared, diff })
  }

  if (import.meta.env.DEV) {
    console.debug(
      `[EntryAnimation] ${name} started at ${animStart.toFixed(1)}ms (curtain cleared at ${cleared.toFixed(1)}ms, diff: ${diff.toFixed(1)}ms >= 0)`
    )
  }
}
