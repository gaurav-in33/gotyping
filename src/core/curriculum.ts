/**
 * Loads data/curriculum-outline.json (bundled as src/content, see docs/02).
 * Pure data shape — lesson *text* is generated at runtime by
 * src/core/text/lessons.ts, never copied from any course (AGENT.md).
 */
import type { LanguageId } from '../store/settings';

export type LessonType =
  | 'intro'
  | 'keys'
  | 'ngrams'
  | 'words'
  | 'sentences'
  | 'paragraph'
  | 'words-cap'
  | 'punct'
  | 'numbers'
  | 'symbols'
  | 'shift'
  | 'adaptive'
  | 'difficult'
  | 'punct-mixed'
  | 'symbols-mixed'
  | 'code'
  | 'keys-hi';

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  keys: string;
  objective: string;
  targetAccuracy: number | null;
  targetWpm: number | null;
  estMinutes: number;
}

export interface Course {
  id: string;
  name: string;
  lang: LanguageId;
  lessons: Lesson[];
}

interface CurriculumFile {
  note: string;
  categories: Course[];
}

let cache: Course[] | null = null;

export async function loadCurriculum(): Promise<Course[]> {
  if (cache) return cache;
  const mod = (await import('../content/curriculum-outline.json')) as unknown as {
    default: CurriculumFile;
  };
  cache = mod.default.categories;
  return cache;
}

export function courseById(courses: readonly Course[], id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function lessonById(
  courses: readonly Course[],
  id: string,
): { course: Course; lesson: Lesson; index: number } | undefined {
  for (const course of courses) {
    const index = course.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { course, lesson: course.lessons[index]!, index };
  }
  return undefined;
}

/** The lesson right after this one in its own course, if any (course home "next"). */
export function nextLesson(courses: readonly Course[], id: string): Lesson | undefined {
  const found = lessonById(courses, id);
  if (!found) return undefined;
  return found.course.lessons[found.index + 1];
}
