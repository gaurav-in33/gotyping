/**
 * Adaptive profiles (docs/05). One engine, many profiles: each profile is a
 * data entry (weights + a sampling mode), not a separate code path.
 *
 * Scope note (Step 2 rebuild): six of the ten documented profiles are
 * implemented with real scoring — Weak Keys, Slow Keys, Difficult Words,
 * Accuracy Drill, Speed Drill, Endurance Drill. Error Recovery, Bigram
 * Trainer, Trigram Trainer and Consistency Drill are not built this round;
 * see the Step 2 report for what that takes.
 */
import { needMap, type NeedWeights } from './scoring';
import type { Aggregates } from '../../store/types';

export type ProfileMode = 'keys' | 'words';

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
  /** Multiplies the configured session length (endurance). */
  durationMultiplier?: number;
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
    const source = p.mode === 'keys' ? agg.keys : agg.words;
    const map = needMap(source, p.weights);
    const top = map.size > 0 ? Math.max(...map.values()) : 0;
    if (top > bestScore) {
      bestScore = top;
      best = p;
    }
  }
  return bestScore > 0 ? best : profileById('difficult-words');
}
