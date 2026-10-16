import { PRNG } from './prng'
import { splashConfig } from './config'

export interface Point {
  x: number
  y: number
}

export interface BezierSegment {
  p0: Point
  cp1: Point
  cp2: Point
  p1: Point
}

export interface Tendril {
  index: number
  angle: number
  tipPoint: Point
  baseRadius: number
  tipRadius: number
  hasDetachedDroplet: boolean
  detachedDroplet?: {
    x: number
    y: number
    radius: number
  }
}

export interface Drip {
  angle: number
  startX: number
  startY: number
  targetLength: number
  headRadius: number
  currentLength: number
  isComplete: boolean
}

export interface SatelliteDroplet {
  x: number
  y: number
  originX: number
  originY: number
  targetX: number
  targetY: number
  radius: number
  vx: number
  vy: number
  speed: number
  angle: number
  stretch: number
  progress: number
  isLanded: boolean
  alpha: number
}

export interface SplashShapeData {
  cx: number
  cy: number
  baseRadius: number
  isBig: boolean
  points: Point[]
  pathD: string
  echoPathD: string
  tendrils: Tendril[]
  drips: Drip[]
  satelliteDroplets: SatelliteDroplet[]
  specularDot: { x: number; y: number; radius: number }
  diamondCutout?: { width: number; height: number }
  crescentHighlight: {
    cx: number
    cy: number
    rx: number
    ry: number
    rotation: number
  }
  innerShadow: {
    cx: number
    cy: number
    rx: number
    ry: number
    rotation: number
  }
}

/**
 * Convert a set of closed polygon points into smooth cubic Bézier segments
 * using Catmull-Rom to cubic Bézier spline interpolation.
 */
export function pointsToBeziers(pts: Point[]): BezierSegment[] {
  const n = pts.length
  if (n < 3) return []
  const segments: BezierSegment[] = []

  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]

    // Catmull-Rom tension = 0.5 (standard smooth curve)
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    segments.push({
      p0: p1,
      cp1: { x: cp1x, y: cp1y },
      cp2: { x: cp2x, y: cp2y },
      p1: p2,
    })
  }

  return segments
}

/**
 * Generate an SVG path 'd' string from cubic Bézier segments
 */
export function beziersToPathD(segments: BezierSegment[]): string {
  if (segments.length === 0) return ''
  let d = `M ${segments[0].p0.x.toFixed(2)} ${segments[0].p0.y.toFixed(2)}`
  for (const seg of segments) {
    d += ` C ${seg.cp1.x.toFixed(2)} ${seg.cp1.y.toFixed(2)}, ${seg.cp2.x.toFixed(2)} ${seg.cp2.y.toFixed(2)}, ${seg.p1.x.toFixed(2)} ${seg.p1.y.toFixed(2)}`
  }
  d += ' Z'
  return d
}

/**
 * Generate a procedural, seeded paint splash with tendrils, crown droplets,
 * wet look highlights, inner shadow, and satellite droplets.
 */
