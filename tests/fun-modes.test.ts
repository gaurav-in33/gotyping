import { describe, expect, it } from 'vitest';
import { randomizeCase } from '../src/core/fun/textFx';
import {
  cumulativeMsFromCaptures,
  ghostProgressAt,
  isBetterGhost,
  ghostKey,
  type GhostRecord,
} from '../src/core/fun/ghost';
import type { Capture } from '../src/core/engine/session';
import { FUN_MODES, funModeInfo } from '../src/core/fun/modes';
import { CODE_LANGS, generateCode } from '../src/core/text/code';

describe('fun modes (docs/01 §7)', () => {
  it('randomizeCase is deterministic for a given seed and only touches letters', () => {
    const a = randomizeCase('Hello, World! 123', 'seed-1');
    const b = randomizeCase('Hello, World! 123', 'seed-1');
    expect(a).toBe(b);
    expect(a.replace(/[a-zA-Z]/g, '')).toBe('Hello, World! 123'.replace(/[a-zA-Z]/g, ''));
    expect(a.toLowerCase()).toBe('hello, world! 123');
  });

  it('different seeds usually scramble differently', () => {
    const a = randomizeCase('the quick brown fox jumps over the lazy dog', 1);
    const b = randomizeCase('the quick brown fox jumps over the lazy dog', 2);
    expect(a).not.toBe(b);
  });

  it('cumulativeMsFromCaptures sums latency only for ok keystrokes', () => {
    const captures: Capture[] = [
      { expected: 'a', typed: 'a', latencyMs: 100, ok: true },
      { expected: 'b', typed: 'x', latencyMs: 50, ok: false },
      { expected: 'b', typed: 'b', latencyMs: 80, ok: true },
    ];
    expect(cumulativeMsFromCaptures(captures)).toEqual([100, 230]);
  });

  it('ghostProgressAt counts how many timeline points are at or before elapsed', () => {
    const ghost: GhostRecord = { id: 'x', cumulativeMs: [100, 200, 300], wpm: 40, accuracy: 95, at: 0 };
    expect(ghostProgressAt(ghost, 0)).toBe(0);
    expect(ghostProgressAt(ghost, 150)).toBe(1);
    expect(ghostProgressAt(ghost, 300)).toBe(3);
    expect(ghostProgressAt(ghost, 9999)).toBe(3);
  });

  it('isBetterGhost prefers higher wpm, then higher accuracy at equal wpm', () => {
    const base: GhostRecord = { id: 'x', cumulativeMs: [], wpm: 40, accuracy: 95, at: 0 };
    expect(isBetterGhost(base, undefined)).toBe(true);
    expect(isBetterGhost({ ...base, wpm: 45 }, base)).toBe(true);
    expect(isBetterGhost({ ...base, wpm: 35 }, base)).toBe(false);
    expect(isBetterGhost({ ...base, accuracy: 99 }, base)).toBe(true);
    expect(isBetterGhost({ ...base, accuracy: 90 }, base)).toBe(false);
  });

  it('ghostKey namespaces by language, mode and style', () => {
    expect(ghostKey('en', 'time', 'words')).toBe('en:time:words');
  });

  it('every fun mode id has a label and is resolvable via funModeInfo', () => {
    for (const m of FUN_MODES) {
      expect(funModeInfo(m.id).id).toBe(m.id);
      expect(m.label.length).toBeGreaterThan(0);
    }
  });

  it('the "Code" fun mode is registered, docs/01 §7', () => {
    expect(FUN_MODES.some((m) => m.id === 'code')).toBe(true);
  });
});

describe('Code fun mode: generateCode (docs/01 §7 "Code")', () => {
  it('is deterministic for a given seed', () => {
    const a = generateCode({ lang: 'javascript', seed: 'code-seed', count: 40 });
    const b = generateCode({ lang: 'javascript', seed: 'code-seed', count: 40 });
    expect(a).toBe(b);
  });

  it('produces JavaScript that looks like JavaScript, not Python', () => {
    const text = generateCode({ lang: 'javascript', seed: 'js-1', count: 80 });
    expect(text.length).toBeGreaterThan(0);
    expect(/function|const|class|=>/.test(text)).toBe(true);
    expect(text).not.toMatch(/\bdef \w+\(/);
  });

  it('produces Python that looks like Python, not JavaScript', () => {
    const text = generateCode({ lang: 'python', seed: 'py-1', count: 80 });
    expect(text.length).toBeGreaterThan(0);
    expect(/\bdef \w+\(|lambda|range\(/.test(text)).toBe(true);
    expect(text).not.toMatch(/\bfunction\b|=>/);
  });

  it('both offered languages (docs §7) are backed by real, distinct output', () => {
    expect(CODE_LANGS.map((l) => l.id).sort()).toEqual(['javascript', 'python']);
    const js = generateCode({ lang: 'javascript', seed: 'same-seed', count: 40 });
    const py = generateCode({ lang: 'python', seed: 'same-seed', count: 40 });
    expect(js).not.toBe(py);
  });

  it('more count produces more snippet lines', () => {
    const short = generateCode({ lang: 'javascript', seed: 'len', count: 10 });
    const long = generateCode({ lang: 'javascript', seed: 'len', count: 100 });
    expect(long.split('\n\n').length).toBeGreaterThan(short.split('\n\n').length);
  });
});
