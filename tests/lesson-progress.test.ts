import { describe, expect, it } from 'vitest';
import { emptyProgress, foldAttempt, passes } from '../src/store/lessons';

describe('lesson pass rule', () => {
  it('passes when there is no target at all', () => {
    expect(passes(10, 50, null, null)).toBe(true);
  });

  it('fails when accuracy is below target', () => {
    expect(passes(40, 85, null, 90)).toBe(false);
  });

  it('fails when wpm is below target even if accuracy is fine', () => {
    expect(passes(10, 99, 20, 90)).toBe(false);
  });

  it('passes when both targets are cleared', () => {
    expect(passes(25, 95, 20, 90)).toBe(true);
  });
});

describe('lesson progress folding', () => {
  it('starts empty and not completed', () => {
    const p = emptyProgress('x');
    expect(p.completed).toBe(false);
    expect(p.attempts).toBe(0);
  });

  it('marks completed once any attempt passes, and stays completed after', () => {
    let p = emptyProgress('x');
    p = foldAttempt(p, 20, 80, false, 1);
    expect(p.completed).toBe(false);
    expect(p.attempts).toBe(1);

    p = foldAttempt(p, 30, 96, true, 2);
    expect(p.completed).toBe(true);
    expect(p.attempts).toBe(2);

    p = foldAttempt(p, 5, 50, false, 3);
    expect(p.completed).toBe(true); // a bad attempt afterwards does not un-complete it
    expect(p.attempts).toBe(3);
  });

  it('tracks personal bests independently of pass/fail', () => {
    let p = emptyProgress('x');
    p = foldAttempt(p, 40, 70, false, 1);
    p = foldAttempt(p, 20, 99, false, 2);
    expect(p.bestWpm).toBe(40);
    expect(p.bestAccuracy).toBe(99);
  });
});
