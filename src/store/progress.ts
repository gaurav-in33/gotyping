/**
 * Progression state: XP, level, streak snapshot, unlocked achievements and
 * challenge completions. One record in the `challenges` IndexedDB store
 * (docs/02), so a single get/put keeps it consistent — there is no
 * per-keystroke or per-test chatter beyond one write when a test finishes.
 */
import { idb, STORES } from './db';
import { levelForXp } from '../core/progress/levels';
import type { TestRecord } from './types';
import type { LessonProgress } from './lessons';
import {
  emptySnapshot,
  evaluateAchievements,
  type AchievementStatus,
  type ProgressSnapshot,
} from '../core/progress/achievements';

const PROGRESS_KEY = 'progress';

export interface ProgressState {
  id: typeof PROGRESS_KEY;
  totalXp: number;
  unlockedAchievements: string[];
  /** Challenge id -> ISO timestamp first cleared. */
  completedChallenges: Record<string, number>;
  speedLadderRung: number;
}

export function emptyProgressState(): ProgressState {
  return {
    id: PROGRESS_KEY,
    totalXp: 0,
    unlockedAchievements: [],
    completedChallenges: {},
    speedLadderRung: 0,
  };
}

export const progressRepo = {
  async get(): Promise<ProgressState> {
    if (!idb.available()) return emptyProgressState();
    const found = await idb.get<ProgressState>(STORES.challenges, PROGRESS_KEY);
    return found ?? emptyProgressState();
  },
  async save(state: ProgressState): Promise<void> {
    if (!idb.available()) return;
    await idb.put(STORES.challenges, state, PROGRESS_KEY);
  },
  /** Add XP and persist; returns the updated state. */
  async addXp(amount: number): Promise<ProgressState> {
    const state = await this.get();
    state.totalXp += Math.max(0, Math.round(amount));
    await this.save(state);
    return state;
  },
  async markChallengeComplete(id: string, now = Date.now()): Promise<ProgressState> {
    const state = await this.get();
    if (!(id in state.completedChallenges)) state.completedChallenges[id] = now;
    await this.save(state);
    return state;
  },
  async setUnlocked(ids: string[]): Promise<ProgressState> {
    const state = await this.get();
    const merged = new Set([...state.unlockedAchievements, ...ids]);
    state.unlockedAchievements = Array.from(merged);
    await this.save(state);
    return state;
  },
  async setLadderRung(rung: number): Promise<ProgressState> {
    const state = await this.get();
    state.speedLadderRung = Math.max(state.speedLadderRung, rung);
    await this.save(state);
    return state;
  },
};

/** Build the achievement snapshot from plain history/lesson data (pure). */
export function buildSnapshot(
  tests: readonly TestRecord[],
  lessons: readonly LessonProgress[],
  totalLessons: number,
  currentStreak: number,
  customThemeCount: number,
  totalXp: number,
): ProgressSnapshot {
  if (tests.length === 0) {
    return {
      ...emptySnapshot(),
      lessonsCompleted: lessons.filter((l) => l.completed).length,
      totalLessons,
      currentStreak,
      customThemeCount,
      level: levelForXp(totalXp).level,
    };
  }

  const sorted = tests.slice().sort((a, b) => a.ts - b.ts);
  let maxConsecutivePerfect = 0;
  let run = 0;
  let longestZeroMistakeTestMs = 0;
  let longestTestMs = 0;
  let bestWpm = 0;
  let anyAccuracy100 = false;
  let anyAccuracy98 = false;
  let totalTimeMs = 0;
  const languages = new Set<string>();

  for (const t of sorted) {
    totalTimeMs += t.timeMs;
    bestWpm = Math.max(bestWpm, t.wpm);
    languages.add(t.lang);
    if (t.accuracy >= 100) {
      anyAccuracy100 = true;
      run++;
      maxConsecutivePerfect = Math.max(maxConsecutivePerfect, run);
    } else {
      run = 0;
    }
    if (t.accuracy >= 98) anyAccuracy98 = true;
    if (t.errors === 0) longestZeroMistakeTestMs = Math.max(longestZeroMistakeTestMs, t.timeMs);
    longestTestMs = Math.max(longestTestMs, t.timeMs);
  }

  return {
    totalTests: tests.length,
    totalTimeMs,
    bestWpm,
    bestAccuracyTestWpm: 0,
    anyAccuracy100,
    anyAccuracy98,
    longestZeroMistakeTestMs,
    maxConsecutivePerfect,
    longestTestMs,
    currentStreak,
    lessonsCompleted: lessons.filter((l) => l.completed).length,
    totalLessons,
    languagesTested: languages,
    customThemeCount,
    level: levelForXp(totalXp).level,
  };
}

export function achievementsFor(snapshot: ProgressSnapshot): AchievementStatus[] {
  return evaluateAchievements(snapshot);
}
