/**
 * Central Configuration for Hero Procedural Paint Splash
 *
 * All tunables live in this single exported object for easy one-line adjustments.
 * Timings respect MOTION_SCALE from src/lib/motion.ts.
 */
import { scaleDuration, scaleMs } from '../motion'

export const PALETTE = {
  ink: '#111210',
  bone: '#EDEBE0',
  volt: '#D4FF3F',
} as const

export const splashConfig = {
  // Brand colors
  palette: PALETTE,

  // Seeds for deterministic hero composition
  seeds: {
    big: 42026,
    medium1: 1337,
    medium2: 80085,
    small: 99991,
  },

  // Base geometry tunables
  shape: {
    // Number of base points around the perimeter
    minOutlinePoints: 16,
    maxOutlinePoints: 24,
    // Wobble amplitude (low frequency radius noise)
    wobbleAmplitude: 0.16,
    // Tendrils (narrow tapered spikes)
    minTendrils: 6,
    maxTendrils: 10,
    tendrilRadiusMin: 1.5, // 1.5x to 2.3x base radius
    tendrilRadiusMax: 2.3,
    tendrilDetachedChance: 0.55, // ~half have detached droplets
    // Big splash central brand diamond cutout
    diamondScale: 0.14, // Relative to base radius
  },

  // Styling & wet look opacities
  styling: {
    voltFill: PALETTE.volt,
    crescentHighlightOpacity: 0.28, // Bone at 22-30% opacity
    crescentHighlightColor: PALETTE.bone,
    innerShadowOpacity: 0.22, // Ink at 18-25% opacity
    innerShadowColor: PALETTE.ink,
    specularDotOpacity: 0.60, // Bone at 60%
    specularDotColor: PALETTE.bone,
    echoRingOpacity: 0.20, // Volt at 20%
    echoRingColor: PALETTE.volt,
    echoRingScale: 1.18,
    echoRingLineWidth: 2,
  },

  // Satellite droplets
  droplets: {
    countBig: 20, // 14 to 24 for big splash
    countMedium: 9,
    countSmall: 5,
    minSize: 2, // px
    maxSize: 18, // px
    powerLawExponent: 2.8, // Skews heavily towards smaller droplets
    launchVelocityMin: 180, // px/s
    launchVelocityMax: 420, // px/s
    gravity: 520, // px/s^2 downwards
    stretchFactor: 0.0035, // Velocity stretch multiplier
    squashFactor: 0.45, // Flattened ratio on impact
  },

  // Viscous drips from bottom edge of big splash
  drips: {
    minCount: 2,
    maxCount: 4,
    minAngleDeg: 60, // Underneath big splash
    maxAngleDeg: 120,
    minLength: 35, // px
    maxLength: 95, // px
    headRadiusMin: 3.5,
    headRadiusMax: 7,
    elongationDuration: scaleDuration(0.85), // s
    optionalBeadInterval: scaleMs(10000), // 10s while in view
  },

  // Entry sequence timeline (durations in seconds scaled by MOTION_SCALE)
  entry: {
    totalDuration: scaleDuration(1.8),
    dropFallDuration: scaleDuration(0.35),
    impactExpandDuration: scaleDuration(0.14),
    impactSettleDuration: scaleDuration(0.35),
    tendrilStagger: scaleDuration(0.02),
    tendrilShootDuration: scaleDuration(0.20),
    echoExpandDuration: scaleDuration(0.50),
    stageShakeDuration: scaleDuration(0.12),
    stageShakeAmplitude: 3, // px
    mediumImpactDelay1: scaleDuration(0.18),
    mediumImpactDelay2: scaleDuration(0.34),
    smallImpactDelay: scaleDuration(0.50),
    dripsStartDelay: scaleDuration(0.90),
  },

  // Desktop click-to-splash limits & physics
  clickSplash: {
    minRadius: 40,
    maxRadius: 90,
    minDroplets: 8,
    maxDroplets: 14,
    minTendrils: 5,
    maxTendrils: 8,
    maxLiveSplashes: 4,
    fadeDuration: scaleDuration(0.6), // s
    lifetime: scaleDuration(6.0), // s
    cooldownMs: 120, // ms
    maxParticles: 120,
    wobbleRadius: 220, // px distance to trigger big splash wobble
    wobbleDuration: scaleDuration(0.4),
    wobbleScale: 0.02, // +-2%
  },

  // Mobile light click/tap mode
  mobile: {
    maxDroplets: 12,
    minTendrils: 4,
    maxTendrils: 6,
    maxLiveSplashes: 2,
    maxParticles: 45,
    dprCap: 1.0,
  },

  // Engine performance constraints
  performance: {
    desktopDprCap: 1.5,
    idleFps: 0, // Sleeps completely when idle
    activeFpsTarget: 60,
    resizeDebounceMs: 150,
  },
}
