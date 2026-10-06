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
import { PROFILES, profileById, recommendProfile } from '../src/core/adaptive/profiles';
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
  it('ships all ten documented profiles', () => {
    const ids = PROFILES.map((p) => p.id);
    expect(ids).toEqual([
      'weak-keys',
      'slow-keys',
      'difficult-words',
      'accuracy',
      'speed',
      'endurance',
      'error-recovery',
      'bigram-trainer',
      'trigram-trainer',
      'consistency-drill',
    ]);
  });

  it('every profile reuses the shared scoring pipeline (mode + weights), no bespoke fields beyond session tweaks', () => {
    for (const p of PROFILES) {
      expect(['keys', 'words', 'bigrams', 'trigrams']).toContain(p.mode);
      expect(typeof p.weights.error).toBe('number');
      expect(typeof p.weights.latency).toBe('number');
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

  it('recommends a gentle fallback with no history', () => {
    expect(recommendProfile(emptyAggregates()).id).toBe('difficult-words');
  });

  it('recommends slow-keys when latency is the dominant signal', () => {
    const agg = emptyAggregates();
    // 'a' is far slower than the user's own median; neither key has errors.
    agg.keys['a'] = cell(MIN_SAMPLES, 0, 400);
    agg.keys['b'] = cell(MIN_SAMPLES, 0, 100);
    expect(recommendProfile(agg).id).toBe('slow-keys');
  });

  it('recommends weak-keys when error rate is the dominant signal', () => {
    const agg = emptyAggregates();
    agg.keys['a'] = cell(MIN_SAMPLES, 7, 100); // lots of errors, normal speed
    expect(recommendProfile(agg).id).toBe('weak-keys');
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

  it('bigram-trainer scores words by their two-letter windows, from agg.bigrams', () => {
    const agg = emptyAggregates();
    // "th" is a weak bigram; words containing it should be favored.
    agg.bigrams['th'] = cell(MIN_SAMPLES, 7, 100);
    const plan = planPracticeText({
      pool: bigPool, // includes "star" (no 'th') and we add a 'th' word below
      agg,
      profile: profileById('bigram-trainer'),
      count: 300,
      seed: 'bigram-seed',
      easyShare: 0,
    });
    expect(plan.usedFallback).toBe(false);
    expect(plan.topNeeds[0]!.item).toBe('th');
  });

  it('bigram-trainer favors a word containing the weak bigram over one that does not', () => {
    const agg = emptyAggregates();
    agg.bigrams['th'] = cell(MIN_SAMPLES, 8, 100);
    // A pool large enough that the variety guard does not force round-robin.
    const withBigram = ['moth', 'cloth', 'bath', 'path', 'math', 'earth', 'month', 'worth'];
    const without = ['star', 'moon', 'river', 'camel', 'zebra', 'snake', 'otter', 'eagle'];
    const plan = planPracticeText({
      pool: [...withBigram, ...without],
      agg,
      profile: profileById('bigram-trainer'),
      count: 400,
      seed: 'bigram-pick',
      easyShare: 0,
    });
    const a = withBigram.reduce((s, w) => s + plan.words.filter((x) => x === w).length, 0) / withBigram.length;
    const b = without.reduce((s, w) => s + plan.words.filter((x) => x === w).length, 0) / without.length;
    expect(a).toBeGreaterThan(b);
  });

  it('trigram-trainer scores words by their three-letter windows, from agg.trigrams', () => {
    const agg = emptyAggregates();
    agg.trigrams['igh'] = cell(MIN_SAMPLES, 8, 100);
    const withTrigram = ['night', 'light', 'sight', 'right', 'flight', 'bright', 'eight', 'might'];
    const without = ['star', 'moon', 'river', 'camel', 'zebra', 'snake', 'otter', 'eagle'];
    const plan = planPracticeText({
      pool: [...withTrigram, ...without],
      agg,
      profile: profileById('trigram-trainer'),
      count: 400,
      seed: 'trigram-pick',
      easyShare: 0,
    });
    expect(plan.usedFallback).toBe(false);
    const a = withTrigram.reduce((s, w) => s + plan.words.filter((x) => x === w).length, 0) / withTrigram.length;
    const b = without.reduce((s, w) => s + plan.words.filter((x) => x === w).length, 0) / without.length;
    expect(a).toBeGreaterThan(b);
  });

  it('error-recovery reacts with far fewer samples than weak-keys needs', () => {
    const agg = emptyAggregates();
    // Only 3 samples — below the engine-wide MIN_SAMPLES, but error-recovery
    // overrides its own minSamples to react to a fresh mistake immediately.
    agg.keys['q'] = cell(3, 3, 100);
    const weak = planPracticeText({
      pool: ['quiz', 'quit', 'quick', 'star', 'moon', 'river'],
      agg,
      profile: profileById('weak-keys'),
      count: 50,
      seed: 'recovery-vs-weak',
      easyShare: 0,
    });
    const recovery = planPracticeText({
      pool: ['quiz', 'quit', 'quick', 'star', 'moon', 'river'],
      agg,
      profile: profileById('error-recovery'),
      count: 50,
      seed: 'recovery-vs-weak',
      easyShare: 0,
    });
    expect(weak.usedFallback).toBe(true); // too few samples for the default threshold
    expect(recovery.usedFallback).toBe(false); // error-recovery's lower threshold picks it up
  });

  it('error-recovery sets stop-on-error so a mistake is corrected before moving on', () => {
    expect(profileById('error-recovery').stopOnError).toBe(true);
  });

  it('consistency-drill produces a roughly even spread with no targeting', () => {
    const agg = emptyAggregates();
    agg.words['dog'] = cell(MIN_SAMPLES, 8, 100); // even with history present...
    const plan = planPracticeText({
      pool: bigPool,
      agg,
      profile: profileById('consistency-drill'),
      count: 400,
      seed: 'consistency-seed',
      easyShare: 0,
    });
    // ...consistency-drill's zero weights mean "dog" is not specially favored.
    const dogShare = plan.words.filter((w) => w === 'dog').length / plan.words.length;
    expect(dogShare).toBeLessThan(2 / bigPool.length);
  });

  it('consistency-drill runs for longer than a normal session', () => {
    expect(profileById('consistency-drill').durationMultiplier).toBeGreaterThan(1);
  });
});
