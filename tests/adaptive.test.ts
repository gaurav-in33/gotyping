import { describe, expect, it } from 'vitest';
import {
  MIN_SAMPLES,
  isScored,
  medianLatency,
  needMap,
  needScore,
  smoothedErrorRate,
} from '../src/core/adaptive/scoring';
import { planPracticeText } from '../src/core/adaptive/planner';
import { PROFILES, profileById } from '../src/core/adaptive/profiles';
import { EASY_WORD_SHARE } from '../src/store/settings';
import { emptyAggregates, type Aggregates, type StatCell } from '../src/store/types';

function cell(count: number, errors: number, meanMs: number): StatCell {
  return { count, errors, sum: meanMs * count, sumSq: meanMs * meanMs * count };
}

describe('adaptive scoring (docs/05)', () => {
  it('smooths error rate so one mistake does not dominate a small sample', () => {
    const c = cell(1, 1, 100);
    expect(smoothedErrorRate(c)).toBeCloseTo(2 / 3, 5);
  });

  it('respects the minimum-sample threshold', () => {
    expect(isScored(cell(MIN_SAMPLES - 1, 0, 100))).toBe(false);
    expect(isScored(cell(MIN_SAMPLES, 0, 100))).toBe(true);
  });

  it('scores a high-error key higher than a clean key, weights=error-only', () => {
    const bad = needScore(cell(20, 10, 100), 100, { error: 1, latency: 0 });
    const good = needScore(cell(20, 0, 100), 100, { error: 1, latency: 0 });
    expect(bad).toBeGreaterThan(good);
  });

  it('scores a slow key higher than a fast key, weights=latency-only', () => {
    const slow = needScore(cell(20, 0, 300), 100, { error: 0, latency: 1 });
    const fast = needScore(cell(20, 0, 100), 100, { error: 0, latency: 1 });
    expect(slow).toBeGreaterThan(fast);
  });

  it('computes the median of per-cell means', () => {
    const cells: Record<string, StatCell> = {
      a: cell(10, 0, 100),
      b: cell(10, 0, 200),
      c: cell(10, 0, 300),
    };
    expect(medianLatency(cells)).toBe(200);
  });

  it('needMap only includes cells that cleared the sample threshold', () => {
    const cells: Record<string, StatCell> = {
      scored: cell(MIN_SAMPLES, 3, 150),
      tooFew: cell(2, 2, 500),
    };
    const m = needMap(cells, { error: 1, latency: 0 });
    expect(m.has('scored')).toBe(true);
    expect(m.has('tooFew')).toBe(false);
  });
});

describe('adaptive profiles', () => {
  it('ships at least the six documented, implemented profiles', () => {
    const ids = PROFILES.map((p) => p.id);
    for (const id of ['weak-keys', 'slow-keys', 'difficult-words', 'accuracy', 'speed', 'endurance']) {
      expect(ids).toContain(id);
    }
  });

  it('profileById falls back to the first profile for an unknown id', () => {
    expect(profileById('nonexistent').id).toBe(PROFILES[0]!.id);
  });

  it('difficulty rates match the owner spec (easy 30% / normal 15% / hard 5%)', () => {
    expect(EASY_WORD_SHARE.easy).toBeCloseTo(0.3);
    expect(EASY_WORD_SHARE.normal).toBeCloseTo(0.15);
    expect(EASY_WORD_SHARE.hard).toBeCloseTo(0.05);
  });
});