export function generateSplashShape(
  cx: number,
  cy: number,
  baseRadius: number,
  seed: number,
  isBig = false,
  customTendrilCount?: number,
  customDropletCount?: number
): SplashShapeData {
  const rng = new PRNG(seed)
  const cfg = splashConfig

  // 1. Determine number of base points (16 to 24)
  const basePointCount = rng.intRange(cfg.shape.minOutlinePoints, cfg.shape.maxOutlinePoints)
  const tendrilCount = customTendrilCount ?? rng.intRange(cfg.shape.minTendrils, cfg.shape.maxTendrils)

  // Choose tendril positions evenly distributed with random angular jitter
  const tendrilIndices = new Set<number>()
  const step = basePointCount / tendrilCount
  for (let t = 0; t < tendrilCount; t++) {
    const idealIdx = Math.floor(t * step + rng.range(-0.35, 0.35) * step)
    tendrilIndices.add((idealIdx + basePointCount) % basePointCount)
  }

  // Harmonic wobble phase and frequencies
  const phi1 = rng.range(0, Math.PI * 2)
  const phi2 = rng.range(0, Math.PI * 2)
  const wobbleAmp = cfg.shape.wobbleAmplitude

  const pts: Point[] = []
  const tendrils: Tendril[] = []

  for (let i = 0; i < basePointCount; i++) {
    const baseAngle = (i / basePointCount) * Math.PI * 2
    const angleJitter = rng.range(-0.06, 0.06)
    const angle = baseAngle + angleJitter

    // Low-frequency harmonic wobble
    const wobble =
      1 +
      wobbleAmp * (Math.sin(2 * angle + phi1) * 0.65 + Math.cos(3 * angle + phi2) * 0.35) +
      rng.range(-0.04, 0.04)
    const currentBaseRadius = baseRadius * wobble

    if (tendrilIndices.has(i)) {
      // Create a narrow tapered spike: Pinching left and right shoulders
      const shoulderDelta = rng.range(0.06, 0.10) // narrow pinch
      const shoulderRadius = currentBaseRadius * rng.range(0.92, 1.05)

      // Left shoulder
      const leftAngle = angle - shoulderDelta
      pts.push({
        x: cx + Math.cos(leftAngle) * shoulderRadius,
        y: cy + Math.sin(leftAngle) * shoulderRadius,
      })

      // Tendril peak (1.5x to 2.3x base radius) with rounded tip
      const tipMult = rng.range(cfg.shape.tendrilRadiusMin, cfg.shape.tendrilRadiusMax)
      const tipRadius = currentBaseRadius * tipMult
      const tipPoint = {
        x: cx + Math.cos(angle) * tipRadius,
        y: cy + Math.sin(angle) * tipRadius,
      }
      pts.push(tipPoint)

      // Detached droplet (crown splash look on ~half of tendrils)
      const hasDetached = rng.chance(cfg.shape.tendrilDetachedChance)
      let detachedDroplet: Tendril['detachedDroplet']
      if (hasDetached) {
        const dropDist = tipRadius * rng.range(1.12, 1.25)
        detachedDroplet = {
          x: cx + Math.cos(angle) * dropDist,
          y: cy + Math.sin(angle) * dropDist,
          radius: rng.range(2.5, 5.5),
        }
      }

      tendrils.push({
        index: pts.length - 1,
        angle,
        tipPoint,
        baseRadius: currentBaseRadius,
        tipRadius,
        hasDetachedDroplet: hasDetached,
        detachedDroplet,
      })

      // Right shoulder
      const rightAngle = angle + shoulderDelta
      pts.push({
        x: cx + Math.cos(rightAngle) * shoulderRadius,
        y: cy + Math.sin(rightAngle) * shoulderRadius,
      })
    } else {
      pts.push({
        x: cx + Math.cos(angle) * currentBaseRadius,
        y: cy + Math.sin(angle) * currentBaseRadius,
      })
    }
  }

  // Generate smooth cubic Bézier segments for the main shape
  const segments = pointsToBeziers(pts)
  const pathD = beziersToPathD(segments)

  // Generate slightly larger echo ring path
  const echoPts = pts.map((p) => ({
    x: cx + (p.x - cx) * cfg.styling.echoRingScale,
    y: cy + (p.y - cy) * cfg.styling.echoRingScale,
  }))
  const echoSegments = pointsToBeziers(echoPts)
  const echoPathD = beziersToPathD(echoSegments)

  // Specular wet dot at top-left (~ -135 degrees)
  const specularAngle = -Math.PI * 0.72 + rng.range(-0.15, 0.15)
  const specularDist = baseRadius * rng.range(0.42, 0.58)
  const specularDot = {
    x: cx + Math.cos(specularAngle) * specularDist,
    y: cy + Math.sin(specularAngle) * specularDist,
    radius: rng.range(3, 5.5),
  }

  // Crescent highlight geometry (top-left)
  const crescentHighlight = {
    cx: cx - baseRadius * 0.22,
    cy: cy - baseRadius * 0.22,
    rx: baseRadius * 0.88,
    ry: baseRadius * 0.55,
    rotation: -Math.PI / 4,
  }

  // Inner shadow geometry (bottom-right)
  const innerShadow = {
    cx: cx + baseRadius * 0.26,
    cy: cy + baseRadius * 0.26,
    rx: baseRadius * 0.88,
    ry: baseRadius * 0.60,
    rotation: -Math.PI / 4,
  }

  // Brand diamond cutout in center (BIG splash only)
  let diamondCutout: SplashShapeData['diamondCutout']
  if (isBig) {
    const size = baseRadius * cfg.shape.diamondScale
    diamondCutout = { width: size * 2, height: size * 2 }
  }

  // Viscous drips from bottom edge of big splash
  const drips: Drip[] = []
  if (isBig) {
    const dripCount = rng.intRange(cfg.drips.minCount, cfg.drips.maxCount)
    for (let d = 0; d < dripCount; d++) {
      const angleDeg = rng.range(cfg.drips.minAngleDeg, cfg.drips.maxAngleDeg)
      const angleRad = (angleDeg * Math.PI) / 180
      const startX = cx + Math.cos(angleRad) * (baseRadius * 0.92)
      const startY = cy + Math.sin(angleRad) * (baseRadius * 0.92)
      const targetLength = rng.range(cfg.drips.minLength, cfg.drips.maxLength)
      const headRadius = rng.range(cfg.drips.headRadiusMin, cfg.drips.headRadiusMax)

      drips.push({
        angle: angleRad,
        startX,
        startY,
        targetLength,
        headRadius,
        currentLength: 0,
        isComplete: false,
      })
    }
  }

  // Satellite droplets (14 to 24 for big, 8 to 14 for medium)
  const dropletCount =
    customDropletCount ??
    (isBig
      ? rng.intRange(16, 24)
      : rng.intRange(cfg.droplets.countMedium, cfg.droplets.countMedium + 4))

  const satelliteDroplets: SatelliteDroplet[] = []
  for (let s = 0; s < dropletCount; s++) {
    // Power law distribution: many tiny droplets, few large ones
    const radius = rng.powerLaw(cfg.droplets.minSize, cfg.droplets.maxSize, cfg.droplets.powerLawExponent)
    // Launch angle randomly around 360 degrees
    const launchAngle = rng.range(0, Math.PI * 2)

    // Smaller droplets fly faster and farther
    const sizeFactor = 1 - (radius - cfg.droplets.minSize) / (cfg.droplets.maxSize - cfg.droplets.minSize)
    const flightDist = baseRadius * rng.range(1.2, 1.8) + sizeFactor * baseRadius * rng.range(0.4, 0.9)

    const targetX = cx + Math.cos(launchAngle) * flightDist
    const targetY = cy + Math.sin(launchAngle) * flightDist

    const speed = rng.range(cfg.droplets.launchVelocityMin, cfg.droplets.launchVelocityMax) * (0.7 + 0.6 * sizeFactor)
    const vx = Math.cos(launchAngle) * speed
    const vy = Math.sin(launchAngle) * speed

    satelliteDroplets.push({
      x: cx,
      y: cy,
      originX: cx,
      originY: cy,
      targetX,
      targetY,
      radius,
      vx,
      vy,
      speed,
      angle: launchAngle,
      stretch: 1,
      progress: 0,
      isLanded: false,
      alpha: 1,
    })
  }

  return {
    cx,
    cy,
    baseRadius,
    isBig,
    points: pts,
    pathD,
    echoPathD,
    tendrils,
    drips,
    satelliteDroplets,
    specularDot,
    diamondCutout,
    crescentHighlight,
    innerShadow,
  }
}
