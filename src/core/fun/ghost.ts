/**
 * Ghost race (docs/01 §7): races the current attempt against the player's
 * own best run on the same text style, replayed from a stored per-character
 * timeline — not a second implementation of the typing engine, just a
 * record of one past Session's Capture buffer.
 */
import type { Capture } from '../engine/session';
import { idb, STORES } from '../../store/db';

export interface GhostRecord {
  id: string;
  /** Cumulative elapsed ms at the moment each unit was completed. */
  cumulativeMs: number[];
  wpm: number;
  accuracy: number;
  at: number;
}

/** One (lang, mode, style) bucket per ghost — close enough to "this kind of text" without over-fragmenting history. */
export function ghostKey(lang: string, mode: string, style: string): string {
  return `${lang}:${mode}:${style}`;
}

/** Turns a Capture buffer into a cumulative-ms-per-unit timeline. Skips/backspaces don't add a timeline point. */
export function cumulativeMsFromCaptures(captures: readonly Capture[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const c of captures) {
    acc += Math.max(0, c.latencyMs);
    if (c.ok) out.push(acc);
  }
  return out;
}

/** How many ghost units would be done by `elapsedMs` into the race. */
export function ghostProgressAt(ghost: GhostRecord, elapsedMs: number): number {
  let lo = 0;
  let hi = ghost.cumulativeMs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ghost.cumulativeMs[mid]! <= elapsedMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** A new run only overwrites the stored ghost when it is a genuine improvement. */
export function isBetterGhost(next: GhostRecord, prev: GhostRecord | undefined): boolean {
  if (!prev) return true;
  if (next.wpm !== prev.wpm) return next.wpm > prev.wpm;
  return next.accuracy >= prev.accuracy;
}

export const ghostRepo = {
  async get(key: string): Promise<GhostRecord | undefined> {
    if (!idb.available()) return undefined;
    return idb.get<GhostRecord>(STORES.ghosts, key);
  },
  async save(record: GhostRecord): Promise<void> {
    if (!idb.available()) return;
    await idb.put(STORES.ghosts, record, record.id);
  },
};
