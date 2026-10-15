import { MOTION } from './motion'

/**
 * Universal Shared Scroll Reveal Utility
 * Uses a SINGLE IntersectionObserver instance across all routes (landing, /events, event detail).
 *
 * Techniques:
 * - 'heading': Masked lines rising (0.8s)
 * - 'paragraph': 28px rise with opacity (0.7s)
 * - 'image' / 'banner': Clip-path wipe (1.0s)
 * - 'card': Rise with slight rotation settling to 0 (0.8s, staggered 80ms)
 * - 'stat': Stats count-up & rise (1.6s)
 * - 'stamp': Stamp in with overshoot (0.6s)
 * - 'rail': Slide in from side (0.8s)
 * - 'divider': Draw in scaleX (0.8s)
 *
 * Guardrails:
 * - First viewport exception: Elements inside the first viewport at load do not get hidden state (LCP safe).
 * - Fires when element top crosses 88% of viewport height (rootMargin: '0px 0px -12% 0px', threshold: 0.01).
 * - Once only. Unobserves immediately upon trigger.
 * - Transform, opacity, and clip-path only. No scroll hijacking.
 * - Lite mode and reduced motion: CSS-only fade with 16px translate on entering viewport.
 */

export type RevealTechnique =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'banner'
  | 'card'
  | 'stat'
  | 'stamp'
  | 'rail'
  | 'divider'
  // Compatibility aliases
  | 'clip-wipe'
  | 'masked-heading'
  | 'card-rise'
  | 'stamp-in'
  | 'count-up'
  | 'slide-in'

let sharedObserver: IntersectionObserver | null = null
const observedElements = new WeakSet<Element>()

export function normalizeTechnique(type: string): string {
  switch (type) {
    case 'clip-wipe':
      return 'image'
    case 'masked-heading':
      return 'heading'
    case 'card-rise':
      return 'card'
    case 'stamp-in':
      return 'stamp'
    case 'count-up':
      return 'stat'
    case 'slide-in':
      return 'rail'
    default:
      return type
  }
}

function getSharedObserver(): IntersectionObserver | null {
  if (typeof window === 'undefined') return null
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement
            target.classList.add('is-revealed')

            // Dispatch count-up event if element is a stat
            if (target.dataset.reveal === 'stat' || target.dataset.reveal === 'count-up') {
              target.dispatchEvent(new CustomEvent('reveal-count-up'))
            }

            sharedObserver?.unobserve(target)
          }
        })
      },
      {
        // Element top crosses 88% of viewport height
        rootMargin: MOTION.scrollReveal.rootMargin, // '0px 0px -12% 0px'
        threshold: MOTION.scrollReveal.threshold, // 0.01
      }
    )
  }
  return sharedObserver
}

/**
 * Register an element for scroll reveal.
 * Handles first viewport exception immediately so hero/LCP elements are never hidden.
 */
export function registerReveal(
  element: HTMLElement | null,
  type: RevealTechnique = 'card'
): () => void {
  if (!element || typeof window === 'undefined') return () => {}

  const normalized = normalizeTechnique(type)
  element.dataset.reveal = normalized

  // EXCEPTION FOR FIRST VIEWPORT:
  // If element is already within first viewport at load, it must NEVER be hidden before paint!
  const isFirstViewport =
    typeof window !== 'undefined' &&
    window.scrollY < 50 &&
    element.getBoundingClientRect().top < window.innerHeight

  if (isFirstViewport || element.closest('#hero') || element.hasAttribute('data-in-hero')) {
    element.setAttribute('data-in-hero', 'true')
    element.classList.add('is-revealed')
    return () => {}
  }

  const observer = getSharedObserver()
  if (observer && !observedElements.has(element)) {
    observedElements.add(element)
    observer.observe(element)
  }

  return () => {
    sharedObserver?.unobserve(element)
  }
}

/**
 * Scan DOM and register all data-reveal elements.
 */
export function scanAndInitReveals(root: HTMLElement | Document = document) {
  if (typeof window === 'undefined') return

  const elements = root.querySelectorAll<HTMLElement>('[data-reveal]')
  let cardBatchIndex = 0

  elements.forEach((el) => {
    // Exclude flip cards on event detail page (they have their own drop sequence)
    if (el.closest('.flip-card-item') || el.classList.contains('flip-card-item')) {
      return
    }
    // Exclude Why OFFSCRIPT hover content (only section container is revealed)
    if (el.closest('.why-hover-content')) {
      return
    }

    const type = (el.dataset.reveal || 'card') as RevealTechnique
    const norm = normalizeTechnique(type)

    if (norm === 'card') {
      el.style.setProperty('--reveal-index', String(cardBatchIndex % 4))
      cardBatchIndex++
    }

    registerReveal(el, type)
  })
}

// Auto-scan on DOM ready and route change
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scanAndInitReveals(), { once: true })
  } else {
    scanAndInitReveals()
  }

  // Also re-scan on dynamic navigation
  window.addEventListener('offscript:shutter-reveal-60', () => {
    setTimeout(() => scanAndInitReveals(), 100)
  })
}
