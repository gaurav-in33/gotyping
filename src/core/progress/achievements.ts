/**
 * Achievement unlock logic (docs/01 "Challenges"). Metadata (name,
 * description, category) lives in content/achievements.json so the list can
 * grow without touching code; this file only decides *when* each id unlocks,
 * from a plain snapshot the caller builds once per screen render.
 */
import achievementsData from '../../content/achievements.json';

export interface AchievementMeta {
  id: string;
  name: string;
  description: string;
  category: string;
}

export const ACHIEVEMENTS: AchievementMeta[] = achievementsData.achievements;

/** Everything an achievement check might need, gathered once by the caller. */
export interface ProgressSnapshot {
  totalTests: number;
  totalTimeMs: number;
  bestWpm: number;
  bestAccuracyTestWpm: number; // wpm of the best-accuracy test, unused but kept explicit
  anyAccuracy100: boolean;
  anyAccuracy98: boolean;
  longestZeroMistakeTestMs: number;
  maxConsecutivePerfect: number;
  longestTestMs: number;
  currentStreak: number;
  lessonsCompleted: number;
  totalLessons: number;
  languagesTested: ReadonlySet<string>;
  customThemeCount: number;
  level: number;
}

export function emptySnapshot(): ProgressSnapshot {
  return {
    totalTests: 0,
    totalTimeMs: 0,
    bestWpm: 0,
    bestAccuracyTestWpm: 0,
    anyAccuracy100: false,
    anyAccuracy98: false,
    longestZeroMistakeTestMs: 0,
    maxConsecutivePerfect: 0,
    longestTestMs: 0,
    currentStreak: 0,
    lessonsCompleted: 0,
    totalLessons: 0,
    languagesTested: new Set(),
    customThemeCount: 0,
    level: 1,
  };
}

type Check = (s: ProgressSnapshot) => boolean;

const CHECKS: Record<string, Check> = {
  'first-test': (s) => s.totalTests >= 1,
  'tests-10': (s) => s.totalTests >= 10,
  'tests-50': (s) => s.totalTests >= 50,
  'tests-200': (s) => s.totalTests >= 200,
  'tests-1000': (s) => s.totalTests >= 1000,
  'wpm-40': (s) => s.bestWpm >= 40,
  'wpm-60': (s) => s.bestWpm >= 60,
  'wpm-80': (s) => s.bestWpm >= 80,
  'wpm-100': (s) => s.bestWpm >= 100,
  'wpm-120': (s) => s.bestWpm >= 120,
  'accuracy-98': (s) => s.anyAccuracy98,
  'accuracy-100': (s) => s.anyAccuracy100,
  'no-mistake-long': (s) => s.longestZeroMistakeTestMs >= 60_000,
  'perfect-streak-3': (s) => s.maxConsecutivePerfect >= 3,
  'streak-3': (s) => s.currentStreak >= 3,
  'streak-7': (s) => s.currentStreak >= 7,
  'streak-30': (s) => s.currentStreak >= 30,
  'streak-100': (s) => s.currentStreak >= 100,
  'endurance-5min': (s) => s.longestTestMs >= 5 * 60_000,
  'total-time-1h': (s) => s.totalTimeMs >= 60 * 60_000,
  'total-time-10h': (s) => s.totalTimeMs >= 10 * 60 * 60_000,
  'lesson-first': (s) => s.lessonsCompleted >= 1,
  'lesson-10': (s) => s.lessonsCompleted >= 10,
  'lesson-all': (s) => s.totalLessons > 0 && s.lessonsCompleted >= s.totalLessons,
  'hindi-test': (s) => s.languagesTested.has('hi'),
  'hinglish-test': (s) => s.languagesTested.has('hinglish'),
  'all-languages': (s) =>
    s.languagesTested.has('en') && s.languagesTested.has('hi') && s.languagesTested.has('hinglish'),
  'theme-custom': (s) => s.customThemeCount >= 1,
  'level-5': (s) => s.level >= 5,
  'level-10': (s) => s.level >= 10,
};

export function isUnlocked(id: string, snapshot: ProgressSnapshot): boolean {
  return CHECKS[id]?.(snapshot) ?? false;
}

export interface AchievementStatus extends AchievementMeta {
  unlocked: boolean;
}

export function evaluateAchievements(snapshot: ProgressSnapshot): AchievementStatus[] {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: isUnlocked(a.id, snapshot) }));
}
