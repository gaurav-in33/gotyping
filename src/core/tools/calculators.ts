/**
 * Manual typing calculators (docs/01 Tools > Typing utilities).
 * These take numbers the user already has (from a paper test, another app,
 * an exam result slip) rather than a live keystroke stream, so they cannot
 * reuse core/engine/session.ts directly — but they use the *exact* formulas
 * from docs/04-TYPING-ENGINE.md / core/engine/metrics.ts, so a manual
 * calculation and a live GoTyping test never disagree.
 */

export interface SpeedInput {
  /** Correctly typed characters (or words * 5, if only a word count is known). */
  correctChars: number;
  seconds: number;
}

export function wpmFrom(input: SpeedInput): number {
  if (input.seconds <= 0) return 0;
  const minutes = input.seconds / 60;
  return Math.round((input.correctChars / 5 / minutes) * 10) / 10;
}

export function cpmFrom(input: SpeedInput): number {
  if (input.seconds <= 0) return 0;
  const minutes = input.seconds / 60;
  return Math.round((input.correctChars / minutes) * 10) / 10;
}

export interface AccuracyInput {
  correctKeystrokes: number;
  totalKeystrokes: number;
}

export function accuracyFrom(input: AccuracyInput): number {
  if (input.totalKeystrokes <= 0) return 100;
  return Math.round((input.correctKeystrokes / input.totalKeystrokes) * 1000) / 10;
}

export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  lines: number;
  /** At a relaxed 200 wpm reading pace. */
  readingMinutes: number;
  /** At a relaxed 40 wpm typing pace. */
  typingMinutes: number;
}

/** The text analyzer — one pass, no regex backtracking traps on huge pastes. */
export function analyzeText(text: string): TextStats {
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s/g, '')).length;
  const words = text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  const sentences = (text.match(/[.!?]+(\s|$)/g) ?? []).length;
  const lines = text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
  return {
    characters,
    charactersNoSpaces,
    words,
    sentences,
    lines,
    readingMinutes: Math.round((words / 200) * 10) / 10,
    typingMinutes: Math.round((words / 40) * 10) / 10,
  };
}
