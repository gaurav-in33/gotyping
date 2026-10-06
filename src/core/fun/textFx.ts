import { makeRng } from '../text/rng';

/**
 * Random-capitalization fun mode (docs/01 §7): flips the case of individual
 * letters so the usual sentence-case rhythm cannot be relied on. Seeded, so
 * a given (text, seed) pair always scrambles the same way — same
 * determinism contract as the rest of core/text.
 */
export function randomizeCase(text: string, seed: number | string): string {
  const rng = makeRng(seed);
  return Array.from(text)
    .map((ch) => {
      if (!/[a-zA-Z\u0900-\u097F]/.test(ch)) return ch;
      return rng.next() < 0.5 ? ch.toUpperCase() : ch.toLowerCase();
    })
    .join('');
}
