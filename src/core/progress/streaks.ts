/**
 * Streak math: pure, storage-agnostic. Takes a set of "active day" keys
 * (any stable string key — the caller formats dates; see store/aggregates.ts
 * `isoDay`) so this has no dependency on IndexedDB shapes.
 *
 * One implementation, two callers: store/stats.ts (the Stats overview card)
 * and core/progress/challenges.ts (streak XP + the "keep it alive" nudge) —
 * AGENT.md "one feature = one implementation".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakKeyer {
  (ts: number): string;
}

/**
 * Current streak counting back from `today`. `graceDays` allows that many
 * missed days *within* the streak before it breaks (docs/05 "streaks with
 * optional grace day") — each grace day used still shows in `graceUsed`.
 */
export function currentStreak(
  activeKeys: ReadonlySet<string> | Record<string, unknown>,
  keyOf: StreakKeyer,
  today = Date.now(),
  graceDays = 0,
): { streak: number; graceUsed: number } {
  const has = (k: string): boolean =>
    activeKeys instanceof Set ? activeKeys.has(k) : k in activeKeys;

  let streak = 0;
  let graceUsed = 0;
  let cursor = today;

  // "Today has no test yet" never breaks a streak that is otherwise alive.
  if (!has(keyOf(cursor))) cursor -= DAY_MS;

  for (;;) {
    if (has(keyOf(cursor))) {
      streak++;
      cursor -= DAY_MS;
      continue;
    }
    if (graceUsed < graceDays && streak > 0) {
      graceUsed++;
      cursor -= DAY_MS;
      continue;
    }
    break;
  }
  return { streak, graceUsed };
}

/** Longest run of consecutive active days ever seen, ignoring grace entirely. */
export function longestStreak(
  activeKeys: ReadonlySet<string> | Record<string, unknown>,
  keyOf: StreakKeyer,
  rangeStart: number,
  rangeEnd: number,
): number {
  const has = (k: string): boolean =>
    activeKeys instanceof Set ? activeKeys.has(k) : k in activeKeys;

  let best = 0;
  let run = 0;
  for (let ts = rangeStart; ts <= rangeEnd; ts += DAY_MS) {
    if (has(keyOf(ts))) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
