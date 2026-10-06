/**
 * Turns a curriculum Lesson into practice text. Every generator is original:
 * either sampled from GoTyping's own word lists (src/content), or
 * synthetically built from the taught key set — never copied prose
 * (AGENT.md, docs/03).
 */
import { makeRng } from './rng';
import {
  filterByKeys,
  generateNumbers,
  generateParagraph,
  generateSentence,
  generateWords,
  sampleWords,
} from './generators';
import { devanagariSetFor } from './devanagari-sets';
import type { Lesson } from '../curriculum';
import { planPracticeText } from '../adaptive/planner';
import { profileById } from '../adaptive/profiles';
import type { Aggregates } from '../../store/types';

export interface LessonTextResult {
  text: string;
  /** Present when the text is restricted to a specific key/character set. */
  allowedKeys?: string[];
  /** True if the adaptive engine did not have enough history and fell back. */
  usedFallback?: boolean;
}

export interface LessonContext {
  words: readonly string[];
  seed: number | string;
  /** Needed only for type: 'adaptive' lessons. */
  aggregates?: Aggregates;
  easyShare?: number;
}

const SYMBOL_CHARS = '!@#$%^&*()-_=+[]{}'.split('');
const CODE_TEMPLATES = [
  'function {a}({b}, {c}) {\n  return {b} + {c};\n}',
  'const {a} = ({b}) => {b} * 2;',
  'if ({a} > {b}) {\n  {a} = {b};\n}',
  'for (let {a} = 0; {a} < {b}; {a}++) {\n  {c}.push({a});\n}',
  'class {A} {\n  constructor({a}) {\n    this.{a} = {a};\n  }\n}',
];
const CODE_NAMES = ['count', 'total', 'index', 'value', 'result', 'items', 'data', 'temp'];

/** Synthetic drill tokens built only from the taught keys (for tiny key sets). */
function generateKeyDrill(keys: readonly string[], count: number, rng: ReturnType<typeof makeRng>): string {
  if (keys.length === 0) return '';
  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = 2 + rng.int(3);
    let tok = '';
    for (let j = 0; j < len; j++) tok += rng.pick(keys);
    tokens.push(tok);
  }
  return tokens.join(' ');
}

/** Words built only from the taught keys, falling back to a synthetic drill. */
function textForKeys(pool: readonly string[], keysStr: string, count: number, seed: number | string): LessonTextResult {
  const keys = Array.from(new Set(keysStr.toLowerCase().replace(/\s+/g, '').split('')));
  const rng = makeRng(seed);
  const filtered = filterByKeys(pool, keys);
  if (filtered.length >= 12) {
    return { text: sampleWords(filtered, count, rng).join(' '), allowedKeys: keys };
  }
  return { text: generateKeyDrill(keys, count, rng), allowedKeys: keys };
}

function textForSymbols(count: number, seed: number | string, withWords: readonly string[]): string {
  const rng = makeRng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    if (withWords.length > 0 && rng.next() < 0.4) {
      out.push(rng.pick(withWords) + rng.pick(SYMBOL_CHARS));
    } else {
      const len = 1 + rng.int(3);
      let tok = '';
      for (let j = 0; j < len; j++) tok += rng.pick(SYMBOL_CHARS);
      out.push(tok);
    }
  }
  return out.join(' ');
}

function textForShift(pool: readonly string[], count: number, seed: number | string): string {
  const rng = makeRng(seed);
  const words = sampleWords(pool, count, rng);
  return words
    .map((w) => (rng.next() < 0.5 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function textForCode(seed: number | string, count: number): string {
  const rng = makeRng(seed);
  const lines: string[] = [];
  const n = Math.max(1, Math.round(count / 10));
  for (let i = 0; i < n; i++) {
    let line = rng.pick(CODE_TEMPLATES);
    const a = rng.pick(CODE_NAMES);
    const b = rng.pick(CODE_NAMES.filter((x) => x !== a));
    const c = rng.pick(CODE_NAMES);
    line = line
      .replace(/\{A\}/g, a.charAt(0).toUpperCase() + a.slice(1))
      .replace(/\{a\}/g, a)
      .replace(/\{b\}/g, b)
      .replace(/\{c\}/g, c);
    lines.push(line);
  }
  return lines.join('\n\n');
}

/** Words at least 6 letters long, or containing an awkward cluster — a simple, defensible "difficult" filter. */
function difficultPool(pool: readonly string[]): string[] {
  const hard = /(ght|tion|sch|rhy|psy|wr|qu)/i;
  return pool.filter((w) => w.length >= 7 || hard.test(w));
}

const ADAPTIVE_PROFILE_BY_LESSON: Record<string, string> = {
  'en-accuracy-02': 'weak-keys',
  'en-accuracy-03': 'slow-keys',
  'en-accuracy-04': 'accuracy',
};

export function buildLessonText(lesson: Lesson, ctx: LessonContext): LessonTextResult {
  const { words, seed } = ctx;
  const count = Math.max(10, Math.round(lesson.estMinutes * 12));

  switch (lesson.type) {
    case 'intro':
      return textForKeys(words, lesson.keys || 'asdfghjkl;', count, seed);
    case 'keys':
      return textForKeys(words, lesson.keys, count, seed);
    case 'ngrams': {
      const ngrams = lesson.keys.split(/\s+/).filter(Boolean);
      const rng = makeRng(seed);
      return { text: sampleWords(ngrams, count, rng).join(' ') };
    }
    case 'words':
      return { text: generateWords({ words, count, seed }) };
    case 'words-cap':
      return { text: generateWords({ words, count, seed, capitalization: true }) };
    case 'sentences': {
      const rng = makeRng(seed);
      const n = Math.max(2, Math.round(count / 8));
      const sentences: string[] = [];
      for (let i = 0; i < n; i++) {
        sentences.push(generateSentence({ words, count: 6 + rng.int(5), seed: `${seed}-${i}` }));
      }
      return { text: sentences.join(' ') };
    }
    case 'paragraph':
      return { text: generateParagraph({ words, count, seed }) };
    case 'punct':
    case 'punct-mixed':
      return {
        text: generateWords({ words, count, seed, punctuation: true, capitalization: true }),
      };
    case 'numbers':
      return { text: generateNumbers({ words: [], count, seed }) };
    case 'symbols':
    case 'symbols-mixed':
      return { text: textForSymbols(count, seed, words) };
    case 'shift':
      return { text: textForShift(words, count, seed) };
    case 'difficult': {
      const pool = difficultPool(words);
      const rng = makeRng(seed);
      return { text: sampleWords(pool.length >= 8 ? pool : words, count, rng).join(' ') };
    }
    case 'code':
      return { text: textForCode(seed, count) };
    case 'keys-hi': {
      const set = devanagariSetFor(lesson.keys);
      return textForKeys(words, set.join(''), count, seed);
    }
    case 'adaptive': {
      const profileId = ADAPTIVE_PROFILE_BY_LESSON[lesson.id] ?? 'weak-keys';
      const profile = profileById(profileId);
      const plan = planPracticeText({
        pool: words,
        agg: ctx.aggregates ?? { keys: {}, bigrams: {}, trigrams: {}, words: {}, errorPairs: {}, fingers: {}, days: {} },
        profile,
        count,
        seed,
        easyShare: ctx.easyShare ?? 0.15,
      });
      return { text: plan.text, usedFallback: plan.usedFallback };
    }
    default:
      return { text: generateWords({ words, count, seed }) };
  }
}
