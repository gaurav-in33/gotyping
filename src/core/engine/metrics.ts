/**
 * Metric formulas — the single place WPM/accuracy/etc. are computed.
 * Definitions are taken verbatim from docs/04-TYPING-ENGINE.md.
 * Pure functions only: no DOM, no clock, no storage.
 */

export const UNIT_PENDING = 0;
export const UNIT_CORRECT = 1;
export const UNIT_WRONG = 2;
export const UNIT_SKIPPED = 3;

export interface MetricsInput {
  /** Per-unit state array (0 pending, 1 correct, 2 wrong, 3 skipped). */
  states: Uint8Array;
  /** The target units, needed for word-level counts. */
  units: readonly string[];
  /** Every character key press, Backspace excluded. */
  keystrokes: number;
  /** Keystrokes that did not match the expected unit at the moment they were typed. */
  mistakes: number;
  /** Active typing time in ms (excludes paused time). */
  activeMs: number;
  /** Raw WPM sampled once per second. */
  perSecond: readonly number[];
}

export interface Metrics {
  wpm: number;
  rawWpm: number;
  cpm: number;
  accuracy: number;
  errors: number;
  uncorrectedErrors: number;
  consistency: number;
  keystrokes: number;
  correctKeystrokes: number;
  correctChars: number;
  skippedChars: number;
  correctWords: number;
  incorrectWords: number;
  skippedWords: number;
  timeMs: number;
  perSecond: readonly number[];
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Standard deviation of a population. */
export function stdev(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, b) => a + (b - mean) * (b - mean), 0) / xs.length;
  return Math.sqrt(variance);
}

/**
 * Consistency = max(0, round(100 * (1 - stdev/mean))) over per-second raw WPM
 * samples. Needs at least 3 samples to be meaningful; otherwise 0.
 */
export function consistencyOf(perSecond: readonly number[]): number {
  if (perSecond.length < 3) return 0;
  const mean = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
  if (mean <= 0) return 0;
  return Math.max(0, Math.round(100 * (1 - stdev(perSecond) / mean)));
}

/**
 * Word-level tallies. A word is a run of units between spaces.
 * - correct   : every unit in the word is state 1
 * - skipped   : the word contains at least one skipped unit
 * - incorrect : the word was reached/typed and contains a state-2 unit
 * Untouched (all-pending) words count as none of the three.
 */
export function wordCounts(units: readonly string[], states: Uint8Array): {
  correct: number;
  incorrect: number;
  skipped: number;
} {
  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  let i = 0;
  while (i < units.length) {
    if (units[i] === ' ') {
      i++;
      continue;
    }
    const start = i;
    while (i < units.length && units[i] !== ' ') i++;

    let allCorrect = true;
    let hasWrong = false;
    let hasSkipped = false;
    let touched = false;
    for (let k = start; k < i; k++) {
      const s = states[k]!;
      if (s !== UNIT_CORRECT) allCorrect = false;
      if (s === UNIT_WRONG) hasWrong = true;
      if (s === UNIT_SKIPPED) hasSkipped = true;
      if (s !== UNIT_PENDING) touched = true;
    }
    if (hasSkipped) skipped++;
    else if (allCorrect && i > start) correct++;
    else if (touched && hasWrong) incorrect++;
  }
  return { correct, incorrect, skipped };
}

export function computeMetrics(input: MetricsInput): Metrics {
  const { states, units, keystrokes, mistakes, activeMs, perSecond } = input;

  let correctChars = 0;
  let skippedChars = 0;
  let uncorrected = 0;
  for (let i = 0; i < states.length; i++) {
    const s = states[i]!;
    if (s === UNIT_CORRECT) correctChars++;
    else if (s === UNIT_SKIPPED) skippedChars++;
    else if (s === UNIT_WRONG) uncorrected++;
  }

  const minutes = activeMs / 60000;
  const correctKeystrokes = keystrokes - mistakes;

  // Guard against division by zero on a test that never really started.
  const wpm = minutes > 0 ? correctChars / 5 / minutes : 0;
  const rawWpm = minutes > 0 ? keystrokes / 5 / minutes : 0;
  const cpm = minutes > 0 ? correctChars / minutes : 0;
  const accuracy = keystrokes === 0 ? 100 : (correctKeystrokes / keystrokes) * 100;

  const words = wordCounts(units, states);

  return {
    wpm: round1(wpm),
    rawWpm: round1(rawWpm),
    cpm: round1(cpm),
    accuracy: round1(accuracy),
    errors: mistakes,
    uncorrectedErrors: uncorrected,
    consistency: consistencyOf(perSecond),
    keystrokes,
    correctKeystrokes,
    correctChars,
    skippedChars,
    correctWords: words.correct,
    incorrectWords: words.incorrect,
    skippedWords: words.skipped,
    timeMs: activeMs,
    perSecond,
  };
}

/**
 * Short-test guard (docs/04): results are shown, but a test below 2 seconds
 * or 5 keystrokes must not be written to records.
 */
export function isRecordable(m: Metrics): boolean {
  return m.timeMs >= 2000 && m.keystrokes >= 5;
}
