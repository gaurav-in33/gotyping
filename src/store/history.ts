/**
 * Test history: pure selectors (unit-testable) + an IndexedDB-backed repo.
 */
import type { Metrics } from '../core/engine/metrics';
import type { LanguageId } from './settings';
import { idb, STORES } from './db';
import type { TestConfigSnapshot, TestRecord } from './types';

export interface HistoryFilter {
  lang?: LanguageId;
  mode?: string;
  /** Configured duration in seconds; only applies to time mode. */
  duration?: number;
  lessonId?: string;
  since?: number;
}

export function filterTests(
  tests: readonly TestRecord[],
  f: HistoryFilter,
): TestRecord[] {
  return tests.filter((t) => {
    if (f.lang && t.lang !== f.lang) return false;
    if (f.mode && t.mode !== f.mode) return false;
    if (f.duration !== undefined && t.duration !== f.duration) return false;
    if (f.lessonId && t.lessonId !== f.lessonId) return false;
    if (f.since !== undefined && t.ts < f.since) return false;
    return true;
  });
}

/**
 * Enforce the history cap by dropping the oldest records.
 * Returns the records to keep, newest-last ordering preserved.
 */
export function applyCap(tests: readonly TestRecord[], cap: number): TestRecord[] {
  if (cap <= 0 || tests.length <= cap) return tests.slice();
  const sorted = tests.slice().sort((a, b) => a.ts - b.ts);
  return sorted.slice(sorted.length - cap);
}

/** Old per-second series are the bulk of the payload; compact them. */
export function compactOldSeries(
  tests: readonly TestRecord[],
  keepDetailed: number,
): TestRecord[] {
  const sorted = tests.slice().sort((a, b) => b.ts - a.ts);
  return sorted.map((t, i) => (i < keepDetailed ? t : { ...t, perSecond: [] }));
}

export function personalBest(
  tests: readonly TestRecord[],
  f: HistoryFilter = {},
): TestRecord | null {
  const pool = filterTests(tests, f);
  if (pool.length === 0) return null;
  return pool.reduce((best, t) => (t.wpm > best.wpm ? t : best));
}

export function averageWpm(tests: readonly TestRecord[]): number {
  if (tests.length === 0) return 0;
  return Math.round((tests.reduce((a, t) => a + t.wpm, 0) / tests.length) * 10) / 10;
}

export interface NewTestInput {
  metrics: Metrics;
  mode: string;
  lang: LanguageId;
  layout: string;
  duration: number;
  config: TestConfigSnapshot;
  lessonId?: string;
  now?: number;
}

export function makeTestRecord(input: NewTestInput): TestRecord {
  const m = input.metrics;
  const ts = input.now ?? Date.now();
  const rec: TestRecord = {
    id: `${ts.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    ts,
    mode: input.mode,
    lang: input.lang,
    layout: input.layout,
    duration: input.duration,
    config: input.config,
    wpm: m.wpm,
    raw: m.rawWpm,
    cpm: m.cpm,
    accuracy: m.accuracy,
    consistency: m.consistency,
    errors: m.errors,
    uncorrectedErrors: m.uncorrectedErrors,
    keystrokes: m.keystrokes,
    correctKeystrokes: m.correctKeystrokes,
    correctChars: m.correctChars,
    skippedChars: m.skippedChars,
    correctWords: m.correctWords,
    incorrectWords: m.incorrectWords,
    timeMs: m.timeMs,
    perSecond: m.perSecond.slice(),
  };
  if (input.lessonId) rec.lessonId = input.lessonId;
  return rec;
}

export const historyRepo = {
  async all(): Promise<TestRecord[]> {
    if (!idb.available()) return [];
    const rows = await idb.all<TestRecord>(STORES.tests);
    return rows.sort((a, b) => a.ts - b.ts);
  },
  async add(record: TestRecord, cap: number): Promise<void> {
    if (!idb.available()) return;
    await idb.put(STORES.tests, record);
    const count = await idb.count(STORES.tests);
    if (cap > 0 && count > cap) {
      const excess = count - cap;
      const oldest = await idb.oldestIds(STORES.tests, excess);
      for (const key of oldest) await idb.delete(STORES.tests, key);
    }
  },
  async clear(): Promise<void> {
    if (!idb.available()) return;
    await idb.clear(STORES.tests);
  },
};
