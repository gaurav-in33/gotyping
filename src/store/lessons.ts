/**
 * Per-lesson progress (docs/02 "lessons" store). Pure selectors + a thin
 * IndexedDB-backed repo, same shape as history.ts.
 */
import { idb, STORES } from './db';

export interface LessonProgress {
  id: string;
  completed: boolean;
  attempts: number;
  bestWpm: number;
  bestAccuracy: number;
  lastTs: number;
}

export function emptyProgress(id: string): LessonProgress {
  return { id, completed: false, attempts: 0, bestWpm: 0, bestAccuracy: 0, lastTs: 0 };
}

/** A lesson "passes" once accuracy and wpm (if set) clear its targets. */
export function passes(
  wpm: number,
  accuracy: number,
  targetWpm: number | null,
  targetAccuracy: number | null,
): boolean {
  if (targetAccuracy !== null && accuracy < targetAccuracy) return false;
  if (targetWpm !== null && wpm < targetWpm) return false;
  return true;
}

export function foldAttempt(
  prev: LessonProgress,
  wpm: number,
  accuracy: number,
  passed: boolean,
  ts: number,
): LessonProgress {
  return {
    id: prev.id,
    completed: prev.completed || passed,
    attempts: prev.attempts + 1,
    bestWpm: Math.max(prev.bestWpm, wpm),
    bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
    lastTs: ts,
  };
}

export const lessonProgressRepo = {
  async get(id: string): Promise<LessonProgress> {
    if (!idb.available()) return emptyProgress(id);
    const found = await idb.get<LessonProgress>(STORES.lessons, id);
    return found ?? emptyProgress(id);
  },
  async all(): Promise<LessonProgress[]> {
    if (!idb.available()) return [];
    return idb.all<LessonProgress>(STORES.lessons);
  },
  async record(id: string, wpm: number, accuracy: number, passed: boolean, ts = Date.now()): Promise<LessonProgress> {
    const prev = await this.get(id);
    const next = foldAttempt(prev, wpm, accuracy, passed, ts);
    if (idb.available()) await idb.put(STORES.lessons, next);
    return next;
  },
};
