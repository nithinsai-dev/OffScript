import { useRef, useEffect } from 'react'
import { MOTION } from './motion'

export type RevealTechnique =
  | 'eyebrow'
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'banner'
  | 'card'
  | 'stat'
  | 'stamp'
  | 'rail'
  | 'slide'
  | 'divider'
  // Compatibility aliases
  | 'clip-wipe'
  | 'masked-heading'
  | 'card-rise'
  | 'stamp-in'
  | 'count-up'
  | 'slide-in'

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

// Track elements currently waiting to cross the 88% viewport trigger line
const pendingElements = new Set<HTMLElement>()
const observedElements = new WeakSet<HTMLElement>()

let sharedObserver: IntersectionObserver | null = null
let mutationObserver: MutationObserver | null = null
let isInitialized = false
let isRafPending = false
let refreshTimer: ReturnType<typeof setTimeout> | null = null

/**
 * Debounced ScrollTrigger refresh after layout, fonts, routes, or images settle
 */
export function debouncedScrollTriggerRefresh() {
  if (typeof window === 'undefined') return
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(async () => {
    try {
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      ScrollTrigger.refresh()
    } catch {
      // Ignore if ScrollTrigger is not loaded
    }
  }, 120)
}

/**
 * Safely reveals an element: adds .is-revealed class, fires custom events, and unobserves.
 */
export function revealElement(el: HTMLElement) {
  if (!el || el.classList.contains('is-revealed')) {
    pendingElements.delete(el)
    return
  }

  el.classList.add('is-revealed')
  pendingElements.delete(el)

  if (sharedObserver && observedElements.has(el)) {
    try {
      sharedObserver.unobserve(el)
    } catch {
      // Ignore
    }
  }

  // Dispatch count-up event if element is a stat/counter
  if (el.dataset.reveal === 'stat' || el.dataset.reveal === 'count-up') {
    el.dispatchEvent(new CustomEvent('reveal-count-up'))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('reveal-count-up'))
    }
  }
}

/**
 * Independent fallback: checks all still-pending elements against the 88% viewport line.
 * Works regardless of IntersectionObserver or Lenis smooth scrolling.
 */
export function checkPendingElements() {
  if (typeof window === 'undefined') return
  const triggerLine = window.innerHeight * 0.88

  pendingElements.forEach((el) => {
    if (!el.isConnected) {
      pendingElements.delete(el)
      return
    }

    if (el.classList.contains('is-revealed')) {
      pendingElements.delete(el)
      return
    }

    const rect = el.getBoundingClientRect()
    // Element's top crosses 88% of viewport height, or user has already scrolled past it
    if (rect.top <= triggerLine || rect.bottom <= 0) {
      revealElement(el)
      return
    }

    // 3s In-view Failsafe: if element has entered the viewport (rect.top <= window.innerHeight),
    // ensure it is revealed within 3 seconds even if trigger fails.
    if (rect.top <= window.innerHeight && !el.dataset.inViewTimer) {
      el.dataset.inViewTimer = 'true'
      setTimeout(() => {
        if (!el.classList.contains('is-revealed')) {
          revealElement(el)
        }
      }, 3000)
    }
  })
}

/**
 * rAF-throttled scroll / resize check
 */
function requestPendingCheck() {
  if (isRafPending) return
  isRafPending = true
  requestAnimationFrame(() => {
    isRafPending = false
    checkPendingElements()
  })
}

/**
 * Register an element for scroll reveal.
 * Handles the immediate-reveal rule: elements already within or above the viewport
 * reveal synchronously with no hidden state!
 */
export function registerReveal(
  element: HTMLElement | null,
  type: RevealTechnique = 'card'
): () => void {
  if (!element || typeof window === 'undefined') return () => {}

  // Exclude flip cards on event detail page (they have their own drop sequence)
  if (element.closest('.flip-card-item') || element.classList.contains('flip-card-item')) {
    return () => {}
  }
  // Exclude Why OFFSCRIPT hover content (only section container is revealed)
  if (element.closest('.why-hover-content')) {
    return () => {}
  }

  const normalized = normalizeTechnique(type)
  element.dataset.reveal = normalized

  // If already revealed or in hero, mark revealed immediately and return
  if (
    element.classList.contains('is-revealed') ||
    element.closest('#hero') ||
    element.hasAttribute('data-in-hero')
  ) {
    element.setAttribute('data-in-hero', 'true')
    revealElement(element)
    return () => {}
  }

  // EXCEPTION FOR INITIAL VIEWPORT: Check if ALREADY inside viewport or above scroll position
  const rect = element.getBoundingClientRect()

  // If already inside viewport (top < window.innerHeight) or scrolled past (bottom <= 0), reveal immediately!
  if (rect.top < window.innerHeight || rect.bottom <= 0) {
    revealElement(element)
    return () => {}
  }

  // Otherwise, queue for scroll reveal
  pendingElements.add(element)

  if (sharedObserver && !observedElements.has(element)) {
    try {
      observedElements.add(element)
      sharedObserver.observe(element)
    } catch {
      // Fallback: pendingElements will be checked on scroll/resize
    }
  }

  return () => {
    pendingElements.delete(element)
    if (sharedObserver) {
      try {
        sharedObserver.unobserve(element)
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * React hook to register an element for scroll reveal upon mount.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  type: RevealTechnique = 'card',
  delay?: number
) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (delay !== undefined && delay > 0) {
      el.style.transitionDelay = `${delay}s`
    }
    return registerReveal(el, type)
  }, [type, delay])

  return ref
}

/**
 * Scan DOM subtree for [data-reveal] elements and register them.
 */
