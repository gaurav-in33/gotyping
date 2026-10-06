import { describe, expect, it } from 'vitest';
import { xpForTest, xpForLesson, xpForChallenge, xpForStreakDay } from '../src/core/progress/xp';
import { levelForXp, xpToNextLevel } from '../src/core/progress/levels';
import { currentStreak, longestStreak } from '../src/core/progress/streaks';
import { evaluateAchievements, emptySnapshot, isUnlocked, ACHIEVEMENTS } from '../src/core/progress/achievements';
import {
  dailyChallenge,
  weeklyChallenge,
  evaluateChallenge,
  isoWeekKey,
  dateKey,
  speedLadderChallenge,
  SPEED_LADDER_RUNGS,
} from '../src/core/progress/challenges';

describe('xp (docs/01 Challenges)', () => {
  it('awards more xp for a faster test of the same length/accuracy', () => {
    const slow = xpForTest({ wpm: 30, accuracy: 100, timeMs: 30_000, consistency: 80 });
    const fast = xpForTest({ wpm: 60, accuracy: 100, timeMs: 30_000, consistency: 80 });
    expect(fast).toBeGreaterThan(slow);
  });

  it('never goes below the floor, even for a tiny recordable test', () => {
    expect(xpForTest({ wpm: 1, accuracy: 10, timeMs: 2100, consistency: 0 })).toBeGreaterThanOrEqual(5);
  });

  it('accuracy multiplier rewards a clean test over a sloppy one at equal speed', () => {
    const clean = xpForTest({ wpm: 50, accuracy: 100, timeMs: 30_000, consistency: 90 });
    const sloppy = xpForTest({ wpm: 50, accuracy: 60, timeMs: 30_000, consistency: 90 });
    expect(clean).toBeGreaterThan(sloppy);
  });

  it('lesson xp is higher for a pass than a fail', () => {
    expect(xpForLesson(true)).toBeGreaterThan(xpForLesson(false));
  });

  it('challenge xp scales with tier', () => {
    expect(xpForChallenge(3)).toBeGreaterThan(xpForChallenge(1));
  });

  it('streak xp grows but is capped', () => {
    expect(xpForStreakDay(1)).toBeLessThan(xpForStreakDay(10));
    expect(xpForStreakDay(10_000)).toBeLessThanOrEqual(100);
  });
});

describe('levels', () => {
  it('level 1 needs the base amount of xp', () => {
    expect(xpToNextLevel(1)).toBeGreaterThan(0);
  });

  it('0 xp is level 1 with nothing earned into it', () => {
    const info = levelForXp(0);
    expect(info.level).toBe(1);
    expect(info.xpIntoLevel).toBe(0);
  });

  it('exactly enough xp rolls over into the next level', () => {
    const need = xpToNextLevel(1);
    const info = levelForXp(need);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(0);
  });

  it('is monotonic: more xp never produces a lower level', () => {
    const a = levelForXp(500);
    const b = levelForXp(5000);
    expect(b.level).toBeGreaterThanOrEqual(a.level);
  });
});

describe('streaks (with grace day)', () => {
  const keyOf = (ts: number) => new Date(ts).toISOString().slice(0, 10);
  const DAY = 24 * 60 * 60 * 1000;
  const today = Date.UTC(2026, 0, 10); // 2026-01-10

  it('counts consecutive active days ending today', () => {
    const days = new Set([keyOf(today), keyOf(today - DAY), keyOf(today - 2 * DAY)]);
    expect(currentStreak(days, keyOf, today, 0).streak).toBe(3);
  });

  it('does not break the streak if only today is missing', () => {
    const days = new Set([keyOf(today - DAY), keyOf(today - 2 * DAY)]);
    expect(currentStreak(days, keyOf, today, 0).streak).toBe(2);
  });

  it('breaks without grace on a genuine gap', () => {
    const days = new Set([keyOf(today), keyOf(today - 2 * DAY)]); // missing yesterday
    expect(currentStreak(days, keyOf, today, 0).streak).toBe(1);
  });

  it('a grace day bridges exactly one missed day', () => {
    const days = new Set([keyOf(today), keyOf(today - 2 * DAY), keyOf(today - 3 * DAY)]); // missing yesterday
    const r = currentStreak(days, keyOf, today, 1);
    expect(r.streak).toBe(3);
    expect(r.graceUsed).toBe(1);
  });

  it('longestStreak finds the best run in a range, independent of the current one', () => {
    const days = new Set([
      keyOf(today - 10 * DAY),
      keyOf(today - 9 * DAY),
      keyOf(today - 8 * DAY),
      keyOf(today), // isolated single day
    ]);
    expect(longestStreak(days, keyOf, today - 10 * DAY, today)).toBe(3);
  });
});

