/**
 * Export / import. Validation is strict: imported data is never trusted.
 */
import { defaultSettings, type Settings } from './settings';
import { emptyAggregates, type Aggregates, type TestRecord } from './types';

export const BACKUP_SCHEMA = 1;

export interface Backup {
  app: 'gotyping';
  schema: number;
  exportedAt: number;
  settings: Settings;
  tests: TestRecord[];
  aggregates: Aggregates;
  lessons: unknown[];
  challenges: unknown[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Present only when ok. */
  backup?: Backup;
  summary?: {
    tests: number;
    lessons: number;
    challenges: number;
    exportedAt: number;
    schema: number;
  };
}

export function makeBackup(parts: {
  settings: Settings;
  tests: TestRecord[];
  aggregates: Aggregates;
  lessons?: unknown[];
  challenges?: unknown[];
  now?: number;
}): Backup {
  return {
    app: 'gotyping',
    schema: BACKUP_SCHEMA,
    exportedAt: parts.now ?? Date.now(),
    settings: parts.settings,
    tests: parts.tests,
    aggregates: parts.aggregates,
    lessons: parts.lessons ?? [],
    challenges: parts.challenges ?? [],
  };
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validTest(v: unknown): v is TestRecord {
  if (v === null || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t['id'] === 'string' &&
    num(t['ts']) &&
    typeof t['mode'] === 'string' &&
    num(t['wpm']) &&
    num(t['accuracy']) &&
    num(t['keystrokes'])
  );
}

/**
 * Parse and validate an exported file. Returns every problem found rather
 * than throwing, so the UI can show a useful message.
 */
export function validateBackup(json: string): ValidationResult {
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] };
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['File does not contain a GoTyping backup object.'] };
  }
  const o = raw as Record<string, unknown>;

  if (o['app'] !== 'gotyping') errors.push('Not a GoTyping backup (missing app marker).');
  if (!num(o['schema'])) errors.push('Missing or invalid schema version.');
  else if ((o['schema'] as number) > BACKUP_SCHEMA) {
    errors.push(
      `Backup schema ${String(o['schema'])} is newer than this app supports (${BACKUP_SCHEMA}).`,
    );
  }

  const tests = Array.isArray(o['tests']) ? (o['tests'] as unknown[]) : null;
  if (!tests) errors.push('Missing tests array.');

  if (errors.length > 0) return { ok: false, errors };

  const goodTests = (tests ?? []).filter(validTest);
  const dropped = (tests ?? []).length - goodTests.length;
  if (dropped > 0) errors.push(`${dropped} test record(s) were malformed and will be skipped.`);

  const settings =
    o['settings'] && typeof o['settings'] === 'object'
      ? (o['settings'] as Settings)
      : defaultSettings;

  const aggregates =
    o['aggregates'] && typeof o['aggregates'] === 'object'
      ? (o['aggregates'] as Aggregates)
      : emptyAggregates();

  const backup: Backup = {
    app: 'gotyping',
    schema: o['schema'] as number,
    exportedAt: num(o['exportedAt']) ? (o['exportedAt'] as number) : 0,
    settings,
    tests: goodTests,
    aggregates,
    lessons: Array.isArray(o['lessons']) ? (o['lessons'] as unknown[]) : [],
    challenges: Array.isArray(o['challenges']) ? (o['challenges'] as unknown[]) : [],
  };

  return {
    ok: true,
    // Non-fatal notes (e.g. skipped records) still travel back to the UI.
    errors,
    backup,
    summary: {
      tests: goodTests.length,
      lessons: backup.lessons.length,
      challenges: backup.challenges.length,
      exportedAt: backup.exportedAt,
      schema: backup.schema,
    },
  };
}

/** Merge imported tests into existing ones, de-duplicating by id. */
export function mergeTests(
  existing: readonly TestRecord[],
  incoming: readonly TestRecord[],
): TestRecord[] {
  const byId = new Map<string, TestRecord>();
  for (const t of existing) byId.set(t.id, t);
  for (const t of incoming) if (!byId.has(t.id)) byId.set(t.id, t);
  return Array.from(byId.values()).sort((a, b) => a.ts - b.ts);
}
