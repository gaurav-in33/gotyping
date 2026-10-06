import { describe, expect, it } from 'vitest';
import {
  computeMetrics,
  consistencyOf,
  isRecordable,
  stdev,
  wordCounts,
  UNIT_CORRECT,
  UNIT_PENDING,
  UNIT_SKIPPED,
  UNIT_WRONG,
} from '../src/core/engine/metrics';

const states = (xs: number[]): Uint8Array => Uint8Array.from(xs);

describe('stdev', () => {
  it('matches a hand-computed value', () => {
    // mean 4, deviations -2,-1,0,1,2 -> variance 10/5 = 2
    expect(stdev([2, 3, 4, 5, 6])).toBeCloseTo(Math.SQRT2, 10);
  });
  it('is 0 for an empty or constant series', () => {
    expect(stdev([])).toBe(0);
    expect(stdev([7, 7, 7])).toBe(0);
  });
});

describe('consistency', () => {
  it('needs at least three samples', () => {
    expect(consistencyOf([60, 60])).toBe(0);
  });
  it('is 100 for a perfectly even series', () => {
    expect(consistencyOf([60, 60, 60, 60])).toBe(100);
  });
  it('drops as variance grows', () => {
    const even = consistencyOf([60, 60, 60, 60]);
    const uneven = consistencyOf([20, 60, 100, 60]);
    expect(uneven).toBeLessThan(even);
    expect(uneven).toBeGreaterThanOrEqual(0);
  });
  it('never goes negative', () => {
    expect(consistencyOf([0, 0, 200])).toBeGreaterThanOrEqual(0);
  });
});

describe('wordCounts', () => {
  it('counts correct, incorrect and skipped words', () => {
    //  a b   c d   e f
    const units = ['a', 'b', ' ', 'c', 'd', ' ', 'e', 'f'];
    const st = states([
      UNIT_CORRECT,
      UNIT_CORRECT,
      UNIT_CORRECT,
      UNIT_CORRECT,
      UNIT_WRONG,
      UNIT_CORRECT,
      UNIT_SKIPPED,
      UNIT_SKIPPED,
    ]);
    expect(wordCounts(units, st)).toEqual({ correct: 1, incorrect: 1, skipped: 1 });
  });

  it('ignores untouched words', () => {
    const units = ['a', ' ', 'b'];
    const st = states([UNIT_CORRECT, UNIT_CORRECT, UNIT_PENDING]);
    expect(wordCounts(units, st)).toEqual({ correct: 1, incorrect: 0, skipped: 0 });
  });
});

describe('computeMetrics', () => {
  it('uses the documented formulas', () => {
    // 25 correct chars in 60s -> 25/5/1 = 5 wpm; 30 keystrokes -> raw 6
    const units = Array(25).fill('a') as string[];
    const m = computeMetrics({
      states: states(Array(25).fill(UNIT_CORRECT)),
      units,
      keystrokes: 30,
      mistakes: 5,
      activeMs: 60000,
      perSecond: [],
    });
    expect(m.wpm).toBe(5);
    expect(m.rawWpm).toBe(6);
    expect(m.cpm).toBe(25);
    expect(m.correctKeystrokes).toBe(25);
    expect(m.accuracy).toBeCloseTo(83.3, 1);
    expect(m.errors).toBe(5);
  });

  it('returns zeros rather than NaN with no elapsed time', () => {
    const m = computeMetrics({
      states: states([]),
      units: [],
      keystrokes: 0,
      mistakes: 0,
      activeMs: 0,
      perSecond: [],
    });
    expect(m.wpm).toBe(0);
    expect(m.rawWpm).toBe(0);
    expect(m.cpm).toBe(0);
    expect(m.accuracy).toBe(100);
  });
});

describe('short-test guard', () => {
  const base = {
    states: states([UNIT_CORRECT]),
    units: ['a'],
    mistakes: 0,
    perSecond: [],
  };
  it('rejects tests under 2 seconds', () => {
    const m = computeMetrics({ ...base, keystrokes: 50, activeMs: 1500 });
    expect(isRecordable(m)).toBe(false);
  });
  it('rejects tests under 5 keystrokes', () => {
    const m = computeMetrics({ ...base, keystrokes: 4, activeMs: 10000 });
    expect(isRecordable(m)).toBe(false);
  });
  it('accepts anything above both thresholds', () => {
    const m = computeMetrics({ ...base, keystrokes: 5, activeMs: 2000 });
    expect(isRecordable(m)).toBe(true);
  });
});
