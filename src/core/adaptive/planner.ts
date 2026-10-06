/**
 * Adaptive planner (docs/05): turns a profile + the user's aggregates into
 * practice text. Deterministic given a seed, so it is unit-testable.
 */
import { makeRng } from '../../core/text/rng';
import type { Aggregates } from '../../store/types';
import { needMap, type NeedWeights } from './scoring';
import type { Profile } from './profiles';

export interface PlanResult {
  words: string[];
  text: string;
  /** True when there was not enough history to score anything (docs/05: say so plainly). */
  usedFallback: boolean;
  /** The items (keys or words) that most drove this plan, for the "why" explanation. */
  topNeeds: Array<{ item: string; need: number }>;
}

function wordNeed(word: string, byChar: Map<string, number>): number {
  const chars = Array.from(word.toLowerCase());
  if (chars.length === 0) return 0;
  let sum = 0;
  for (const c of chars) sum += byChar.get(c) ?? 0;
  return sum / chars.length;
}

/** Weighted sample without replacement-ish: caps any one word's share and avoids close repeats. */
function weightedSample(
  weighted: ReadonlyArray<{ word: string; weight: number }>,
  count: number,
  rng: ReturnType<typeof makeRng>,
  cap: number,
  varietyWindow: number,
): string[] {
  if (weighted.length === 0) return [];
  const counts = new Map<string, number>();
  const recent: string[] = [];
  const out: string[] = [];
  const totalWeight = weighted.reduce((a, w) => a + w.weight, 0) || 1;

  for (let i = 0; i < count; i++) {
    let r = rng.next() * totalWeight;
    let chosen = weighted[weighted.length - 1]!.word;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) {
        chosen = w.word;
        break;
      }
    }
    // Respect the cap and the variety window with a bounded number of retries.
    let guard = 0;
    while (
      guard < 25 &&
      ((counts.get(chosen) ?? 0) >= cap || recent.includes(chosen))
    ) {
      chosen = rng.pick(weighted).word;
      guard++;
    }
    out.push(chosen);
    counts.set(chosen, (counts.get(chosen) ?? 0) + 1);
    recent.push(chosen);
    if (recent.length > varietyWindow) recent.shift();
  }
  return out;
}

export interface PlanOptions {
  pool: readonly string[];
  agg: Aggregates;
  profile: Profile;
  count: number;
  seed: number | string;
  /** Share of the text that is generic "rhythm" words, not weighted by need. */
  easyShare: number;
  minSamples?: number;
}

export function planPracticeText(opts: PlanOptions): PlanResult {
  const rng = makeRng(opts.seed);
  const pool = opts.pool.length > 0 ? opts.pool : [];
  if (pool.length === 0) {
    return { words: [], text: '', usedFallback: true, topNeeds: [] };
  }

  const weights: NeedWeights = opts.profile.weights;
  const source = opts.profile.mode === 'keys' ? opts.agg.keys : opts.agg.words;
  const itemNeed = needMap(source, weights, opts.minSamples);

  if (itemNeed.size === 0) {
    // Not enough data yet — fall back to a plain, uniform sample (docs/05).
    const out: string[] = [];
    for (let i = 0; i < opts.count; i++) out.push(rng.pick(pool));
    return { words: out, text: out.join(' '), usedFallback: true, topNeeds: [] };
  }

  const EPSILON = 0.02; // every word keeps a non-zero chance, even if "easy"
  const weighted = pool.map((word) => ({
    word,
    weight:
      opts.profile.mode === 'keys'
        ? wordNeed(word, itemNeed) + EPSILON
        : (itemNeed.get(word.toLowerCase()) ?? 0) + EPSILON,
  }));

  const easyCount = Math.round(opts.count * opts.easyShare);
  const weightedCount = Math.max(0, opts.count - easyCount);
  const cap = Math.max(1, Math.ceil(opts.count * 0.3));

  const easyWords: string[] = [];
  for (let i = 0; i < easyCount; i++) easyWords.push(rng.pick(pool));

  const driven = weightedSample(weighted, weightedCount, rng, cap, 8);

  // Interleave so the easy "rhythm" words are not all bunched at the end.
  const out: string[] = [];
  let ei = 0;
  let di = 0;
  for (let i = 0; i < opts.count; i++) {
    const useEasy = ei < easyWords.length && (di >= driven.length || rng.next() < opts.easyShare);
    if (useEasy) out.push(easyWords[ei++]!);
    else if (di < driven.length) out.push(driven[di++]!);
    else if (ei < easyWords.length) out.push(easyWords[ei++]!);
  }

  const topNeeds = [...itemNeed.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item, need]) => ({ item, need }));

  return { words: out, text: out.join(' '), usedFallback: false, topNeeds };
}
