/**
 * Pure math for the Stats screens. No DOM — the overview, calendar, records
 * and error lists are all plain data transforms over tests/aggregates so
 * they are unit-testable without mounting anything.
 */
import { isoDay } from './aggregates';
import type { Aggregates, TestRecord } from './types';

export interface Overview {
  count: number;
  totalTimeMs: number;
  avgWpm: number;
  avgAccuracy: number;
  bestWpm: number;
  streakDays: number;
}

export function emptyOverview(): Overview {
  return { count: 0, totalTimeMs: 0, avgWpm: 0, avgAccuracy: 0, bestWpm: 0, streakDays: 0 };
}

export function computeOverview(tests: readonly TestRecord[], days: Aggregates['days'], today = Date.now()): Overview {
  if (tests.length === 0) return { ...emptyOverview(), streakDays: streakDays(days, today) };
  const totalTimeMs = tests.reduce((s, t) => s + t.timeMs, 0);
  const avgWpm = Math.round(tests.reduce((s, t) => s + t.wpm, 0) / tests.length);
  const avgAccuracy = Math.round(tests.reduce((s, t) => s + t.accuracy, 0) / tests.length);
  const bestWpm = Math.max(...tests.map((t) => t.wpm));
  return { count: tests.length, totalTimeMs, avgWpm, avgAccuracy, bestWpm, streakDays: streakDays(days, today) };
}

/** Consecutive days with at least one test, counting back from today (or yesterday if today is empty). */
export function streakDays(days: Aggregates['days'], today = Date.now()): number {
  let streak = 0;
  let cursor = today;
  // Allow "today has no test yet" to not break a streak that is still alive.
  if (!days[isoDay(cursor)]) cursor -= 24 * 60 * 60 * 1000;
  while (days[isoDay(cursor)]) {
    streak++;
    cursor -= 24 * 60 * 60 * 1000;
  }
  return streak;
}

export interface ActivityDay {
  date: string;
  tests: number;
  timeMs: number;
}

/** Last `weeks` * 7 days, oldest first, for a calendar grid. */
export function activityDays(days: Aggregates['days'], weeks: number, today = Date.now()): ActivityDay[] {
  const n = weeks * 7;
  const out: ActivityDay[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const ts = today - i * 24 * 60 * 60 * 1000;
    const key = isoDay(ts);
    const d = days[key];
    out.push({ date: key, tests: d?.tests ?? 0, timeMs: d?.timeMs ?? 0 });
  }
  return out;
}

export interface Record_ {
  key: string;
  label: string;
  best: TestRecord;
}

/** Personal bests grouped by lang+mode+duration, highest wpm per group. */
export function recordsByGroup(tests: readonly TestRecord[]): Record_[] {
  const groups = new Map<string, TestRecord>();
  for (const t of tests) {
    const key = `${t.lang}:${t.mode}:${t.duration}`;
    const cur = groups.get(key);
    if (!cur || t.wpm > cur.wpm) groups.set(key, t);
  }
  return [...groups.entries()]
    .map(([key, best]) => {
      const [lang, mode, duration] = key.split(':');
      const label = `${lang} · ${mode}${Number(duration) > 0 ? ` · ${duration}s` : ''}`;
      return { key, label, best };
    })
    .sort((a, b) => b.best.wpm - a.best.wpm);
}

export interface ErrorPair {
  pair: string;
  expected: string;
  typed: string;
  count: number;
}

export function topErrorPairs(errorPairs: Aggregates['errorPairs'], n = 10): ErrorPair[] {
  return Object.entries(errorPairs)
    .map(([pair, count]) => {
      const [expected, typed] = pair.split('→');
      return { pair, expected: expected ?? '', typed: typed ?? '', count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
