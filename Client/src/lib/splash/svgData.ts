import { generateSplashShape, type SplashShapeData } from './geometry'
import { splashConfig } from './config'

export interface SplashComposition {
  width: number
  height: number
  big: SplashShapeData
  medium1: SplashShapeData
  medium2: SplashShapeData
  small: SplashShapeData
}

/**
 * Generate the deterministic hero splash composition (1 big + 2 medium + 1 small)
 * fitted inside a coordinate system of [0, 0, width, height] (default 560x560).
 */
export function createHeroComposition(width = 560, height = 560): SplashComposition {
  const seeds = splashConfig.seeds

  // 1. Big Splash: ~60% stage width, slightly off-center (cx ~ 0.48, cy ~ 0.48)
  const bigRadius = width * 0.28
  const big = generateSplashShape(
    width * 0.48,
    height * 0.48,
    bigRadius,
    seeds.big,
    true // isBig = true (diamond cutout, drips, larger crown)
  )

  // 2. Medium Splash 1: bottom-left quadrant
  const med1Radius = width * 0.135
  const medium1 = generateSplashShape(
    width * 0.20,
    height * 0.76,
    med1Radius,
    seeds.medium1,
    false
  )

  // 3. Medium Splash 2: top-right quadrant
  const med2Radius = width * 0.125
  const medium2 = generateSplashShape(
    width * 0.80,
    height * 0.24,
    med2Radius,
    seeds.medium2,
    false
  )

  // 4. Small Splash: bottom-right quadrant
  const smallRadius = width * 0.085
  const small = generateSplashShape(
    width * 0.82,
    height * 0.74,
    smallRadius,
    seeds.small,
    false
  )

  return { width, height, big, medium1, medium2, small }
}

/**
 * Render a SplashShapeData into static SVG elements
 */
function renderSplashToSvg(splash: SplashShapeData, idSuffix: string): string {
  const cfg = splashConfig
  let out = ''

  // Clip path for inner shadow and crescent highlight
  const clipId = `splash-clip-${idSuffix}`
  out += `<clipPath id="${clipId}"><path d="${splash.pathD}" /></clipPath>`

  // Echo ring outline (20% opacity Volt)
  out += `<path d="${splash.echoPathD}" fill="none" stroke="${cfg.palette.volt}" stroke-width="${cfg.styling.echoRingLineWidth}" opacity="${cfg.styling.echoRingOpacity}" />`

  // Main Volt fill
  out += `<path d="${splash.pathD}" fill="${cfg.palette.volt}" />`

  // Top-left crescent highlight (clipped to shape, Bone at 28%)
  const hl = splash.crescentHighlight
  out += `<ellipse cx="${hl.cx.toFixed(1)}" cy="${hl.cy.toFixed(1)}" rx="${hl.rx.toFixed(1)}" ry="${hl.ry.toFixed(1)}" transform="rotate(-45 ${hl.cx.toFixed(1)} ${hl.cy.toFixed(1)})" fill="${cfg.palette.bone}" opacity="${cfg.styling.crescentHighlightOpacity}" clip-path="url(#${clipId})" />`

  // Bottom-right inner shadow (clipped to shape, Ink at 22%)
  const is = splash.innerShadow
  out += `<ellipse cx="${is.cx.toFixed(1)}" cy="${is.cy.toFixed(1)}" rx="${is.rx.toFixed(1)}" ry="${is.ry.toFixed(1)}" transform="rotate(-45 ${is.cx.toFixed(1)} ${is.cy.toFixed(1)})" fill="${cfg.palette.ink}" opacity="${cfg.styling.innerShadowOpacity}" clip-path="url(#${clipId})" />`

  // Specular wet dot (Bone at 60%)
  const dot = splash.specularDot
  out += `<circle cx="${dot.x.toFixed(1)}" cy="${dot.y.toFixed(1)}" r="${dot.radius.toFixed(1)}" fill="${cfg.palette.bone}" opacity="${cfg.styling.specularDotOpacity}" />`

  // Detached crown droplets
  for (const t of splash.tendrils) {
    if (t.hasDetachedDroplet && t.detachedDroplet) {
      out += `<circle cx="${t.detachedDroplet.x.toFixed(1)}" cy="${t.detachedDroplet.y.toFixed(1)}" r="${t.detachedDroplet.radius.toFixed(1)}" fill="${cfg.palette.volt}" />`
    }
  }

  // Brand diamond cutout in center (BIG splash only)
  if (splash.isBig && splash.diamondCutout) {
    const dw = splash.diamondCutout.width
    const dh = splash.diamondCutout.height
    out += `<polygon points="${splash.cx.toFixed(1)},${(splash.cy - dh / 2).toFixed(1)} ${(splash.cx + dw / 2).toFixed(1)},${splash.cy.toFixed(1)} ${splash.cx.toFixed(1)},${(splash.cy + dh / 2).toFixed(1)} ${(splash.cx - dw / 2).toFixed(1)},${splash.cy.toFixed(1)}" fill="${cfg.palette.ink}" />`
  }

  // Viscous drips (for big splash)
  for (const drip of splash.drips) {
    const endX = drip.startX + Math.cos(drip.angle) * (drip.targetLength * 0.65)
    const endY = drip.startY + Math.sin(drip.angle) * drip.targetLength
    // Drip stem
    out += `<line x1="${drip.startX.toFixed(1)}" y1="${drip.startY.toFixed(1)}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${cfg.palette.volt}" stroke-width="${(drip.headRadius * 0.9).toFixed(1)}" stroke-linecap="round" />`
    // Teardrop bead
    out += `<circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="${drip.headRadius.toFixed(1)}" fill="${cfg.palette.volt}" />`
  }

  // Satellite droplets (settled positions)
  for (const drop of splash.satelliteDroplets) {
    out += `<circle cx="${drop.targetX.toFixed(1)}" cy="${drop.targetY.toFixed(1)}" r="${drop.radius.toFixed(1)}" fill="${cfg.palette.volt}" />`
  }

  return out
}

/**
 * Generate the complete static SVG string for the hero composition.
 * Used for mobile, lite mode, and pre-engine static preview.
 */
export function getHeroStaticSvgMarkup(viewBoxWidth = 560, viewBoxHeight = 560): string {
  const comp = createHeroComposition(viewBoxWidth, viewBoxHeight)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" class="w-full h-full select-none pointer-events-none" aria-hidden="true">`
  svg += `<defs>`

  // Render elements in defs/body
  const bigSvg = renderSplashToSvg(comp.big, 'big')
  const med1Svg = renderSplashToSvg(comp.medium1, 'med1')
  const med2Svg = renderSplashToSvg(comp.medium2, 'med2')
  const smallSvg = renderSplashToSvg(comp.small, 'small')

  svg += `</defs>`
  svg += `<g>${med1Svg}${med2Svg}${smallSvg}${bigSvg}</g>`
  svg += `</svg>`

  return svg
}
