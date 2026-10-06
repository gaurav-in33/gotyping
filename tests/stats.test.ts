import { describe, expect, it } from 'vitest';
import {
  activityDays,
  computeOverview,
  emptyOverview,
  recordsByGroup,
  streakDays,
  topErrorPairs,
} from '../src/store/stats';
import { isoDay } from '../src/store/aggregates';
import type { TestRecord } from '../src/store/types';

const DAY = 24 * 60 * 60 * 1000;

function rec(overrides: Partial<TestRecord>): TestRecord {
  return {
    id: Math.random().toString(36),
    ts: Date.now(),
    mode: 'time',
    lang: 'en',
    layout: 'qwerty',
    duration: 30,
    config: {
      style: 'words',
      punctuation: false,
      numbers: false,
      capitalization: false,
      stopOnError: false,
      backspace: 'allow',
    },
    wpm: 50,
    raw: 55,
    cpm: 250,
    accuracy: 96,
    consistency: 80,
    errors: 2,
    uncorrectedErrors: 1,
    keystrokes: 250,
    correctKeystrokes: 240,
    correctChars: 240,
    skippedChars: 0,
    correctWords: 48,
    incorrectWords: 2,
    timeMs: 30000,
    perSecond: [],
    ...overrides,
  };
}

describe('overview', () => {
  it('is all zero with no tests', () => {
    expect(computeOverview([], {})).toEqual(emptyOverview());
  });

  it('averages wpm/accuracy and finds the best', () => {
    const tests = [rec({ wpm: 40, accuracy: 90 }), rec({ wpm: 60, accuracy: 98 })];
    const o = computeOverview(tests, {});
    expect(o.count).toBe(2);
    expect(o.avgWpm).toBe(50);
    expect(o.avgAccuracy).toBe(94);
    expect(o.bestWpm).toBe(60);
  });
});

describe('streakDays', () => {
  it('is 0 with no activity', () => {
    expect(streakDays({}, Date.now())).toBe(0);
  });

  it('counts consecutive days back from today', () => {
    const today = Date.now();
    const days = {
      [isoDay(today)]: { tests: 1, timeMs: 1000, keystrokes: 10, wpmSum: 50 },
      [isoDay(today - DAY)]: { tests: 2, timeMs: 1000, keystrokes: 10, wpmSum: 50 },
      [isoDay(today - 2 * DAY)]: { tests: 1, timeMs: 1000, keystrokes: 10, wpmSum: 50 },
    };
    expect(streakDays(days, today)).toBe(3);
  });

  it('still counts yesterday as a live streak if today has nothing yet', () => {
    const today = Date.now();
    const days = { [isoDay(today - DAY)]: { tests: 1, timeMs: 1, keystrokes: 1, wpmSum: 1 } };
    expect(streakDays(days, today)).toBe(1);
  });

  it('breaks on a gap', () => {
    const today = Date.now();
    const days = {
      [isoDay(today)]: { tests: 1, timeMs: 1, keystrokes: 1, wpmSum: 1 },
      [isoDay(today - 2 * DAY)]: { tests: 1, timeMs: 1, keystrokes: 1, wpmSum: 1 },
    };
    expect(streakDays(days, today)).toBe(1);
  });
});

describe('activityDays', () => {
  it('returns weeks*7 days, oldest first, ending today', () => {
    const today = Date.now();
    const out = activityDays({}, 2, today);
    expect(out.length).toBe(14);
    expect(out[out.length - 1]!.date).toBe(isoDay(today));
  });

  it('fills in known activity', () => {
    const today = Date.now();
    const days = { [isoDay(today)]: { tests: 3, timeMs: 100, keystrokes: 1, wpmSum: 1 } };
    const out = activityDays(days, 1, today);
    expect(out[out.length - 1]!.tests).toBe(3);
    expect(out[0]!.tests).toBe(0);
  });
});

describe('recordsByGroup', () => {
  it('keeps the best wpm per lang/mode/duration group', () => {
    const tests = [
      rec({ lang: 'en', mode: 'time', duration: 30, wpm: 40 }),
      rec({ lang: 'en', mode: 'time', duration: 30, wpm: 55 }),
      rec({ lang: 'en', mode: 'words', duration: 0, wpm: 70 }),
    ];
    const groups = recordsByGroup(tests);
    expect(groups.length).toBe(2);
    const time30 = groups.find((g) => g.key === 'en:time:30');
    expect(time30?.best.wpm).toBe(55);
  });
});

describe('topErrorPairs', () => {
  it('sorts by count, descending, and splits the pair', () => {
    const pairs = topErrorPairs({ 'a→s': 5, 'e→r': 9, 'i→o': 1 }, 2);
    expect(pairs.length).toBe(2);
    expect(pairs[0]).toEqual({ pair: 'e→r', expected: 'e', typed: 'r', count: 9 });
    expect(pairs[1]!.count).toBe(5);
  });
});
