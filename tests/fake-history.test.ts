import { describe, expect, it } from 'vitest';
import { generateFakeHistory } from '../src/dev/fakeHistory';

describe('dev-only fake history generator', () => {
  it('produces the requested number of plausible records', () => {
    const { tests } = generateFakeHistory({ count: 50, seed: 'a' });
    expect(tests.length).toBe(50);
    for (const t of tests) {
      expect(t.wpm).toBeGreaterThan(0);
      expect(t.accuracy).toBeGreaterThanOrEqual(0);
      expect(t.accuracy).toBeLessThanOrEqual(100);
      expect(t.ts).toBeLessThanOrEqual(Date.now());
    }
  });

  it('is deterministic for a given seed and clock', () => {
    const now = 1_700_000_000_000;
    const a = generateFakeHistory({ count: 20, seed: 'fixed', now });
    const b = generateFakeHistory({ count: 20, seed: 'fixed', now });
    expect(a.tests).toEqual(b.tests);
  });

  it('spreads timestamps across the requested day range, oldest first', () => {
    const { tests } = generateFakeHistory({ count: 30, seed: 'spread', days: 10 });
    expect(tests[0]!.ts).toBeLessThan(tests[tests.length - 1]!.ts);
  });

  it('also produces aggregate data for keys/words/days', () => {
    const { aggregates } = generateFakeHistory({ count: 200, seed: 'agg' });
    expect(Object.keys(aggregates.keys).length).toBeGreaterThan(0);
    expect(Object.keys(aggregates.days).length).toBeGreaterThan(0);
  });

  it('scales to a large (5000) history without throwing', () => {
    const { tests } = generateFakeHistory({ count: 5000, seed: 'big' });
    expect(tests.length).toBe(5000);
  });
});
