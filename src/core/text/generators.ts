/**
 * Text generators. Pure: every generator takes an explicit word/quote pool and
 * a seeded RNG, so output is deterministic and unit-testable.
 * No DOM, no fetch — content is injected by the caller.
 */
import { makeRng, type Rng } from './rng';

export type TextStyle =
  | 'words'
  | 'paragraph'
  | 'sentence'
  | 'numbers'
  | 'punctuation'
  | 'mixed'
  | 'quote'
  | 'custom';

export interface GenOptions {
  /** Word pool for the active language. */
  words: readonly string[];
  count: number;
  seed: number | string;
  punctuation?: boolean;
  numbers?: boolean;
  capitalization?: boolean;
  /** Only sample words made entirely of these units (lesson key-sets). */
  allowedKeys?: readonly string[];
  /** Avoid repeating a word within this window. */
  varietyWindow?: number;
}

const SENTENCE_END = ['.', '.', '.', '!', '?'] as const;
const MID_PUNCT = [',', ',', ';', ':', ' -'] as const;

/** Filter a pool to words typable with only the allowed units. */
export function filterByKeys(
  words: readonly string[],
  allowed: readonly string[],
): string[] {
  const set = new Set(allowed.map((k) => k.toLowerCase()));
  return words.filter((w) => {
    const units = Array.from(w.toLowerCase());
    for (const u of units) if (!set.has(u)) return false;
    return true;
  });
}

/**
 * Sample `count` words with a variety guard: a word is not repeated within
 * `varietyWindow` picks (when the pool is large enough to allow it).
 */
export function sampleWords(
  pool: readonly string[],
  count: number,
  rng: Rng,
  varietyWindow = 8,
): string[] {
  if (pool.length === 0) return [];
  const out: string[] = [];
  const recent: string[] = [];
  const window = Math.min(varietyWindow, Math.max(0, pool.length - 1));
  for (let i = 0; i < count; i++) {
    let w = rng.pick(pool);
    let guard = 0;
    while (recent.includes(w) && guard < 20) {
      w = rng.pick(pool);
      guard++;
    }
    out.push(w);
    recent.push(w);
    if (recent.length > window) recent.shift();
  }
  return out;
}

function randomNumber(rng: Rng): string {
  const len = 1 + rng.int(4);
  let s = '';
  for (let i = 0; i < len; i++) s += String(rng.int(10));
  return s;
}

/** Words-only text (optionally with numbers / punctuation / capitals mixed in). */
export function generateWords(opts: GenOptions): string {
  const rng = makeRng(opts.seed);
  const pool = opts.allowedKeys?.length
    ? filterByKeys(opts.words, opts.allowedKeys)
    : opts.words;
  if (pool.length === 0) return '';

  const words = sampleWords(pool, opts.count, rng, opts.varietyWindow ?? 8);

  let startOfSentence = opts.capitalization === true;
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    let w = words[i]!;

    if (opts.numbers && rng.next() < 0.12) w = randomNumber(rng);

    if (opts.capitalization && startOfSentence) {
      w = w.charAt(0).toUpperCase() + w.slice(1);
      startOfSentence = false;
    }

    if (opts.punctuation) {
      const r = rng.next();
      const last = i === words.length - 1;
      if (last || r < 0.1) {
        w += rng.pick(SENTENCE_END);
        startOfSentence = opts.capitalization === true;
      } else if (r < 0.2) {
        w += rng.pick(MID_PUNCT);
      }
    }
    out.push(w);
  }
  return out.join(' ');
}

/** A paragraph is words with punctuation + capitalization forced on. */
export function generateParagraph(opts: GenOptions): string {
  return generateWords({ ...opts, punctuation: true, capitalization: true });
}

/** A single sentence. */
export function generateSentence(opts: GenOptions): string {
  const rng = makeRng(opts.seed);
  const pool = opts.allowedKeys?.length
    ? filterByKeys(opts.words, opts.allowedKeys)
    : opts.words;
  if (pool.length === 0) return '';
  const n = Math.max(4, opts.count);
  const words = sampleWords(pool, n, rng, opts.varietyWindow ?? 8);
  const first = words[0]!;
  words[0] = first.charAt(0).toUpperCase() + first.slice(1);
  return words.join(' ') + '.';
}

/** Number drills. */
export function generateNumbers(opts: GenOptions): string {
  const rng = makeRng(opts.seed);
  const out: string[] = [];
  for (let i = 0; i < opts.count; i++) out.push(randomNumber(rng));
  return out.join(' ');
}

/** Punctuation / symbol drills built around real words. */
export function generatePunctuation(opts: GenOptions): string {
  const rng = makeRng(opts.seed);
  const pool = opts.words;
  if (pool.length === 0) return '';
  const words = sampleWords(pool, opts.count, rng, opts.varietyWindow ?? 8);
  const wrappers: Array<[string, string]> = [
    ['(', ')'],
    ['"', '"'],
    ["'", "'"],
    ['[', ']'],
    ['{', '}'],
  ];
  return words
    .map((w, i) => {
      const r = rng.next();
      if (r < 0.25) {
        const [a, b] = rng.pick(wrappers);
        return `${a}${w}${b}`;
      }
      if (r < 0.45) return w + rng.pick(MID_PUNCT);
      if (r < 0.55 || i === words.length - 1) return w + rng.pick(SENTENCE_END);
      return w;
    })
    .join(' ');
}

/** Everything at once. */
export function generateMixed(opts: GenOptions): string {
  return generateWords({
    ...opts,
    punctuation: true,
    numbers: true,
    capitalization: true,
  });
}

/** Pick a quote near the requested length. */
export function pickQuote(
  quotes: readonly string[],
  seed: number | string,
  targetChars?: number,
): string {
  if (quotes.length === 0) return '';
  const rng = makeRng(seed);
  if (!targetChars) return rng.pick(quotes);
  const scored = quotes
    .map((q) => ({ q, d: Math.abs(q.length - targetChars) }))
    .sort((a, b) => a.d - b.d);
  const near = scored.slice(0, Math.max(1, Math.ceil(scored.length / 3)));
  return rng.pick(near).q;
}

/** Normalize user-supplied custom text (collapse whitespace, keep newlines). */
export function prepareCustom(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface BuildTextRequest extends GenOptions {
  style: TextStyle;
  quotes?: readonly string[];
  custom?: string;
  targetChars?: number;
}

/** One entry point the UI uses; keeps generator choice out of components. */
export function buildText(req: BuildTextRequest): string {
  switch (req.style) {
    case 'paragraph':
      return generateParagraph(req);
    case 'sentence':
      return generateSentence(req);
    case 'numbers':
      return generateNumbers(req);
    case 'punctuation':
      return generatePunctuation(req);
    case 'mixed':
      return generateMixed(req);
    case 'quote':
      return pickQuote(req.quotes ?? [], req.seed, req.targetChars);
    case 'custom':
      return prepareCustom(req.custom ?? '');
    case 'words':
    default:
      return generateWords(req);
  }
}
