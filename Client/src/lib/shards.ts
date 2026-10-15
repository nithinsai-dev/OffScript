/**
 * Shared shard math and geometry utilities for Cursor click burst.
 * Pure logic module with zero DOM/React dependencies.
 * All card shatter/diamond code removed per B1 specification.
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
