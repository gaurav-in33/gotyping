/**
 * Folding a finished test's capture buffer into aggregates.
 * Pure functions — the DB layer just persists the result.
 * Aggregates update once per finished test (never per keystroke).
 */
import type { Capture } from '../core/engine/session';
import { fingerForCode } from '../core/layouts/fingers';
import { reverseIndex, QWERTY } from '../core/layouts/qwerty';
import {
  emptyCell,
  type Aggregates,
  type StatCell,
  type TestRecord,
} from './types';

const qwertyReverse = reverseIndex(QWERTY);

function bump(map: Record<string, StatCell>, key: string, latency: number, ok: boolean): void {
  let cell = map[key];
  if (!cell) {
    cell = emptyCell();
    map[key] = cell;
  }
  cell.count++;
  if (!ok) cell.errors++;
  cell.sum += latency;
  cell.sumSq += latency * latency;
}

/** Latency outliers (thinking pauses) would wreck the mean; clamp them. */
const MAX_LATENCY = 2000;

export function foldCapture(agg: Aggregates, capture: readonly Capture[]): Aggregates {
  // Per-key, per-finger, error pairs
  for (let i = 0; i < capture.length; i++) {
    const c = capture[i]!;
    const expected = c.expected;
    if (expected === null) continue;
    const latency = Math.min(c.latencyMs, MAX_LATENCY);

    bump(agg.keys, expected, latency, c.ok);

    const phys = qwertyReverse.get(expected.toLowerCase());
    const finger = phys ? fingerForCode(phys.code) : null;
    if (finger) bump(agg.fingers, finger, latency, c.ok);

    if (!c.ok) {
      const pair = `${expected}→${c.typed}`;
      agg.errorPairs[pair] = (agg.errorPairs[pair] ?? 0) + 1;
    }
  }

  // Bigrams / trigrams over the expected stream
  for (let i = 1; i < capture.length; i++) {
    const a = capture[i - 1]!;
    const b = capture[i]!;
    if (a.expected === null || b.expected === null) continue;
    if (a.expected === ' ' || b.expected === ' ') continue;
    const latency = Math.min(b.latencyMs, MAX_LATENCY);
    bump(agg.bigrams, a.expected + b.expected, latency, a.ok && b.ok);
  }
  for (let i = 2; i < capture.length; i++) {
    const a = capture[i - 2]!;
    const b = capture[i - 1]!;
    const c = capture[i]!;
    if (a.expected === null || b.expected === null || c.expected === null) continue;
    if (a.expected === ' ' || b.expected === ' ' || c.expected === ' ') continue;
    const latency = Math.min(c.latencyMs, MAX_LATENCY);
    bump(agg.trigrams, a.expected + b.expected + c.expected, latency, a.ok && b.ok && c.ok);
  }

  // Words: split the expected stream on spaces
  let word = '';
  let wordOk = true;
  let wordLatency = 0;
  for (let i = 0; i <= capture.length; i++) {
    const c = i < capture.length ? capture[i]! : null;
    const expected = c?.expected ?? ' ';
    if (expected === ' ' || c === null) {
      if (word.length > 1) bump(agg.words, word, wordLatency, wordOk);
      word = '';
      wordOk = true;
      wordLatency = 0;
    } else {
      word += expected;
      if (!c!.ok) wordOk = false;
      wordLatency += Math.min(c!.latencyMs, MAX_LATENCY);
    }
  }

  return agg;
}

export function isoDay(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function foldTest(
  agg: Aggregates,
  record: TestRecord,
  capture: readonly Capture[],
): Aggregates {
  foldCapture(agg, capture);
  const key = isoDay(record.ts);
  const day = agg.days[key] ?? { tests: 0, timeMs: 0, keystrokes: 0, wpmSum: 0 };
  day.tests++;
  day.timeMs += record.timeMs;
  day.keystrokes += record.keystrokes;
  day.wpmSum += record.wpm;
  agg.days[key] = day;
  return agg;
}

/** Top-N entries of a map by a scoring function. */
export function topBy(
  map: Record<string, StatCell>,
  score: (c: StatCell) => number,
  n: number,
  minCount = 1,
): Array<{ key: string; cell: StatCell; score: number }> {
  return Object.entries(map)
    .filter(([, c]) => c.count >= minCount)
    .map(([key, cell]) => ({ key, cell, score: score(cell) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
