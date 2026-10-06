/**
 * Challenges (docs/01 "Challenges"): Daily and Weekly are date-seeded and
 * deterministic (no server — the seed is just the calendar date), the rest
 * are standing goals the user can attempt whenever they like.
 *
 * Pure: takes a `TestRecord`-shaped result and a definition, returns whether
 * it was cleared. No storage here — store/progress.ts persists completions.
 */
import { makeRng } from '../text/rng';

export type ChallengeKind =
  | 'daily'
  | 'weekly'
  | 'speed-ladder'
  | 'accuracy'
  | 'no-mistake'
  | 'endurance'
  | 'personal-best';

export interface ChallengeTarget {
  /** 'time' or 'words' test to attempt. */
  mode: 'time' | 'words';
  seconds?: number;
  wordCount?: number;
  minWpm?: number;
  minAccuracy?: number;
  maxErrors?: number;
  minDurationMs?: number;
}

export interface ChallengeDef {
  id: string;
  kind: ChallengeKind;
  title: string;
  description: string;
  target: ChallengeTarget;
  tier: 1 | 2 | 3;
}

/** Minimal shape of a finished test this module needs to judge a challenge. */
export interface ChallengeResultInput {
  mode: string;
  wpm: number;
  accuracy: number;
  errors: number;
  timeMs: number;
  duration: number; // configured seconds for time mode, else 0
}

const DAILY_TIME_OPTIONS = [30, 60];
const DAILY_WPM_BASE = [25, 30, 35, 40, 45];

/** ISO calendar week, e.g. "2026-W41" — stable, timezone-light (UTC). */
export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function dateKey(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

/** Deterministic Daily challenge: same date -> same challenge, everywhere, forever. */
export function dailyChallenge(d: Date): ChallengeDef {
  const key = dateKey(d);
  const rng = makeRng(`daily:${key}`);
  const seconds = rng.pick(DAILY_TIME_OPTIONS);
  const minWpm = rng.pick(DAILY_WPM_BASE);
  const minAccuracy = 90 + rng.int(6); // 90-95
  return {
    id: `daily-${key}`,
    kind: 'daily',
    title: `Daily — ${key}`,
    description: `Type for ${seconds}s, reach ${minWpm}+ WPM at ${minAccuracy}%+ accuracy.`,
    target: { mode: 'time', seconds, minWpm, minAccuracy },
    tier: 1,
  };
}

/** Deterministic Weekly challenge: bigger, same for everyone that ISO week. */
export function weeklyChallenge(d: Date): ChallengeDef {
  const key = isoWeekKey(d);
  const rng = makeRng(`weekly:${key}`);
  const wordCount = rng.pick([50, 75, 100]);
  const minWpm = 30 + rng.int(25); // 30-54
  const minAccuracy = 92 + rng.int(6); // 92-97
  return {
    id: `weekly-${key}`,
    kind: 'weekly',
    title: `Weekly — ${key}`,
    description: `Type ${wordCount} words, reach ${minWpm}+ WPM at ${minAccuracy}%+ accuracy.`,
    target: { mode: 'words', wordCount, minWpm, minAccuracy },
    tier: 2,
  };
}

/** Speed Ladder rungs — climb one at a time, never skip. */
export const SPEED_LADDER_RUNGS: readonly number[] = [
  20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140,
];

export function speedLadderChallenge(rung: number): ChallengeDef {
  const idx = Math.max(0, Math.min(SPEED_LADDER_RUNGS.length - 1, rung));
  const target = SPEED_LADDER_RUNGS[idx]!;
  return {
    id: `speed-ladder-${idx}`,
    kind: 'speed-ladder',
    title: `Speed Ladder — rung ${idx + 1}`,
    description: `Reach ${target}+ WPM in a Time (30s+) or Words (25+) test.`,
    target: { mode: 'time', seconds: 30, minWpm: target, minAccuracy: 90 },
    tier: idx < 4 ? 1 : idx < 8 ? 2 : 3,
  };
}

export const STANDING_CHALLENGES: ChallengeDef[] = [
  {
    id: 'accuracy-98',
    kind: 'accuracy',
    title: 'Accuracy Challenge',
    description: 'Finish any Time or Words test at 98% accuracy or higher.',
    target: { mode: 'time', minAccuracy: 98 },
    tier: 1,
  },
  {
    id: 'no-mistake',
    kind: 'no-mistake',
    title: 'No-Mistake Run',
    description: 'Finish a test of at least 30 seconds (or 30+ words) with zero mistakes.',
    target: { mode: 'time', seconds: 30, maxErrors: 0 },
    tier: 2,
  },
  {
    id: 'endurance-5',
    kind: 'endurance',
    title: 'Endurance Challenge',
    description: 'Finish a single test of 5 minutes or longer.',
    target: { mode: 'time', minDurationMs: 5 * 60_000 },
    tier: 3,
  },
];

/** Does this finished test clear the given challenge? */
export function evaluateChallenge(def: ChallengeDef, r: ChallengeResultInput): boolean {
  const t = def.target;
  if (t.minWpm !== undefined && r.wpm < t.minWpm) return false;
  if (t.minAccuracy !== undefined && r.accuracy < t.minAccuracy) return false;
  if (t.maxErrors !== undefined && r.errors > t.maxErrors) return false;
  if (t.minDurationMs !== undefined && r.timeMs < t.minDurationMs) return false;
  if (t.seconds !== undefined && r.mode === 'time' && r.duration < t.seconds) return false;
  return true;
}
