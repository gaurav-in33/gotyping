/**
 * docs/07-ACCEPTANCE "Required test suites" lists "theme contrast helper"
 * explicitly. This was missing before — the helper existed and was used by
 * the Step 3 custom theme builder but had no unit tests with hand-computed
 * fixtures. Fixtures below are the textbook WCAG 2.x relative-luminance /
 * contrast-ratio examples, computed by hand against the published formula.
 */
import { describe, expect, it } from 'vitest';
import { contrastRatio, contrastWarnings, luminance, WCAG_AA_NORMAL } from '../src/ui/theme/theme';

describe('luminance', () => {
  it('black is 0, white is 1 (the two WCAG reference endpoints)', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 6);
    expect(luminance('#ffffff')).toBeCloseTo(1, 6);
  });

  it('matches a hand-computed value for a mid-gray (#808080)', () => {
    // sRGB 128/255 = 0.50196; linearize: ((0.50196+0.055)/1.055)^2.4 = 0.21586...
    const c = 128 / 255;
    const linear = Math.pow((c + 0.055) / 1.055, 2.4);
    const expected = 0.2126 * linear + 0.7152 * linear + 0.0722 * linear;
    expect(luminance('#808080')).toBeCloseTo(expected, 10);
  });

  it('is tolerant of a missing leading #', () => {
    expect(luminance('ffffff')).toBeCloseTo(1, 6);
  });

  it('returns 0 for an unparsable string instead of throwing', () => {
    expect(luminance('not-a-color')).toBe(0);
    expect(luminance('#fff')).toBe(0); // 3-digit shorthand is intentionally not supported
  });
});

describe('contrastRatio', () => {
  it('black on white is the maximum WCAG ratio, 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
  });

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#000000'), 10);
  });

  it('identical colors have a ratio of exactly 1', () => {
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 10);
  });

  it('a known AA-passing pair clears 4.5:1', () => {
    // #000000 on #777777: hand-computed luminance of #777777 ≈ 0.1778,
    // ratio = (0.1778+0.05)/(0+0.05) ≈ 4.556 — just over the AA bar.
    const ratio = contrastRatio('#000000', '#777777');
    expect(ratio).toBeGreaterThan(WCAG_AA_NORMAL);
  });

  it('a known AA-failing pair falls under 4.5:1', () => {
    // Light gray on white is a classic low-contrast failure.
    expect(contrastRatio('#cccccc', '#ffffff')).toBeLessThan(WCAG_AA_NORMAL);
  });
});

describe('contrastWarnings', () => {
  it('flags nothing for a fully black-on-white theme', () => {
    const tokens = {
      text: '#000000',
      bg: '#ffffff',
      typed: '#000000',
      untyped: '#000000',
      error: '#000000',
      onAccent: '#ffffff',
      accent: '#000000',
      muted: '#000000',
    };
    expect(contrastWarnings(tokens)).toEqual([]);
  });

  it('flags every low-contrast pair by name, with a rounded ratio', () => {
    const tokens = {
      text: '#eeeeee', // fails against a near-white bg
      bg: '#ffffff',
      typed: '#000000', // passes
      untyped: '#dddddd', // fails
      error: '#000000',
      onAccent: '#ffffff',
      accent: '#000000',
      muted: '#000000',
    };
    const warnings = contrastWarnings(tokens);
    const pairs = warnings.map((w) => w.pair);
    expect(pairs).toContain('text vs background');
    expect(pairs).toContain('untyped vs background');
    expect(pairs).not.toContain('typed vs background');
    for (const w of warnings) {
      expect(w.ratio).toBeLessThan(WCAG_AA_NORMAL);
      expect(w.ratio).toBeGreaterThan(0);
    }
  });

  it('skips a pair entirely when either token is missing, instead of throwing', () => {
    const tokens = { text: '#000000' }; // no bg, no other tokens
    expect(() => contrastWarnings(tokens)).not.toThrow();
    expect(contrastWarnings(tokens)).toEqual([]);
  });
});
