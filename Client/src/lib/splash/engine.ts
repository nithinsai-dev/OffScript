/**
 * Canvas 2D Procedural Paint Splash Engine
 *
 * High-performance, zero-allocation per frame canvas renderer.
 * Sleeps completely when idle, off-screen, or hidden.
 */
import { splashConfig } from './config'
import { generateSplashShape, type SplashShapeData } from './geometry'
import { createHeroComposition, type SplashComposition } from './svgData'

export interface SplashEngineOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  isMobile?: boolean
  onFirstClick?: () => void
  onStageShake?: (x: number, y: number) => void
}

interface ClickSplashInstance {
  id: number
  cx: number
  cy: number
  radius: number
  shape: SplashShapeData
  startTime: number
  lifetime: number
  scale: number
  alpha: number
  wobblePhase: number
}

interface FallingDroplet {
  active: boolean
  x: number
  y: number
  targetY: number
  startY: number
  vy: number
  radius: number
  startTime: number
  duration: number
  isComplete: boolean
}

export class SplashEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private container: HTMLElement
  private isMobile: boolean
  private onFirstClick?: () => void
  private onStageShake?: (x: number, y: number) => void

  private width = 560
  private height = 560
  private dpr = 1

  // Hero deterministic composition
  private composition!: SplashComposition

  // Particle pool for satellite droplets
  private maxParticles: number
  private particles: Array<{
    active: boolean
    x: number
    y: number
    originX: number
    originY: number
    targetX: number
    targetY: number
    radius: number
    vx: number
    vy: number
    gravity: number
    stretch: number
    angle: number
    progress: number
    isLanded: boolean
    alpha: number
    splashId: number // 0: hero composition, >0: click splashes
  }> = []

  // Dynamic click splashes
  private clickSplashes: ClickSplashInstance[] = []
  private lastClickTime = 0
  private nextClickId = 1
  private hasInteracted = false

  // Entry sequence state
  private isEntryRunning = false
  private entryStartTime = 0
  private bigSplashScale = 0
  private med1Scale = 0
  private med2Scale = 0
  private smallScale = 0
  private bigWobble = 0
  private bigWobbleEndTime = 0
  private dripsProgress = 0
  private echoBigAlpha = 0
  private echoBigScale = 1

  // Falling droplets for entry impacts
  private fallingDrops: {
    big: FallingDroplet
    med1: FallingDroplet
    med2: FallingDroplet
    small: FallingDroplet
  } = {
    big: { active: false, x: 0, y: 0, startY: -40, targetY: 0, vy: 0, radius: 6.5, startTime: 0, duration: 0.35, isComplete: false },
    med1: { active: false, x: 0, y: 0, startY: -40, targetY: 0, vy: 0, radius: 4.5, startTime: 0, duration: 0.28, isComplete: false },
    med2: { active: false, x: 0, y: 0, startY: -40, targetY: 0, vy: 0, radius: 4.0, startTime: 0, duration: 0.26, isComplete: false },
    small: { active: false, x: 0, y: 0, startY: -40, targetY: 0, vy: 0, radius: 3.2, startTime: 0, duration: 0.24, isComplete: false },
  }

  // Animation loop & sleep state
  private rafId: number | null = null
  private isRunning = false
  private isVisible = true
  private resizeObserver: ResizeObserver | null = null
  private intersectionObserver: IntersectionObserver | null = null

  constructor(options: SplashEngineOptions) {
    this.canvas = options.canvas
    this.ctx = this.canvas.getContext('2d', { alpha: true })!
    this.container = options.container
    this.isMobile = options.isMobile ?? false
    this.onFirstClick = options.onFirstClick
    this.onStageShake = options.onStageShake

    this.maxParticles = this.isMobile
      ? splashConfig.mobile.maxParticles
      : splashConfig.clickSplash.maxParticles

    // Pre-allocate particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        originX: 0,
        originY: 0,
        targetX: 0,
        targetY: 0,
        radius: 0,
        vx: 0,
        vy: 0,
        gravity: 0,
        stretch: 1,
        angle: 0,
        progress: 0,
        isLanded: false,
        alpha: 1,
        splashId: 0,
      })
    }

    this.initSize()
    this.initObservers()
  }

  private initSize() {
    const rect = this.container.getBoundingClientRect()
    const size = Math.max(200, Math.min(560, rect.width || 560))
    this.width = size
    this.height = size

    const dprCap = this.isMobile
      ? splashConfig.mobile.dprCap
      : splashConfig.performance.desktopDprCap
    this.dpr = Math.min(dprCap, window.devicePixelRatio || 1)

    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.canvas.style.width = `${this.width}px`
    this.canvas.style.height = `${this.height}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)

    this.composition = createHeroComposition(this.width, this.height)
  }

  private initObservers() {
    // 1. Debounced ResizeObserver
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        this.initSize()
        this.renderFrame(performance.now())
      }, splashConfig.performance.resizeDebounceMs)
    })
    this.resizeObserver.observe(this.container)

    // 2. IntersectionObserver to pause loop off-screen
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        this.isVisible = entry?.isIntersecting ?? true
        if (this.isVisible) {
          this.wakeUp()
        } else {
          this.sleep()
        }
      },
      { threshold: 0.05 }
    )
    this.intersectionObserver.observe(this.container)

    // 3. Tab visibility
    const onVisibilityChange = () => {
      if (document.hidden) {
        this.sleep()
      } else if (this.isVisible) {
        this.wakeUp()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  /**
   * Start entry sequence (starts after whenRevealed() + requestIdleCallback)
   */
  public startEntrySequence() {
    this.isEntryRunning = true
    this.entryStartTime = performance.now()

    // Reset scales and states
    this.bigSplashScale = 0
    this.med1Scale = 0
    this.med2Scale = 0
    this.smallScale = 0
    this.dripsProgress = 0
    this.echoBigAlpha = 0
    this.echoBigScale = 1

    // Setup initial falling droplet for big splash
    const cfg = splashConfig
    const big = this.composition.big
    this.fallingDrops.big = {
      active: true,
      x: big.cx,
      y: -20,
      startY: -20,
      targetY: big.cy,
      vy: (big.cy + 20) / cfg.entry.dropFallDuration,
      radius: 6.5,
      startTime: this.entryStartTime,
      duration: cfg.entry.dropFallDuration,
      isComplete: false,
    }

    // Secondary falling drops
    const t0 = this.entryStartTime
    this.fallingDrops.med1 = {
      active: true,
      x: this.composition.medium1.cx,
      y: -20,
      startY: -20,
      targetY: this.composition.medium1.cy,
      vy: (this.composition.medium1.cy + 20) / 0.28,
      radius: 4.5,
      startTime: t0 + cfg.entry.mediumImpactDelay1 - 0.28,
      duration: 0.28,
      isComplete: false,
    }

    this.fallingDrops.med2 = {
      active: true,
      x: this.composition.medium2.cx,
      y: -20,
      startY: -20,
      targetY: this.composition.medium2.cy,
      vy: (this.composition.medium2.cy + 20) / 0.26,
      radius: 4.0,
      startTime: t0 + cfg.entry.mediumImpactDelay2 - 0.26,
      duration: 0.26,
      isComplete: false,
    }

    this.fallingDrops.small = {
      active: true,
      x: this.composition.small.cx,
      y: -20,
      startY: -20,
      targetY: this.composition.small.cy,
      vy: (this.composition.small.cy + 20) / 0.24,
      radius: 3.2,
      startTime: t0 + cfg.entry.smallImpactDelay - 0.24,
      duration: 0.24,
      isComplete: false,
    }

    this.wakeUp()
  }

  /**
   * Spawn a new dynamic splash on click or tap
   */
  public triggerClickSplash(clientX: number, clientY: number) {
    const now = performance.now()
    const cfg = splashConfig

    // Cooldown check
    if (now - this.lastClickTime < cfg.clickSplash.cooldownMs) {
      return
    }
    this.lastClickTime = now

    if (!this.hasInteracted) {
      this.hasInteracted = true
      this.onFirstClick?.()
    }

    // Convert client coordinates to canvas space
    const rect = this.canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    // Check bounds
    if (x < 0 || x > this.width || y < 0 || y > this.height) return

    // Cap live click splashes
    const maxLive = this.isMobile ? cfg.mobile.maxLiveSplashes : cfg.clickSplash.maxLiveSplashes
    if (this.clickSplashes.length >= maxLive) {
      // Remove oldest
      this.clickSplashes.shift()
    }

    const minR = this.isMobile ? 32 : cfg.clickSplash.minRadius
    const maxR = this.isMobile ? 58 : cfg.clickSplash.maxRadius
    const radius = minR + Math.random() * (maxR - minR)
    const seed = Math.floor(Math.random() * 1000000)

    const shape = generateSplashShape(
      x,
      y,
      radius,
      seed,
      false,
      this.isMobile ? cfg.mobile.minTendrils : undefined,
      this.isMobile ? cfg.mobile.maxDroplets : undefined
    )

    const instanceId = this.nextClickId++
    this.clickSplashes.push({
      id: instanceId,
      cx: x,
      cy: y,
      radius,
      shape,
      startTime: now,
      lifetime: cfg.clickSplash.lifetime * 1000,
      scale: 0.2,
      alpha: 1,
      wobblePhase: 0,
    })

    // Check distance to big splash: trigger wobble if within 220px
    const big = this.composition.big
    const distToBig = Math.hypot(x - big.cx, y - big.cy)
    if (distToBig <= cfg.clickSplash.wobbleRadius) {
      this.bigWobble = 1
      this.bigWobbleEndTime = now + cfg.clickSplash.wobbleDuration * 1000
    }

    // Spawn satellite droplets for click splash into particle pool
    const droplets = shape.satelliteDroplets
    for (const drop of droplets) {
      this.spawnParticle(instanceId, x, y, drop.targetX, drop.targetY, drop.radius, drop.vx, drop.vy)
    }

    this.wakeUp()
  }

  private spawnParticle(
    splashId: number,
    ox: number,
    oy: number,
    tx: number,
    ty: number,
    radius: number,
    vx: number,
    vy: number
  ) {
    // Find first inactive slot
    let slot = this.particles.find((p) => !p.active)
    if (!slot) {
      // If pool full, recycle oldest active non-hero particle
      slot = this.particles.find((p) => p.splashId > 0) || this.particles[0]
    }
    if (!slot) return

    slot.active = true
    slot.x = ox
    slot.y = oy
    slot.originX = ox
    slot.originY = oy
    slot.targetX = tx
    slot.targetY = ty
    slot.radius = radius
    slot.vx = vx
    slot.vy = vy
    slot.gravity = splashConfig.droplets.gravity
    slot.stretch = 1
    slot.angle = Math.atan2(vy, vx)
    slot.progress = 0
    slot.isLanded = false
    slot.alpha = 1
    slot.splashId = splashId
  }

  /**
   * Main animation loop
   */
  private loop = (time: number) => {
    if (!this.isRunning) return

    const hasActiveAnimation = this.update(time)
    this.render(time)

    if (hasActiveAnimation) {
      this.rafId = requestAnimationFrame(this.loop)
    } else {
      // Sleep engine completely when animations settle
      this.sleep()
    }
  }

  private wakeUp() {
    if (!this.isRunning && this.isVisible && !document.hidden) {
      this.isRunning = true
      this.rafId = requestAnimationFrame(this.loop)
    }
  }

  private sleep() {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  /**
   * Update physics, timings, and scales
   */
  private update(time: number): boolean {
    const cfg = splashConfig
    let stillAnimating = false

    // 1. Entry sequence progression
    if (this.isEntryRunning) {
      const elapsed = (time - this.entryStartTime) / 1000

      // A. Big falling drop
      const bigDrop = this.fallingDrops.big
      if (bigDrop.active && !bigDrop.isComplete) {
        const dropElapsed = (time - bigDrop.startTime) / 1000
        const p = Math.min(1, dropElapsed / bigDrop.duration)
        // Quadratic acceleration
        bigDrop.y = bigDrop.startY + (bigDrop.targetY - bigDrop.startY) * (p * p)
        if (p >= 1) {
          bigDrop.isComplete = true
          bigDrop.active = false
          // Big impact triggered: shake stage
          this.onStageShake?.(cfg.entry.stageShakeAmplitude, cfg.entry.stageShakeAmplitude)
          setTimeout(() => this.onStageShake?.(0, 0), cfg.entry.stageShakeDuration * 1000)

          // Spawn big satellite particles
          for (const d of this.composition.big.satelliteDroplets) {
            this.spawnParticle(0, this.composition.big.cx, this.composition.big.cy, d.targetX, d.targetY, d.radius, d.vx, d.vy)
          }
        }
        stillAnimating = true
      }

      // Big splash burst expansion & elastic settle
      if (bigDrop.isComplete) {
        const impactTime = this.entryStartTime + cfg.entry.dropFallDuration * 1000
        const impactElapsed = (time - impactTime) / 1000

        if (impactElapsed >= 0 && impactElapsed < cfg.entry.impactExpandDuration) {
          // Rapid expansion: 20% to 112% (power4.out)
          const p = impactElapsed / cfg.entry.impactExpandDuration
          const ease = 1 - Math.pow(1 - p, 4)
          this.bigSplashScale = 0.2 + 0.92 * ease
          this.echoBigAlpha = 0.4 * (1 - p)
          this.echoBigScale = 1 + 0.25 * ease
          stillAnimating = true
        } else if (impactElapsed >= cfg.entry.impactExpandDuration) {
          // Settle: 112% to 100% over 0.35s with mild elastic damped sine
          const settleElapsed = impactElapsed - cfg.entry.impactExpandDuration
          const p = Math.min(1, settleElapsed / cfg.entry.impactSettleDuration)
          if (p < 1) {
            const decay = Math.exp(-4 * p)
            const osc = Math.cos(p * Math.PI * 3.5)
            this.bigSplashScale = 1.0 + 0.12 * decay * osc
            this.echoBigAlpha = Math.max(0, 0.25 * (1 - p))
            this.echoBigScale = 1.18 + 0.05 * p
            stillAnimating = true
          } else {
            this.bigSplashScale = 1.0
            this.echoBigAlpha = cfg.styling.echoRingOpacity
            this.echoBigScale = cfg.styling.echoRingScale
          }
        }
      }

      // Medium splashes impact
      const med1Drop = this.fallingDrops.med1
      if (elapsed >= cfg.entry.mediumImpactDelay1 - 0.28) {
        if (med1Drop.active && !med1Drop.isComplete) {
          const dropElapsed = (time - med1Drop.startTime) / 1000
          const p = Math.min(1, dropElapsed / med1Drop.duration)
          med1Drop.y = med1Drop.startY + (med1Drop.targetY - med1Drop.startY) * (p * p)
          if (p >= 1) {
            med1Drop.isComplete = true
            med1Drop.active = false
            for (const d of this.composition.medium1.satelliteDroplets) {
              this.spawnParticle(0, this.composition.medium1.cx, this.composition.medium1.cy, d.targetX, d.targetY, d.radius, d.vx, d.vy)
            }
          }
          stillAnimating = true
        }
        if (med1Drop.isComplete) {
          const p = Math.min(1, (elapsed - cfg.entry.mediumImpactDelay1) / 0.3)
          this.med1Scale = p >= 1 ? 1.0 : 0.3 + 0.7 * (1 - Math.pow(1 - p, 3))
          if (p < 1) stillAnimating = true
        }
      }

      const med2Drop = this.fallingDrops.med2
      if (elapsed >= cfg.entry.mediumImpactDelay2 - 0.26) {
        if (med2Drop.active && !med2Drop.isComplete) {
          const dropElapsed = (time - med2Drop.startTime) / 1000
          const p = Math.min(1, dropElapsed / med2Drop.duration)
          med2Drop.y = med2Drop.startY + (med2Drop.targetY - med2Drop.startY) * (p * p)
          if (p >= 1) {
            med2Drop.isComplete = true
            med2Drop.active = false
            for (const d of this.composition.medium2.satelliteDroplets) {
              this.spawnParticle(0, this.composition.medium2.cx, this.composition.medium2.cy, d.targetX, d.targetY, d.radius, d.vx, d.vy)
            }
          }
          stillAnimating = true
        }
        if (med2Drop.isComplete) {
          const p = Math.min(1, (elapsed - cfg.entry.mediumImpactDelay2) / 0.3)
          this.med2Scale = p >= 1 ? 1.0 : 0.3 + 0.7 * (1 - Math.pow(1 - p, 3))
          if (p < 1) stillAnimating = true
        }
      }

      // Small splash impact
      const smallDrop = this.fallingDrops.small
      if (elapsed >= cfg.entry.smallImpactDelay - 0.24) {
        if (smallDrop.active && !smallDrop.isComplete) {
          const dropElapsed = (time - smallDrop.startTime) / 1000
          const p = Math.min(1, dropElapsed / smallDrop.duration)
          smallDrop.y = smallDrop.startY + (smallDrop.targetY - smallDrop.startY) * (p * p)
          if (p >= 1) {
            smallDrop.isComplete = true
            smallDrop.active = false
            for (const d of this.composition.small.satelliteDroplets) {
              this.spawnParticle(0, this.composition.small.cx, this.composition.small.cy, d.targetX, d.targetY, d.radius, d.vx, d.vy)
            }
          }
          stillAnimating = true
        }
        if (smallDrop.isComplete) {
          const p = Math.min(1, (elapsed - cfg.entry.smallImpactDelay) / 0.25)
          this.smallScale = p >= 1 ? 1.0 : 0.3 + 0.7 * (1 - Math.pow(1 - p, 3))
          if (p < 1) stillAnimating = true
        }
      }

      // Drips elongation
      if (elapsed >= cfg.entry.dripsStartDelay) {
        const dripElapsed = elapsed - cfg.entry.dripsStartDelay
        const p = Math.min(1, dripElapsed / cfg.drips.elongationDuration)
        // Strong ease-out: 1 - (1-p)^3
        this.dripsProgress = 1 - Math.pow(1 - p, 3)
        if (p < 1) stillAnimating = true
      }

      if (elapsed > cfg.entry.totalDuration) {
        this.isEntryRunning = false
      } else {
        stillAnimating = true
      }
    } else {
      this.bigSplashScale = 1.0
      this.med1Scale = 1.0
      this.med2Scale = 1.0
      this.smallScale = 1.0
      this.dripsProgress = 1.0
      this.echoBigAlpha = cfg.styling.echoRingOpacity
      this.echoBigScale = cfg.styling.echoRingScale
    }

    // 2. Big splash wobble on click nearby
    if (this.bigWobble > 0) {
      const remaining = this.bigWobbleEndTime - time
      if (remaining > 0) {
        const p = 1 - remaining / (cfg.clickSplash.wobbleDuration * 1000)
        this.bigWobble = Math.sin(p * Math.PI * 4) * Math.exp(-3 * p) * cfg.clickSplash.wobbleScale
        stillAnimating = true
      } else {
        this.bigWobble = 0
      }
    }

    // 3. Dynamic click splashes update
    const activeSplashes: ClickSplashInstance[] = []
    for (const splash of this.clickSplashes) {
      const age = time - splash.startTime
      if (age < splash.lifetime) {
        // Entry pop: 0.15s
        if (age < 150) {
          const p = age / 150
          splash.scale = 0.2 + 0.8 * (1 - Math.pow(1 - p, 3))
        } else {
          splash.scale = 1.0
        }

        // Fade out over last 0.6s
        const remaining = splash.lifetime - age
        if (remaining < cfg.clickSplash.fadeDuration * 1000) {
          splash.alpha = remaining / (cfg.clickSplash.fadeDuration * 1000)
        } else {
          splash.alpha = 1.0
        }

        activeSplashes.push(splash)
        stillAnimating = true
      }
    }
    this.clickSplashes = activeSplashes

    // 4. Update particles (ballistic arcs, gravity, squash)
    const dt = 1 / 60
    for (const p of this.particles) {
      if (!p.active) continue

      if (!p.isLanded) {
        p.progress += dt * 1.8
        p.vy += p.gravity * dt
        p.x += p.vx * dt
        p.y += p.vy * dt

        const speed = Math.hypot(p.vx, p.vy)
        p.stretch = Math.min(2.8, 1 + speed * cfg.droplets.stretchFactor)
        p.angle = Math.atan2(p.vy, p.vx)

        // Check if reached destination or landed
        const distToTarget = Math.hypot(p.x - p.targetX, p.y - p.targetY)
        if (distToTarget < 12 || p.progress >= 1) {
          p.isLanded = true
          p.stretch = 1
        }
        stillAnimating = true
      } else {
        // Landed: stays as tiny flat ellipse, fades if dynamic click particle
        if (p.splashId > 0) {
          p.alpha -= dt * 0.25
          if (p.alpha <= 0) {
            p.active = false
          } else {
            stillAnimating = true
          }
        }
      }
    }

    return stillAnimating
  }

  /**
   * Render frame to canvas
   */
  private render(_time: number) {
    const ctx = this.ctx
    ctx.clearRect(0, 0, this.width, this.height)

    // 1. Render hero background splashes (Medium 1, Medium 2, Small)
    if (this.med1Scale > 0) {
      this.drawSplash(this.composition.medium1, this.med1Scale, 1.0)
    }
    if (this.med2Scale > 0) {
      this.drawSplash(this.composition.medium2, this.med2Scale, 1.0)
    }
    if (this.smallScale > 0) {
      this.drawSplash(this.composition.small, this.smallScale, 1.0)
    }

    // 2. Render big splash with wobble and scale
    if (this.bigSplashScale > 0) {
      const finalScale = this.bigSplashScale * (1 + this.bigWobble)
      this.drawSplash(this.composition.big, finalScale, 1.0, true)
    }

    // 3. Render falling entry droplets
    for (const key of ['big', 'med1', 'med2', 'small'] as const) {
      const drop = this.fallingDrops[key]
      if (drop.active && !drop.isComplete && drop.y > -20) {
        ctx.save()
        ctx.fillStyle = splashConfig.palette.volt
        ctx.beginPath()
        // Stretched tear falling down
        ctx.ellipse(drop.x, drop.y, drop.radius * 0.7, drop.radius * 1.5, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // 4. Render click-to-splash instances
    for (const splash of this.clickSplashes) {
      this.drawSplash(splash.shape, splash.scale, splash.alpha)
    }

    // 5. Render particles (satellite droplets)
    this.drawParticles()
  }

  /**
   * Draw a single splash instance
   */
  private drawSplash(
    splash: SplashShapeData,
    scale: number,
    alpha: number,
    isHeroBig = false
  ) {
    if (scale <= 0.01 || alpha <= 0.01) return
    const ctx = this.ctx
    const cfg = splashConfig

    ctx.save()
    ctx.globalAlpha = alpha

    // Transform relative to splash center
    ctx.translate(splash.cx, splash.cy)
    ctx.scale(scale, scale)
    ctx.translate(-splash.cx, -splash.cy)

    // A. Echo ring outline behind splash
    const echoAlpha = isHeroBig ? this.echoBigAlpha : cfg.styling.echoRingOpacity * alpha
    if (echoAlpha > 0.01) {
      ctx.save()
      ctx.globalAlpha = echoAlpha
      ctx.strokeStyle = cfg.styling.echoRingColor
      ctx.lineWidth = cfg.styling.echoRingLineWidth
      if (isHeroBig && this.echoBigScale !== 1) {
        ctx.translate(splash.cx, splash.cy)
        ctx.scale(this.echoBigScale, this.echoBigScale)
        ctx.translate(-splash.cx, -splash.cy)
      }
      const echoPath = new Path2D(splash.echoPathD)
      ctx.stroke(echoPath)
      ctx.restore()
    }

    // B. Main splash path & fill
    const mainPath = new Path2D(splash.pathD)
    ctx.fillStyle = cfg.palette.volt
    ctx.fill(mainPath)

    // C. Crescent highlight (top-left) & Inner shadow (bottom-right) clipped to main splash
    ctx.save()
    ctx.clip(mainPath)

    // Crescent highlight (Bone at 28%)
    const hl = splash.crescentHighlight
    ctx.save()
    ctx.translate(hl.cx, hl.cy)
    ctx.rotate(hl.rotation)
    ctx.fillStyle = cfg.styling.crescentHighlightColor
    ctx.globalAlpha = cfg.styling.crescentHighlightOpacity * alpha
    ctx.beginPath()
    ctx.ellipse(0, 0, hl.rx, hl.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Inner shadow (Ink at 22%)
    const is = splash.innerShadow
    ctx.save()
    ctx.translate(is.cx, is.cy)
    ctx.rotate(is.rotation)
    ctx.fillStyle = cfg.styling.innerShadowColor
    ctx.globalAlpha = cfg.styling.innerShadowOpacity * alpha
    ctx.beginPath()
    ctx.ellipse(0, 0, is.rx, is.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    ctx.restore() // End clip

    // D. Specular wet dot (Bone at 60%)
    ctx.save()
    ctx.fillStyle = cfg.styling.specularDotColor
    ctx.globalAlpha = cfg.styling.specularDotOpacity * alpha
    ctx.beginPath()
    ctx.arc(splash.specularDot.x, splash.specularDot.y, splash.specularDot.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // E. Detached crown droplets
    ctx.fillStyle = cfg.palette.volt
    for (const t of splash.tendrils) {
      if (t.hasDetachedDroplet && t.detachedDroplet) {
        ctx.beginPath()
        ctx.arc(t.detachedDroplet.x, t.detachedDroplet.y, t.detachedDroplet.radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // F. Brand diamond cutout in center (BIG splash only)
    if (splash.isBig && splash.diamondCutout) {
      const dw = splash.diamondCutout.width
      const dh = splash.diamondCutout.height
      ctx.fillStyle = cfg.palette.ink
      ctx.beginPath()
      ctx.moveTo(splash.cx, splash.cy - dh / 2)
      ctx.lineTo(splash.cx + dw / 2, splash.cy)
      ctx.lineTo(splash.cx, splash.cy + dh / 2)
      ctx.lineTo(splash.cx - dw / 2, splash.cy)
      ctx.closePath()
      ctx.fill()
    }

    // G. Viscous drips from bottom edge
    if (splash.isBig && splash.drips.length > 0) {
      const p = this.dripsProgress
      ctx.strokeStyle = cfg.palette.volt
      ctx.fillStyle = cfg.palette.volt

      for (const drip of splash.drips) {
        const curLength = drip.targetLength * p
        const endX = drip.startX + Math.cos(drip.angle) * (curLength * 0.65)
        const endY = drip.startY + Math.sin(drip.angle) * curLength

        if (curLength > 3) {
          ctx.beginPath()
          ctx.lineWidth = drip.headRadius * 0.85
          ctx.lineCap = 'round'
          ctx.moveTo(drip.startX, drip.startY)
          ctx.lineTo(endX, endY)
          ctx.stroke()

          // Teardrop bead at the tip
          ctx.beginPath()
          ctx.arc(endX, endY, drip.headRadius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    ctx.restore()
  }

  /**
   * Draw satellite droplets from the particle pool
   */
  private drawParticles() {
    const ctx = this.ctx
    ctx.fillStyle = splashConfig.palette.volt

    for (const p of this.particles) {
      if (!p.active) continue
      ctx.save()
      ctx.globalAlpha = p.alpha

      if (!p.isLanded && p.stretch > 1.1) {
        // Airborne: stretched ellipse oriented along velocity vector
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.beginPath()
        ctx.ellipse(0, 0, p.radius * p.stretch, p.radius / Math.sqrt(p.stretch), 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Landed: squashed flat circle
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()
    }
  }

  /**
   * Force static full render (for reduced motion or quick render)
   */
  public renderStatic() {
    this.bigSplashScale = 1.0
    this.med1Scale = 1.0
    this.med2Scale = 1.0
    this.smallScale = 1.0
    this.dripsProgress = 1.0
    this.echoBigAlpha = splashConfig.styling.echoRingOpacity
    this.echoBigScale = splashConfig.styling.echoRingScale

    // Populate landed particles for static view
    for (const d of this.composition.big.satelliteDroplets) {
      this.spawnParticle(0, d.targetX, d.targetY, d.targetX, d.targetY, d.radius, 0, 0)
    }

    this.render(performance.now())
  }

  public renderFrame(time: number) {
    this.render(time)
  }

  public replay() {
    this.startEntrySequence()
  }

  public destroy() {
    this.sleep()
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
      this.intersectionObserver = null
    }
  }
}