describe('achievements', () => {
  it('has no duplicate ids and every id has a working check', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
    const snap = emptySnapshot();
    for (const a of ACHIEVEMENTS) {
      expect(() => isUnlocked(a.id, snap)).not.toThrow();
    }
  });

  it('ships at least 25 achievements across more than one category', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(25);
    const categories = new Set(ACHIEVEMENTS.map((a) => a.category));
    expect(categories.size).toBeGreaterThan(3);
  });

  it('an empty snapshot unlocks nothing', () => {
    const results = evaluateAchievements(emptySnapshot());
    expect(results.every((r) => !r.unlocked)).toBe(true);
  });

  it('first-test unlocks once a test exists, others stay locked', () => {
    const snap = { ...emptySnapshot(), totalTests: 1 };
    expect(isUnlocked('first-test', snap)).toBe(true);
    expect(isUnlocked('tests-50', snap)).toBe(false);
  });

  it('all-languages requires every language, not just two', () => {
    const snap = { ...emptySnapshot(), languagesTested: new Set(['en', 'hi']) };
    expect(isUnlocked('all-languages', snap)).toBe(false);
    snap.languagesTested = new Set(['en', 'hi', 'hinglish']);
    expect(isUnlocked('all-languages', snap)).toBe(true);
  });
});

describe('challenges (daily/weekly deterministic seeding)', () => {
  it('the same date always produces the same daily challenge', () => {
    const d = new Date(Date.UTC(2026, 9, 6));
    expect(dailyChallenge(d)).toEqual(dailyChallenge(new Date(Date.UTC(2026, 9, 6))));
  });

  it('different dates usually produce different targets', () => {
    const a = dailyChallenge(new Date(Date.UTC(2026, 9, 6)));
    const b = dailyChallenge(new Date(Date.UTC(2026, 9, 7)));
    expect(a.id).not.toBe(b.id);
  });

  it('the same ISO week always produces the same weekly challenge', () => {
    const a = weeklyChallenge(new Date(Date.UTC(2026, 9, 6))); // Tuesday
    const b = weeklyChallenge(new Date(Date.UTC(2026, 9, 8))); // Thursday, same week
    expect(a).toEqual(b);
  });

  it('dateKey and isoWeekKey are stable formats', () => {
    expect(dateKey(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
    expect(isoWeekKey(new Date(Date.UTC(2026, 0, 5)))).toMatch(/^2026-W\d{2}$/);
  });

  it('evaluateChallenge checks wpm/accuracy/errors/duration thresholds', () => {
    const def = dailyChallenge(new Date(Date.UTC(2026, 9, 6)));
    const good = {
      mode: 'time',
      wpm: 999,
      accuracy: 100,
      errors: 0,
      timeMs: def.target.seconds! * 1000,
      duration: def.target.seconds!,
    };
    expect(evaluateChallenge(def, good)).toBe(true);
    expect(evaluateChallenge(def, { ...good, wpm: 0 })).toBe(false);
    expect(evaluateChallenge(def, { ...good, accuracy: 0 })).toBe(false);
  });

  it('speed ladder rungs increase and clamp at the edges', () => {
    expect(speedLadderChallenge(0).target.minWpm).toBe(SPEED_LADDER_RUNGS[0]);
    expect(speedLadderChallenge(999).target.minWpm).toBe(SPEED_LADDER_RUNGS[SPEED_LADDER_RUNGS.length - 1]);
    expect(speedLadderChallenge(-5).target.minWpm).toBe(SPEED_LADDER_RUNGS[0]);
  });
});

describe('buildSnapshot (store/progress) — pure aggregation over history', () => {
  it('summarizes an empty history without throwing', async () => {
    const { buildSnapshot } = await import('../src/store/progress');
    const snap = buildSnapshot([], [], 53, 0, 0, 0);
    expect(snap.totalTests).toBe(0);
    expect(snap.totalLessons).toBe(53);
  });

  it('tracks best wpm, perfect-accuracy streak and zero-mistake duration', async () => {
    const { buildSnapshot } = await import('../src/store/progress');
    const mk = (over: Partial<import('../src/store/types').TestRecord>) => ({
      id: Math.random().toString(36),
      ts: over.ts ?? Date.now(),
      mode: 'time',
      lang: 'en' as const,
      layout: 'qwerty',
      duration: 30,
      config: { style: 'words', punctuation: false, numbers: false, capitalization: false, stopOnError: false, backspace: 'allow' },
      wpm: 40,
      raw: 42,
      cpm: 200,
      accuracy: 100,
      consistency: 80,
      errors: 0,
      uncorrectedErrors: 0,
      keystrokes: 100,
      correctKeystrokes: 100,
      correctChars: 100,
      skippedChars: 0,
      correctWords: 20,
      incorrectWords: 0,
      timeMs: 30_000,
      perSecond: [],
      ...over,
    });
    const tests = [
      mk({ ts: 1, wpm: 40, accuracy: 100, errors: 0 }),
      mk({ ts: 2, wpm: 55, accuracy: 100, errors: 0 }),
      mk({ ts: 3, wpm: 30, accuracy: 80, errors: 5 }),
    ];
    const snap = buildSnapshot(tests, [], 53, 2, 0, 0);
    expect(snap.bestWpm).toBe(55);
    expect(snap.maxConsecutivePerfect).toBe(2);
    expect(snap.anyAccuracy100).toBe(true);
    expect(snap.longestZeroMistakeTestMs).toBe(30_000);
    expect(snap.languagesTested.has('en')).toBe(true);
  });
});
