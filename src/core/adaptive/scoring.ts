/**
 * Adaptive scoring (docs/05 "Adaptive engine").
 *
 * Pure math over `Aggregates` cells — no DOM, no storage. Each item (key,
 * bigram, word) gets a `need` score in [0, 1]; higher means "needs work".
 *
 * Simplifications made explicitly (see the Step 2 report): recency decay
 * (half-life ≈ 10 sessions) is NOT implemented — `Aggregates` only stores
 * lifetime sums, not per-test timestamps per item, and adding that is a
 * storage-format change left for Step 3. Everything else in this file
 * follows docs/05's formula shape (error rate + latency z-score, weighted
 * per profile, with a minimum-sample threshold).
 */
import { cellErrorRate, cellMean, type StatCell } from '../../store/types';

export interface NeedWeights {
  /** How much error rate drives the "needs work" score. */
  error: number;
  /** How much latency (vs. the user's own median) drives it. */
  latency: number;
}

/** Below this many samples an item is not considered "scored" (docs/05). */
export const MIN_SAMPLES = 8;

/** Laplace-smoothed error rate so a single mistake does not dominate. */
export function smoothedErrorRate(cell: StatCell): number {
  return (cell.errors + 1) / (cell.count + 2);
}

/**
 * Latency need: how much slower this cell is than the given median latency,
 * expressed as a 0..1 score (clipped). `medianMs` is typically the user's
 * own median key latency across all scored items, so "slow" is relative to
 * the user, not an absolute number.
 */
export function latencyNeed(cell: StatCell, medianMs: number): number {
  if (cell.count === 0 || medianMs <= 0) return 0;
  const mean = cellMean(cell);
  const ratio = (mean - medianMs) / medianMs; // 0 = at median, 1 = 2x median
  return Math.max(0, Math.min(1, ratio));
}

export function isScored(cell: StatCell, minSamples = MIN_SAMPLES): boolean {
  return cell.count >= minSamples;
}

/** Combined need score for one cell, 0..1. */
export function needScore(cell: StatCell, medianMs: number, weights: NeedWeights): number {
  const err = smoothedErrorRate(cell);
  const slow = latencyNeed(cell, medianMs);
  const total = weights.error + weights.latency || 1;
  const score = (weights.error * err + weights.latency * slow) / total;
  return Math.max(0, Math.min(1, score));
}

/** Median of the per-cell mean latencies, ignoring unseen cells. 0 if none. */
export function medianLatency(cells: Record<string, StatCell>): number {
  const means = Object.values(cells)
    .filter((c) => c.count > 0)
    .map(cellMean)
    .sort((a, b) => a - b);
  if (means.length === 0) return 0;
  const mid = Math.floor(means.length / 2);
  return means.length % 2 === 0 ? (means[mid - 1]! + means[mid]!) / 2 : means[mid]!;
}

/** Build a need-score map for every scored cell in `cells`. */
export function needMap(
  cells: Record<string, StatCell>,
  weights: NeedWeights,
  minSamples = MIN_SAMPLES,
): Map<string, number> {
  const median = medianLatency(cells);
  const out = new Map<string, number>();
  for (const [key, cell] of Object.entries(cells)) {
    if (!isScored(cell, minSamples)) continue;
    out.set(key, needScore(cell, median, weights));
  }
  return out;
}

export { cellErrorRate };
