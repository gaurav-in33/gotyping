/**
 * Levels: a simple, predictable curve over total XP.
 * Level n requires xpForLevel(n) *more* XP than level n-1 — the curve grows
 * so leveling never trivializes into a counter, but never requires grinding
 * either (docs/01 "never childish").
 */

/** XP required to go from level n to n+1 (n >= 1). */
export function xpToNextLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return Math.round(80 * Math.pow(n, 1.35));
}

export interface LevelInfo {
  level: number;
  /** XP earned since the start of the current level. */
  xpIntoLevel: number;
  /** XP required to complete the current level. */
  xpForLevel: number;
  totalXp: number;
}

/** Resolve a level + progress-within-level from a lifetime XP total. */
export function levelForXp(totalXp: number): LevelInfo {
  let xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let guard = 0;
  while (guard < 10000) {
    const need = xpToNextLevel(level);
    if (xp < need) {
      return { level, xpIntoLevel: xp, xpForLevel: need, totalXp };
    }
    xp -= need;
    level++;
    guard++;
  }
  return { level, xpIntoLevel: xp, xpForLevel: xpToNextLevel(level), totalXp };
}
