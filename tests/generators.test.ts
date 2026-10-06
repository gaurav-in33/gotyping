import { describe, expect, it } from 'vitest';
import { makeRng, hashSeed } from '../src/core/text/rng';
import {
  buildText,
  filterByKeys,
  generateNumbers,
  generateSentence,
  generateWords,
  pickQuote,
  prepareCustom,
  sampleWords,
} from '../src/core/text/generators';

const WORDS = [
  'the', 'and', 'for', 'you', 'say', 'but', 'his', 'not', 'she', 'let',
  'cat', 'dog', 'run', 'sit', 'top', 'far', 'red', 'sun', 'joy', 'map',
];

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng('seed-1');
    const b = makeRng('seed-1');
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it('differs across seeds', () => {
    expect(makeRng('a').next()).not.toBe(makeRng('b').next());
  });
  it('int stays in range', () => {
    const r = makeRng(42);
    for (let i = 0; i < 200; i++) {
      const v = r.int(7);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(7);
    }
  });
  it('hashSeed is stable', () => {
    expect(hashSeed('gotyping')).toBe(hashSeed('gotyping'));
  });
  it('shuffle keeps every element', () => {
    const out = makeRng(1).shuffle(WORDS);
    expect(out.slice().sort()).toEqual(WORDS.slice().sort());
  });
});

describe('determinism', () => {
  it('generateWords returns identical text for the same seed', () => {
    const o = { words: WORDS, count: 20, seed: 'abc', punctuation: true, numbers: true };
    expect(generateWords(o)).toBe(generateWords(o));
  });
  it('different seeds give different text', () => {
    const a = generateWords({ words: WORDS, count: 20, seed: 'a' });
    const b = generateWords({ words: WORDS, count: 20, seed: 'b' });
    expect(a).not.toBe(b);
  });
});

describe('generateWords', () => {
  it('produces the requested word count', () => {
    const text = generateWords({ words: WORDS, count: 15, seed: 1 });
    expect(text.split(' ')).toHaveLength(15);
  });
  it('adds no punctuation when the option is off', () => {
    const text = generateWords({ words: WORDS, count: 30, seed: 2 });
    expect(text).toMatch(/^[a-z ]+$/);
  });
  it('adds punctuation when the option is on', () => {
    const text = generateWords({ words: WORDS, count: 40, seed: 3, punctuation: true });
    expect(text).toMatch(/[.,!?;:]/);
  });
  it('capitalizes sentence starts when asked', () => {
    const text = generateWords({
      words: WORDS, count: 40, seed: 4, punctuation: true, capitalization: true,
    });
    expect(text[0]).toBe(text[0]!.toUpperCase());
  });
  it('returns empty text for an empty pool', () => {
    expect(generateWords({ words: [], count: 10, seed: 1 })).toBe('');
  });
});

describe('allowed keys (lesson drills)', () => {
  it('filterByKeys keeps only typable words', () => {
    const out = filterByKeys(['cat', 'dog', 'act'], ['a', 'c', 't']);
    expect(out).toEqual(['cat', 'act']);
  });
  it('generated lesson text uses only the allowed keys', () => {
    const allowed = ['f', 'j', 'd', 'k', 'a', 's', 'l', ';'];
    const pool = ['fad', 'lad', 'ask', 'fall', 'dog', 'cat'];
    const text = generateWords({ words: pool, count: 12, seed: 7, allowedKeys: allowed });
    const used = new Set(text.replace(/ /g, '').split(''));
    for (const ch of used) expect(allowed).toContain(ch);
  });
});

describe('variety guard', () => {
  it('does not repeat a word within the window', () => {
    const out = sampleWords(WORDS, 60, makeRng(9), 8);
    for (let i = 0; i < out.length; i++) {
      const window = out.slice(Math.max(0, i - 8), i);
      expect(window).not.toContain(out[i]);
    }
  });
  it('still works when the pool is smaller than the window', () => {
    const out = sampleWords(['a', 'b'], 10, makeRng(3), 8);
    expect(out).toHaveLength(10);
  });
});

describe('other generators', () => {
  it('generateNumbers emits only digits', () => {
    expect(generateNumbers({ words: [], count: 10, seed: 5 })).toMatch(/^[0-9 ]+$/);
  });
  it('generateSentence ends with a period and starts capitalized', () => {
    const s = generateSentence({ words: WORDS, count: 8, seed: 6 });
    expect(s.endsWith('.')).toBe(true);
    expect(s[0]).toBe(s[0]!.toUpperCase());
  });
  it('pickQuote prefers quotes near the target length', () => {
    const quotes = ['short', 'a much much longer quote than the others here'];
    expect(pickQuote(quotes, 1, 5)).toBe('short');
  });
  it('pickQuote handles an empty list', () => {
    expect(pickQuote([], 1)).toBe('');
  });
});

describe('prepareCustom', () => {
  it('collapses spaces and trims', () => {
    expect(prepareCustom('  hello   world  ')).toBe('hello world');
  });
  it('normalizes newlines and caps blank runs', () => {
    expect(prepareCustom('a\r\n\n\n\nb')).toBe('a\n\nb');
  });
});

describe('buildText', () => {
  it('routes every style without throwing', () => {
    for (const style of ['words', 'paragraph', 'sentence', 'numbers', 'punctuation', 'mixed'] as const) {
      const out = buildText({ style, words: WORDS, count: 10, seed: 'x' });
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
    }
  });
  it('handles quote and custom styles', () => {
    expect(buildText({ style: 'quote', words: [], count: 0, seed: 1, quotes: ['hi there'] })).toBe('hi there');
    expect(buildText({ style: 'custom', words: [], count: 0, seed: 1, custom: ' a  b ' })).toBe('a b');
  });
});