export function scanAndInitReveals(root: HTMLElement | Document = document) {
  if (typeof window === 'undefined') return

  try {
    const elements = root.querySelectorAll<HTMLElement>('[data-reveal]')
    let cardBatchIndex = 0
    let railBatchIndex = 0

    elements.forEach((el) => {
      if (el.closest('.flip-card-item') || el.classList.contains('flip-card-item')) return
      if (el.closest('.why-hover-content')) return

      const type = (el.dataset.reveal || 'card') as RevealTechnique
      const norm = normalizeTechnique(type)

      if (norm === 'card') {
        el.style.setProperty('--reveal-index', String(cardBatchIndex % 12))
        cardBatchIndex++
      } else if (norm === 'rail') {
        el.style.setProperty('--slide-dir', railBatchIndex % 2 === 0 ? '1' : '-1')
        railBatchIndex++
      }

      registerReveal(el, type)
    })
  } catch (err) {
    console.warn('[OFFSCRIPT Reveal] Scan error:', err)
  }
}

/**
 * Initialize the universal Reveal System.
 * Ensures the hidden state is only activated under html.reveal-ready upon successful init.
 */
export function initRevealSystem() {
  if (typeof window === 'undefined' || isInitialized) return
  isInitialized = true

  try {
    // 1. Setup shared IntersectionObserver
    if ('IntersectionObserver' in window) {
      sharedObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              revealElement(entry.target as HTMLElement)
            }
          })
        },
        {
          rootMargin: MOTION.scrollReveal.rootMargin || '0px 0px -12% 0px',
          threshold: MOTION.scrollReveal.threshold || 0.01,
        }
      )
    }

    // 2. Setup persistent MutationObserver on document.body for dynamic/late-added nodes
    if ('MutationObserver' in window) {
      mutationObserver = new MutationObserver((mutations) => {
        let hasNewReveals = false
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement
              if (el.hasAttribute?.('data-reveal')) {
                registerReveal(el, (el.dataset.reveal as RevealTechnique) || 'card')
                hasNewReveals = true
              }
              const children = el.querySelectorAll?.<HTMLElement>('[data-reveal]')
              if (children && children.length > 0) {
                children.forEach((child) => {
                  registerReveal(child, (child.dataset.reveal as RevealTechnique) || 'card')
                })
                hasNewReveals = true
              }
            }
          })
        })
        if (hasNewReveals) {
          requestPendingCheck()
        }
      })

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    // 3. Independent fallback on scroll, resize, and Lenis scroll events
    window.addEventListener('scroll', requestPendingCheck, { passive: true })
    window.addEventListener('resize', requestPendingCheck, { passive: true })
    window.addEventListener('lenis:scroll', requestPendingCheck as EventListener, { passive: true })

    // 4. Initial DOM scan
    scanAndInitReveals()
    checkPendingElements()

    // 5. Successful init: mark html as reveal-ready so CSS hidden styles only activate now!
    document.documentElement.classList.add('reveal-ready')

    // 6. Global Failsafes:
    // Failsafe A: 2.5s after load, reveal everything within 2 viewports
    setTimeout(() => {
      const trigger = window.innerHeight * 2
      pendingElements.forEach((el) => {
        if (el.getBoundingClientRect().top <= trigger) {
          revealElement(el)
        }
      })
    }, 2500)

    // Failsafe B: 6.0s after load, reveal ALL pending elements unconditionally (last resort)
    setTimeout(() => {
      pendingElements.forEach((el) => revealElement(el))
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)').forEach(revealElement)
    }, 6000)

    // Window load check
    window.addEventListener(
      'load',
      () => {
        scanAndInitReveals()
        checkPendingElements()
        debouncedScrollTriggerRefresh()
      },
      { once: true }
    )

    // Fonts load check
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        checkPendingElements()
        debouncedScrollTriggerRefresh()
      })
    }

    // Route transitions
    window.addEventListener('offscript:shutter-reveal-60', () => {
      setTimeout(() => {
        scanAndInitReveals()
        checkPendingElements()
        debouncedScrollTriggerRefresh()
      }, 50)
    })
  } catch (err) {
    console.warn('[OFFSCRIPT Reveal] Init failed, running in fallback mode:', err)
    // Remove reveal-ready so content is 100% visible
    document.documentElement.classList.remove('reveal-ready')
    document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
      el.classList.add('is-revealed')
    })
  }
}

/**
 * Call on route change to scan new route DOM and reveal in-view content immediately.
 * Also initiates the 2.5s and 6.0s failsafes for the newly mounted route.
 */
export function handleRouteChangeReveals() {
  if (typeof window === 'undefined') return

  // Immediate check
  scanAndInitReveals()
  checkPendingElements()

  // Post-render checks
  setTimeout(() => {
    scanAndInitReveals()
    checkPendingElements()
  }, 100)

  setTimeout(() => {
    scanAndInitReveals()
    checkPendingElements()
    debouncedScrollTriggerRefresh()
  }, 300)

  // Route Failsafe 1: 2.5s after route mounts, reveal everything within 2 viewports
  setTimeout(() => {
    const trigger = window.innerHeight * 2
    pendingElements.forEach((el) => {
      if (el.getBoundingClientRect().top <= trigger) {
        revealElement(el)
      }
    })
    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)').forEach((el) => {
      if (el.getBoundingClientRect().top <= trigger) {
        revealElement(el)
      }
    })
  }, 2500)

  // Route Failsafe 2: 6.0s after route mounts, reveal EVERYTHING unconditionally (last resort)
  setTimeout(() => {
    pendingElements.forEach((el) => revealElement(el))
    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)').forEach(revealElement)
  }, 6000)
}

// Auto-run initialization on load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initRevealSystem(), { once: true })
  } else {
    initRevealSystem()
  }
}
