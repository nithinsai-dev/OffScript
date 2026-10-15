/**
 * Shared shard math and geometry utilities.
 * Pure logic module with zero DOM/React dependencies.
 * Does NOT import Cursor or any cursor state.
 */

export interface CursorShard {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  vRot: number
  born: number
  duration: number
}

export interface CardShardTarget {
  id: string
  x: number
  y: number
}

export interface CardShardConfig {
  id: string
  isTargetCard: boolean
  cardId?: string
  targetX: number
  targetY: number
  size: number
  shape: 'diamond' | 'square'
  rot: number
  delay: number
}

/**
 * Generate radial click burst shards for canvas cursor
 */
export function createCursorShards(
  originX: number,
  originY: number,
  count = 8,
  born = performance.now()
): CursorShard[] {
  const shards: CursorShard[] = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
    const speed = 2.0 + Math.random() * 3.5
    shards.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2.5 + Math.random() * 3,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 10,
      born,
      duration: 450,
    })
  }
  return shards
}

/**
 * Generate shard definitions for card shatter entry sequence.
 * Enforces maximum 14 DOM elements total.
 */
export function createCardShatterShards(
  impactX: number,
  impactY: number,
  cardTargets: CardShardTarget[],
  maxTotal = 14
): CardShardConfig[] {
  const shards: CardShardConfig[] = []
  const cardCount = cardTargets.length
  const extraCount = Math.max(0, Math.min(maxTotal - cardCount, 4))

  // 1. One shard per target card flying toward card center
  cardTargets.forEach((target, index) => {
    const size = 9 + Math.floor(Math.random() * 8) // 9px - 16px
    const shape = index % 2 === 0 ? 'diamond' : 'square'
    const rot = shape === 'diamond' ? 45 : (Math.random() - 0.5) * 30

    shards.push({
      id: `card-shard-${target.id}`,
      isTargetCard: true,
      cardId: target.id,
      targetX: target.x,
      targetY: target.y,
      size,
      shape,
      rot,
      delay: index * 0.015, // slight dispersion
    })
  })

  // 2. Extra decorative burst shards flying outward (up to maxTotal elements)
  for (let i = 0; i < extraCount; i++) {
    const angle = (i / extraCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8
    const dist = 70 + Math.random() * 80
    const size = 8 + Math.floor(Math.random() * 6)
    const shape = i % 2 === 0 ? 'diamond' : 'square'

    shards.push({
      id: `decor-shard-${i}`,
      isTargetCard: false,
      targetX: impactX + Math.cos(angle) * dist,
      targetY: impactY + Math.sin(angle) * dist,
      size,
      shape,
      rot: (Math.random() - 0.5) * 90,
      delay: Math.random() * 0.05,
    })
  }

  return shards.slice(0, maxTotal)
}
