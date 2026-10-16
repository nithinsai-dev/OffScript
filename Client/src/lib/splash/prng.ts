/**
 * Seeded PRNG (Mulberry32)
 *
 * Deterministic pseudo-randomness for repeatable procedural splashes.
 */
export class PRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Return float in [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Return float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** Return integer in [min, max] inclusive */
  intRange(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  /** Return number skewed by power law exponent */
  powerLaw(min: number, max: number, exponent: number): number {
    const u = this.next()
    return min + Math.pow(u, exponent) * (max - min)
  }

  /** Return true with probability p */
  chance(p: number): boolean {
    return this.next() < p
  }
}
