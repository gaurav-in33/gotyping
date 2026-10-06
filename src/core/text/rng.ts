/**
 * Deterministic seeded RNG. Used by every text generator so tests can assert
 * exact output and so Challenges can be date-seeded without a server.
 */

/** xmur3 string hash -> 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export interface Rng {
  /** float in [0, 1) */
  next(): number;
  /** integer in [0, n) */
  int(n: number): number;
  pick<T>(xs: readonly T[]): T;
  /** Fisher-Yates copy. */
  shuffle<T>(xs: readonly T[]): T[];
}

/** mulberry32 — small, fast, good enough for text sampling. */
export function makeRng(seed: number | string): Rng {
  let a = typeof seed === 'string' ? hashSeed(seed) : seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => (n <= 0 ? 0 : Math.floor(next() * n));
  return {
    next,
    int,
    pick: <T,>(xs: readonly T[]): T => xs[int(xs.length)]!,
    shuffle<T>(xs: readonly T[]): T[] {
      const out = xs.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
      }
      return out;
    },
  };
}
