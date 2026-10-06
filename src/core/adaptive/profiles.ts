/**
 * Adaptive profiles (docs/05). One engine, many profiles: every profile is a
 * data entry (weights + a sampling mode + optional session tweaks) that
 * flows through the exact same scoring/sampling pipeline in scoring.ts and
 * planner.ts — there is no per-profile code path.
 *
 * All ten documented profiles are implemented. Four of them reuse the
 * existing keys/words scoring with a different configuration rather than a
 * new data dimension — that is deliberate, not a shortcut:
 *   - Error Recovery: the same "keys" error-rate scoring as Weak Keys, but
 *     with a much lower minimum-sample threshold, so a key you only just
 *     started mistyping gets drilled immediately instead of waiting for
 *     MIN_SAMPLES mistakes to accumulate — plus stop-on-error, so you fix
 *     the slip before moving on.
 *   - Consistency Drill: the same "words" scoring with error/latency weights
 *     at zero, which the planner already treats as "no bias" (see
 *     planPracticeText) — i.e. a long, unweighted, steady-pace session. The
 *     consistency number itself still comes from the existing Metrics calc.
 *   - Bigram Trainer / Trigram Trainer *do* add a new scoring dimension
 *     (agg.bigrams / agg.trigrams instead of agg.keys / agg.words), but
 *     through the same needMap/needScore machinery — see sourceForMode and
 *     planner.ts's windowed word-scoring.
 */
import { needMap, type NeedWeights } from './scoring';
import type { Aggregates, StatCell } from '../../store/types';

export type ProfileMode = 'keys' | 'words' | 'bigrams' | 'trigrams';

export interface Profile {
  id: string;
  name: string;
  description: string;
  mode: ProfileMode;
  weights: NeedWeights;
  /** Session behaviour this profile nudges (merged into the session config). */
  stopOnError?: boolean;
  /** Short burst (seconds) instead of the configured session length. */
  fixedSeconds?: number;
  /** Multiplies the configured session length (endurance, consistency). */
  durationMultiplier?: number;
  /** Override the engine-wide minimum-sample threshold (error recovery). */
  minSamples?: number;
}

/** Which aggregate map backs a given profile mode — the one place this is decided. */
export function sourceForMode(agg: Aggregates, mode: ProfileMode): Record<string, StatCell> {
  switch (mode) {
    case 'keys':
      return agg.keys;
    case 'bigrams':
      return agg.bigrams;
    case 'trigrams':
      return agg.trigrams;
    case 'words':
    default:
      return agg.words;
  }
}

export const PROFILES: Profile[] = [
  {
    id: 'weak-keys',
    name: 'Weak Keys',
    description: 'Drills the physical keys you mistype most often.',
    mode: 'keys',
    weights: { error: 1, latency: 0 },
  },
  {
    id: 'slow-keys',
    name: 'Slow Keys',
    description: 'Drills the keys that take you longest to reach.',
    mode: 'keys',
    weights: { error: 0, latency: 1 },
  },
  {
    id: 'difficult-words',
    name: 'Difficult Words',
    description: 'Words you have historically mistyped or slowed down on.',
    mode: 'words',
    weights: { error: 0.6, latency: 0.4 },
  },
  {
    id: 'accuracy',
    name: 'Accuracy Drill',
    description: 'Relaxed pace, stop-on-error on, aim for 98%+ accuracy.',
    mode: 'words',
    weights: { error: 0.5, latency: 0.5 },
    stopOnError: true,
  },
  {
    id: 'speed',
    name: 'Speed Drill',
    description: 'Short bursts of common, easy words to push your pace.',
    mode: 'words',
    weights: { error: 0, latency: 0 },
    fixedSeconds: 15,
  },
  {
    id: 'endurance',
    name: 'Endurance Drill',
    description: 'A longer mixed session to see how you hold up over time.',
    mode: 'words',
    weights: { error: 0.3, latency: 0.3 },
    durationMultiplier: 5,
  },
  {
    id: 'error-recovery',
    name: 'Error Recovery',
    description: 'Jumps on keys the moment they start going wrong, and stops on error so you correct it right away.',
    mode: 'keys',
    weights: { error: 1, latency: 0 },
    stopOnError: true,
    minSamples: 3,
  },
  {
    id: 'bigram-trainer',
    name: 'Bigram Trainer',
    description: 'Words built around the two-letter sequences that slow you down or trip you up.',
    mode: 'bigrams',
    weights: { error: 0.6, latency: 0.4 },
  },
  {
    id: 'trigram-trainer',
    name: 'Trigram Trainer',
    description: 'Words built around your weakest three-letter sequences.',
    mode: 'trigrams',
    weights: { error: 0.6, latency: 0.4 },
  },
  {
    id: 'consistency-drill',
    name: 'Consistency Drill',
    description: 'A longer, unweighted session with no targeting — the goal is a flat pace, not raw speed. Check your consistency score in Stats afterwards.',
    mode: 'words',
    weights: { error: 0, latency: 0 },
    durationMultiplier: 2,
  },
];

export function profileById(id: string): Profile {
  return PROFILES.find((p) => p.id === id) ?? PROFILES[0]!;
}

/**
 * Pick the single profile the engine would recommend right now: whichever
 * of "Weak Keys" / "Slow Keys" / "Difficult Words" has the strongest signal
 * in the user's own aggregates. Falls back to Difficult Words (a gentle,
 * general drill) when there just is not enough history yet.
 */
export function recommendProfile(agg: Aggregates): Profile {
  const candidates = ['weak-keys', 'slow-keys', 'difficult-words'].map(profileById);
  let best = candidates[0]!;
  let bestScore = -1;
  for (const p of candidates) {
    const map = needMap(sourceForMode(agg, p.mode), p.weights);
    const top = map.size > 0 ? Math.max(...map.values()) : 0;
    if (top > bestScore) {
      bestScore = top;
      best = p;
    }
  }
  return bestScore > 0 ? best : profileById('difficult-words');
}
