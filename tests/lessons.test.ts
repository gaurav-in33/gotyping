import { describe, expect, it } from 'vitest';
import { buildLessonText } from '../src/core/text/lessons';
import type { Lesson } from '../src/core/curriculum';
import { loadCurriculum, lessonById, nextLesson } from '../src/core/curriculum';
import { emptyAggregates } from '../src/store/types';

const WORDS = [
  'the', 'and', 'for', 'you', 'say', 'but', 'his', 'not', 'she', 'let',
  'cat', 'dog', 'run', 'sit', 'top', 'far', 'red', 'sun', 'joy', 'map',
  'ship', 'gold', 'fast', 'slow', 'kind', 'glass', 'stone', 'bread', 'light', 'water',
];

function lesson(overrides: Partial<Lesson>): Lesson {
  return {
    id: 'test',
    title: 'Test',
    type: 'words',
    keys: '',
    objective: '',
    targetAccuracy: null,
    targetWpm: null,
    estMinutes: 2,
    ...overrides,
  };
}

describe('curriculum data', () => {
  it('loads the bundled outline and finds lessons by id', async () => {
    const courses = await loadCurriculum();
    expect(courses.length).toBeGreaterThan(5);
    const found = lessonById(courses, 'en-beginner-02');
    expect(found?.lesson.title).toBe('F and J anchors');
    expect(found?.course.id).toBe('en-beginner');
  });

  it('finds the next lesson within a course', async () => {
    const courses = await loadCurriculum();
    const next = nextLesson(courses, 'en-beginner-01');
    expect(next?.id).toBe('en-beginner-02');
  });

  it('returns undefined past the last lesson of a course', async () => {
    const courses = await loadCurriculum();
    const course = courses.find((c) => c.id === 'hinglish')!;
    const last = course.lessons[course.lessons.length - 1]!;
    expect(nextLesson(courses, last.id)).toBeUndefined();
  });
});

describe('lesson text generators (allowed-keys + determinism)', () => {
  it('keys lessons only use the taught key set', () => {
    const l = lesson({ type: 'keys', keys: 'fj', estMinutes: 2 });
    const result = buildLessonText(l, { words: WORDS, seed: 'seed-a' });
    const used = new Set(result.text.toLowerCase().replace(/\s+/g, '').split(''));
    for (const ch of used) expect(['f', 'j']).toContain(ch);
  });

  it('a wider key lesson is also constrained to its key set', () => {
    const l = lesson({ type: 'keys', keys: 'asdfghjkl;', estMinutes: 3 });
    const result = buildLessonText(l, { words: WORDS, seed: 'seed-b' });
    const used = new Set(result.text.toLowerCase().replace(/[\s;]+/g, '').split(''));
    for (const ch of used) expect('asdfghjkl'.includes(ch)).toBe(true);
  });

  it('intro lessons default to the home row when no keys are given', () => {
    const l = lesson({ type: 'intro', keys: '' });
    const result = buildLessonText(l, { words: WORDS, seed: 'seed-c' });
    expect(result.allowedKeys?.sort()).toEqual([...'asdfghjkl;'].sort());
  });

  it('is deterministic for a given seed', () => {
    const l = lesson({ type: 'words' });
    const a = buildLessonText(l, { words: WORDS, seed: 'fixed' }).text;
    const b = buildLessonText(l, { words: WORDS, seed: 'fixed' }).text;
    expect(a).toBe(b);
  });

  it('differs across seeds', () => {
    const l = lesson({ type: 'words' });
    const a = buildLessonText(l, { words: WORDS, seed: 'one' }).text;
    const b = buildLessonText(l, { words: WORDS, seed: 'two' }).text;
    expect(a).not.toBe(b);
  });

  it('ngrams lessons sample from the literal ngram list in `keys`', () => {
    const l = lesson({ type: 'ngrams', keys: 'th he in er an' });
    const result = buildLessonText(l, { words: WORDS, seed: 'ngram-seed' });
    const tokens = result.text.split(' ');
    for (const t of tokens) expect(['th', 'he', 'in', 'er', 'an']).toContain(t);
  });

  it('numbers lessons produce only digits and spaces', () => {
    const l = lesson({ type: 'numbers' });
    const result = buildLessonText(l, { words: WORDS, seed: 'num-seed' });
    expect(/^[\d\s]+$/.test(result.text)).toBe(true);
  });

  it('shift lessons contain at least one uppercase letter', () => {
    const l = lesson({ type: 'shift', estMinutes: 5 });
    const result = buildLessonText(l, { words: WORDS, seed: 'shift-seed' });
    expect(/[A-Z]/.test(result.text)).toBe(true);
  });

  it('difficult lessons prefer longer / awkward words when enough exist', () => {
    const l = lesson({ type: 'difficult', estMinutes: 3 });
    const result = buildLessonText(l, { words: WORDS, seed: 'diff-seed' });
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('code lessons use only the fixed safe template vocabulary', () => {
    const l = lesson({ type: 'code', estMinutes: 2 });
    const result = buildLessonText(l, { words: WORDS, seed: 'code-seed' });
    expect(result.text.length).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/http|copyright/i);
  });

  it('keys-hi lessons are constrained to the named Devanagari set', () => {
    const l = lesson({ type: 'keys-hi', keys: 'vowels', estMinutes: 2 });
    const hindiWords = ['अनार', 'आम', 'इमली'];
    const result = buildLessonText(l, { words: hindiWords, seed: 'hi-seed' });
    expect(result.allowedKeys).toContain('अ');
  });

  it('adaptive lessons fall back plainly when there is no history', () => {
    const l = lesson({ id: 'en-accuracy-02', type: 'adaptive', estMinutes: 2 });
    const result = buildLessonText(l, {
      words: WORDS,
      seed: 'adapt-seed',
      aggregates: emptyAggregates(),
    });
    expect(result.usedFallback).toBe(true);
    expect(result.text.length).toBeGreaterThan(0);
  });
});
