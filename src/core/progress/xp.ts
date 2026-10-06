/**
 * XP: how a finished test, lesson or challenge turns into points.
 * Pure, deterministic, no DOM, no storage — the caller decides when to award
 * and where to persist the running total (store/progress.ts).
 */

export interface XpTestInput {
  wpm: number;
  accuracy: number;
  /** Active typing time in ms (docs/04 "Elapsed minutes"). */
  timeMs: number;
  consistency: number;
}

/** Minimum XP for *any* recordable test, so very short/slow tests still count. */
const MIN_TEST_XP = 5;

/**
 * Base XP for one finished, recordable test (docs/04's short-test guard
 * already keeps un-recordable attempts out of history, so this never runs
 * on a 2-keystroke test).
 *
 * Formula (documented, not hidden): points scale with how long you typed for
 * and how fast, then accuracy and consistency apply as multipliers so a fast
 * but sloppy test is not worth more than a clean one of the same length.
 */
export function xpForTest(m: XpTestInput): number {
  const minutes = Math.max(m.timeMs / 60000, 1 / 60);
  const base = m.wpm * minutes * 2; // ~2 xp per word typed
  const accuracyMul = Math.max(0.4, m.accuracy / 100);
  const consistencyMul = 0.85 + 0.15 * Math.max(0, Math.min(100, m.consistency)) / 100;
  return Math.max(MIN_TEST_XP, Math.round(base * accuracyMul * consistencyMul));
}

/** Flat XP for finishing a Learn lesson (passed or not — attempting counts). */
export function xpForLesson(passed: boolean): number {
  return passed ? 40 : 15;
}

/** Flat-ish XP for a completed Challenge, scaled by difficulty tier (1-3). */
export function xpForChallenge(tier: 1 | 2 | 3 = 1): number {
  return 50 * tier;
}

/** Small bonus for keeping a streak alive, scaled gently so it cannot dominate. */
export function xpForStreakDay(streakLength: number): number {
  return Math.min(100, 10 + streakLength * 2);
}
