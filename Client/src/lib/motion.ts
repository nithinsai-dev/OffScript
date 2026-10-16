/**
 * Central Motion & Timing Configuration
 *
 * Controls every duration, delay, stagger, and easing curve across OFFSCRIPT.
 * Tuning MOTION_SCALE proportionally scales all animation durations.
 */

export const MOTION_SCALE = 1

/**
 * Scale a duration (in seconds) by MOTION_SCALE.
 */
export function scaleDuration(durationSec: number): number {
  return Number((durationSec * MOTION_SCALE).toFixed(4))
}

/**
 * Scale a duration (in milliseconds) by MOTION_SCALE.
 */
export function scaleMs(durationMs: number): number {
  return Math.round(durationMs * MOTION_SCALE)
}

export const MOTION = {
  scale: MOTION_SCALE,

  // PART 1: Flip Cards (Event detail page)
  flip: {
    duration: scaleDuration(1.1), // 1.1s flip
    liftOvershoot: scaleDuration(0.25), // 0.25s settle overshoot
    ease: 'power3.inOut',
    cssEase: 'cubic-bezier(0.77, 0, 0.175, 1)',
    reducedFade: scaleDuration(0.15), // 150ms cross-fade
    lockFailsafe: 1.5, // 1.5s lock failsafe timeout
  },

  // PART 1B: Ticket Punch Surprise
  ticketPunch: {
    duration: scaleDuration(0.9), // 0.9s total chip arc & gravity fall
    chipArc: scaleDuration(0.38),
    gravityFall: scaleDuration(0.52),
    stampDuration: scaleDuration(0.15), // 0.15s stamp slam
    shakeDuration: scaleDuration(0.2), // 3px shake
  },

  // PART 1C: "Open Full" Panel FLIP Fly-out & Swallow Close
  openFullPanel: {
    chipArc: scaleDuration(0.5), // 0.5s GSAP arc
    panelUnfold: scaleDuration(0.55), // 0.55s unfold
    contentStagger: scaleDuration(0.05), // 0.05s content stagger
    totalOpen: scaleDuration(1.1), // ~1.1s total
    foldDown: scaleDuration(0.35), // 0.35s scaleY fold
    swallowBack: scaleDuration(0.25), // chip returns to card
    totalClose: scaleDuration(0.6), // 0.6s total close
    backdropFade: scaleDuration(0.3), // 0.3s backdrop fade
    liteFade: scaleDuration(0.3), // Lite mode 0.3s
  },

  // PART 2: Shiny Hover Sheen (Event detail cards, desktop)
  sheen: {
    duration: scaleDuration(1.4), // 1.4s sweep per hover entry
    ease: 'ease-in-out',
    cssEase: 'cubic-bezier(0.42, 0, 0.58, 1)',
    liftDuration: scaleDuration(0.3), // 300ms transition
    liftAmount: '-2px',
  },

  // PART 3: /events Scan Line
  scanLine: {
    sweepDuration: scaleDuration(2.8), // 2.8s sweep, linear middle, eased ends
    flakesCount: 6,
    flakeDriftMin: scaleDuration(0.9),
    flakeDriftMax: scaleDuration(1.4),
  },

  // PART 4: Route Curtain ("OFFSCRIPT" Shutter)
  curtain: {
    cover: scaleDuration(0.55), // Shutter rises from bottom
    wordmarkHold: scaleDuration(0.5), // OFFSCRIPT wordmark writes in at center
    reveal: scaleDuration(0.6), // Curtain lifts to reveal page
    total: scaleDuration(1.65), // ~1.65s total
    failsafe: 3.0, // 3s failsafe never blocks navigation
    liteCurtain: scaleDuration(0.5), // Lite mode shorter curtain
    reducedFade: scaleDuration(0.15), // Reduced motion short fade
  },

  // PART 5: Event Detail Entry ("Drop, Shatter, Become Cards")
  eventDetailEntry: {
    drop: scaleDuration(0.6), // Drop diamond falls
    impactSquash: scaleDuration(0.4), // Squash & impact burst
    shardsTravel: scaleDuration(0.9), // Shards travel with slight curve
    cardsPop: scaleDuration(0.7), // Cards pop in
    cardsStagger: scaleDuration(0.07), // 70ms stagger
    totalDuration: scaleDuration(2.6), // ~2.6s total at scale 1
    failsafeExtra: 1.5, // 1.5s extra for failsafe
    failsafe: scaleDuration(2.6) + 1.5, // total + 1.5s (~4.1s at scale 1)
    shutterRevealThreshold: 0.6, // Starts when shutter reveal is ~60% done
    inViewThreshold: 0.25, // Cards section is >= 25% in view
  },

  // PART 6: Event Detail Exit
  eventDetailExit: {
    cardsDuration: scaleDuration(0.45), // Cards fly toward viewer
    cardsScale: 1.15,
    cardsStagger: scaleDuration(0.025), // 25ms reverse stagger
    cardsEase: 'power2.in',
    curtainDelay: scaleDuration(0.3), // Curtain starts ~0.3s after exit begins
    failsafe: scaleDuration(0.8), // 0.8s max navigation timeout
    liteFade: scaleDuration(0.15), // 150ms fade
  },

  // PART 7: Universal Scroll Reveal
  scrollReveal: {
    triggerLine: '88%', // Element top crosses 88% of viewport height
    rootMargin: '0px 0px -12% 0px',
    threshold: 0.01,
    heading: scaleDuration(0.8), // Masked lines rising
    paragraph: scaleDuration(0.7), // 28px rise with opacity
    image: scaleDuration(1.0), // Clip-path wipe
    card: scaleDuration(0.8), // Rise with rotation settling
    cardStagger: scaleDuration(0.08), // 80ms stagger
    stat: scaleDuration(1.6), // Stats count up
    stamp: scaleDuration(0.6), // Stamp in with overshoot
    rail: scaleDuration(0.8), // Slide in from side
    divider: scaleDuration(0.8), // Draw in scaleX
    liteFade: scaleDuration(0.4), // CSS-only fade with 16px translate
  },

  // PART 8: Landing Hero Entry
  landingHero: {
    titleRiseTotal: scaleDuration(1.3), // Characters rise through mask in 1.3s
    titleCharStagger: scaleDuration(0.045), // ~45ms stagger per character
    titleEase: 'cubic-bezier(0.16, 1, 0.3, 1)', // power4.out
    navbarDrop: scaleDuration(0.2), // Navbar drops in (0.2s)
    typedStart: scaleDuration(0.6), // #beoffscript begins at ~0.6s
    supportingLine: scaleDuration(0.9), // Supporting line unmasks at ~0.9s
    buttonsRise: scaleDuration(1.1), // Two buttons rise with overshoot at ~1.1s
    statsStart: scaleDuration(1.3), // Stats count up from ~1.3s
    statsDuration: scaleDuration(1.8), // Over 1.8s
    stickerSpring: scaleDuration(1.5), // Floating sticker springs in at ~1.5s
    marqueeFade: scaleDuration(1.7), // Marquee fades in at ~1.7s
  },

  // PART 9: Registration Notice Dialog
  registrationDialog: {
    backdropFade: scaleDuration(0.25),
    dialogRise: scaleDuration(0.3),
    reducedFade: scaleDuration(0.15),
  },
} as const

// Export CSS Custom Properties sync function so CSS animations inherit MOTION_SCALE
export function syncMotionCssVariables() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--motion-scale', String(MOTION_SCALE))
  root.style.setProperty('--motion-sheen-duration', `${MOTION.sheen.duration}s`)
  root.style.setProperty('--motion-sheen-lift', `${MOTION.sheen.liftDuration}s`)
  root.style.setProperty('--motion-scan-duration', `${MOTION.scanLine.sweepDuration}s`)
  root.style.setProperty('--motion-curtain-cover', `${MOTION.curtain.cover}s`)
  root.style.setProperty('--motion-curtain-hold', `${MOTION.curtain.wordmarkHold}s`)
  root.style.setProperty('--motion-curtain-reveal', `${MOTION.curtain.reveal}s`)
  root.style.setProperty('--motion-title-rise', `${MOTION.landingHero.titleRiseTotal}s`)
  root.style.setProperty('--motion-title-stagger', `${MOTION.landingHero.titleCharStagger}s`)
}

// Auto-sync in browser
if (typeof document !== 'undefined') {
  syncMotionCssVariables()
}