describe('practice planner (deterministic, seeded)', () => {
  const pool = ['cat', 'dog', 'bird', 'fish', 'frog', 'lion', 'bear', 'wolf'];

  it('falls back to a plain uniform sample with empty history', () => {
    const agg = emptyAggregates();
    const plan = planPracticeText({
      pool,
      agg,
      profile: profileById('weak-keys'),
      count: 20,
      seed: 'seed-1',
      easyShare: 0.15,
    });
    expect(plan.usedFallback).toBe(true);
    expect(plan.words.length).toBe(20);
    for (const w of plan.words) expect(pool).toContain(w);
  });

  it('is deterministic for a given seed', () => {
    const agg = emptyAggregates();
    agg.keys['a'] = cell(MIN_SAMPLES, 7, 100);
    const run = () =>
      planPracticeText({
        pool,
        agg,
        profile: profileById('weak-keys'),
        count: 30,
        seed: 'fixed-seed',
        easyShare: 0.15,
      }).words;
    expect(run()).toEqual(run());
  });

  // A larger, realistic-sized pool — the variety guard (no repeat within 8)
  // is meant to stop monotony in a real word list, not force round-robin
  // over a handful of words, so skew tests need enough words to show it.
  const bigPool = [
    'cat', 'dog', 'bird', 'fish', 'frog', 'lion', 'bear', 'wolf',
    'moon', 'star', 'river', 'stone', 'cloud', 'field', 'ocean', 'forest',
    'eagle', 'tiger', 'horse', 'camel', 'zebra', 'snake', 'mouse', 'otter',
  ];

  it('weak-keys profile leans toward words containing the error-prone key', () => {
    const agg = emptyAggregates();
    // 'a' is heavily mistyped; 'o' is clean.
    agg.keys['a'] = cell(40, 30, 100);
    agg.keys['o'] = cell(40, 0, 100);
    const plan = planPracticeText({
      pool: bigPool,
      agg,
      profile: profileById('weak-keys'),
      count: 300,
      seed: 'weak-a',
      easyShare: 0,
    });
    expect(plan.usedFallback).toBe(false);
    const aWords = bigPool.filter((w) => w.includes('a') && !w.includes('o'));
    const oWords = bigPool.filter((w) => w.includes('o') && !w.includes('a'));
    const avgShare = (group: string[]) =>
      group.reduce((sum, w) => sum + plan.words.filter((x) => x === w).length, 0) / group.length;
    expect(avgShare(aWords)).toBeGreaterThan(avgShare(oWords));
  });

  it('caps any single word at roughly 30% of the generated text', () => {
    const agg = emptyAggregates();
    agg.keys['c'] = cell(50, 45, 100); // only "cat"/"camel" contain 'c' in this pool
    const plan = planPracticeText({
      pool: bigPool,
      agg,
      profile: profileById('weak-keys'),
      count: 100,
      seed: 'cap-test',
      easyShare: 0,
    });
    const counts = new Map<string, number>();
    for (const w of plan.words) counts.set(w, (counts.get(w) ?? 0) + 1);
    const max = Math.max(...counts.values());
    expect(max).toBeLessThanOrEqual(Math.ceil(100 * 0.3) + 1);
  });

  it('difficult-words profile scores from agg.words, not agg.keys', () => {
    const agg: Aggregates = emptyAggregates();
    agg.words['dog'] = cell(MIN_SAMPLES, 8, 100);
    const plan = planPracticeText({
      pool: bigPool,
      agg,
      profile: profileById('difficult-words'),
      count: 300,
      seed: 'diff-words',
      easyShare: 0,
    });
    const dogShare = plan.words.filter((w) => w === 'dog').length / plan.words.length;
    const others = bigPool.filter((w) => w !== 'dog');
    const otherShare =
      plan.words.filter((w) => w !== 'dog').length / plan.words.length / others.length;
    expect(dogShare).toBeGreaterThan(otherShare);
  });

  it('reports the top needs driving the plan', () => {
    const agg = emptyAggregates();
    agg.keys['a'] = cell(30, 20, 100);
    const plan = planPracticeText({
      pool,
      agg,
      profile: profileById('weak-keys'),
      count: 40,
      seed: 'top-needs',
      easyShare: 0.15,
    });
    expect(plan.topNeeds.length).toBeGreaterThan(0);
    expect(plan.topNeeds[0]!.item).toBe('a');
  });

  it('handles an empty pool without throwing', () => {
    const plan = planPracticeText({
      pool: [],
      agg: emptyAggregates(),
      profile: profileById('speed'),
      count: 10,
      seed: 'empty-pool',
      easyShare: 0.15,
    });
    expect(plan.words).toEqual([]);
    expect(plan.usedFallback).toBe(true);
  });
});
