import { describe, expect, it } from 'vitest';
import { wpmFrom, cpmFrom, accuracyFrom, analyzeText } from '../src/core/tools/calculators';
import { convertCase, cleanText, formatText, fixPunctuationSpacing } from '../src/core/tools/textTools';

describe('calculators (docs/01 Tools > Typing utilities)', () => {
  it('wpm matches the engine formula: correctChars / 5 / minutes', () => {
    expect(wpmFrom({ correctChars: 250, seconds: 60 })).toBeCloseTo(50, 5);
  });

  it('cpm is correctChars / minutes', () => {
    expect(cpmFrom({ correctChars: 300, seconds: 60 })).toBeCloseTo(300, 5);
  });

  it('accuracy is correct/total * 100, 100 on no keystrokes', () => {
    expect(accuracyFrom({ correctKeystrokes: 90, totalKeystrokes: 100 })).toBeCloseTo(90, 5);
    expect(accuracyFrom({ correctKeystrokes: 0, totalKeystrokes: 0 })).toBe(100);
  });

  it('zero seconds never divides by zero', () => {
    expect(wpmFrom({ correctChars: 10, seconds: 0 })).toBe(0);
    expect(cpmFrom({ correctChars: 10, seconds: 0 })).toBe(0);
  });

  it('analyzeText counts words, characters and sentences', () => {
    const s = analyzeText('Hello world. How are you?');
    expect(s.words).toBe(5);
    expect(s.sentences).toBe(2);
    expect(s.characters).toBe('Hello world. How are you?'.length);
  });

  it('analyzeText handles empty input without throwing', () => {
    const s = analyzeText('');
    expect(s.words).toBe(0);
    expect(s.lines).toBe(0);
  });
});

describe('text tools (docs/01 Tools > Text tools)', () => {
  it('case conversions', () => {
    expect(convertCase('hello world', 'upper')).toBe('HELLO WORLD');
    expect(convertCase('HELLO WORLD', 'lower')).toBe('hello world');
    expect(convertCase('hello world', 'title')).toBe('Hello World');
    expect(convertCase('hello. world', 'sentence')).toBe('Hello. World');
    expect(convertCase('hello world', 'camel')).toBe('helloWorld');
    expect(convertCase('Hello World', 'snake')).toBe('hello_world');
    expect(convertCase('Hello World', 'kebab')).toBe('hello-world');
  });

  it('cleanText collapses whitespace and excess blank lines', () => {
    expect(cleanText('a   b\n\n\n\nc  ')).toBe('a b\n\nc');
  });

  it('formatText expands tabs and wraps long lines', () => {
    expect(formatText('a\tb', { wrapAt: 0, tabSize: 2 })).toBe('a  b');
    const wrapped = formatText('one two three four five', { wrapAt: 10, tabSize: 0 });
    expect(wrapped.split('\n').every((l) => l.length <= 10)).toBe(true);
  });

  it('fixPunctuationSpacing removes space-before and adds space-after punctuation', () => {
    expect(fixPunctuationSpacing('Hi ,there !How are you ?')).toBe('Hi, there! How are you?');
  });

  it('fixPunctuationSpacing leaves decimals alone', () => {
    expect(fixPunctuationSpacing('Pi is 3.14 today')).toBe('Pi is 3.14 today');
  });
});
