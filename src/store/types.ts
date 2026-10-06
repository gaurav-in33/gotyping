/** Shared storage record shapes (docs/02 "Storage"). */
import type { LanguageId } from './settings';

export interface TestConfigSnapshot {
  style: string;
  punctuation: boolean;
  numbers: boolean;
  capitalization: boolean;
  stopOnError: boolean;
  backspace: string;
}

export interface TestRecord {
  id: string;
  ts: number;
  mode: string;
  lang: LanguageId;
  layout: string;
  /** Configured duration in seconds for time mode, else 0. */
  duration: number;
  config: TestConfigSnapshot;
  wpm: number;
  raw: number;
  cpm: number;
  accuracy: number;
  consistency: number;
  errors: number;
  uncorrectedErrors: number;
  keystrokes: number;
  correctKeystrokes: number;
  correctChars: number;
  skippedChars: number;
  correctWords: number;
  incorrectWords: number;
  timeMs: number;
  perSecond: number[];
  lessonId?: string;
}

/** Latency stats kept as sum / sum-of-squares so they fold incrementally. */
export interface StatCell {
  count: number;
  errors: number;
  sum: number;
  sumSq: number;
}

export interface Aggregates {
  keys: Record<string, StatCell>;
  bigrams: Record<string, StatCell>;
  trigrams: Record<string, StatCell>;
  words: Record<string, StatCell>;
  /** "expected→typed" -> count */
  errorPairs: Record<string, number>;
  fingers: Record<string, StatCell>;
  /** ISO date (YYYY-MM-DD) -> summary */
  days: Record<string, { tests: number; timeMs: number; keystrokes: number; wpmSum: number }>;
}

export function emptyAggregates(): Aggregates {
  return {
    keys: {},
    bigrams: {},
    trigrams: {},
    words: {},
    errorPairs: {},
    fingers: {},
    days: {},
  };
}

export function emptyCell(): StatCell {
  return { count: 0, errors: 0, sum: 0, sumSq: 0 };
}

/** Mean latency of a cell (0 when unseen). */
export function cellMean(c: StatCell): number {
  return c.count > 0 ? c.sum / c.count : 0;
}

/** Population standard deviation of a cell's latency. */
export function cellStdev(c: StatCell): number {
  if (c.count === 0) return 0;
  const mean = cellMean(c);
  const variance = Math.max(0, c.sumSq / c.count - mean * mean);
  return Math.sqrt(variance);
}

export function cellErrorRate(c: StatCell): number {
  return c.count > 0 ? c.errors / c.count : 0;
}
