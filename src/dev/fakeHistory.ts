/**
 * Dev-only fake history generator (docs/07 "verify Stats with 5,000 fake
 * tests"). Pure and seeded so it is unit-testable; the IndexedDB writer in
 * seed.ts is the thin, non-portable part. Never imported by production UI —
 * see src/dev/seed.ts and the console-only hook in src/dev/devTools.ts.
 */
import { makeRng } from '../core/text/rng';
import { isoDay } from '../store/aggregates';
import { emptyAggregates, emptyCell, type Aggregates, type StatCell, type TestRecord } from '../store/types';

const SAMPLE_CHARS = 'etaoinshrdlucmfwypvbgkjqxz'.split('');
const SAMPLE_WORDS = ['the', 'and', 'for', 'you', 'that', 'with', 'have', 'this', 'from', 'they'];
const MODES = ['time', 'words', 'practice', 'lesson'] as const;
const LANGS = ['en', 'hi', 'hinglish'] as const;

function bump(map: Record<string, StatCell>, key: string, latency: number, ok: boolean): void {
  const cell = map[key] ?? emptyCell();
  cell.count++;
  if (!ok) cell.errors++;
  cell.sum += latency;
  cell.sumSq += latency * latency;
  map[key] = cell;
}

export interface FakeHistoryOptions {
  count: number;
  seed: number | string;
  /** Spread test timestamps across this many past days. */
  days?: number;
  /** 0..1 — the user improves over the period, like a real learner. */
  improvement?: number;
  /** Injectable "now", for deterministic tests. Defaults to Date.now(). */
  now?: number;
}

export interface FakeHistory {
  tests: TestRecord[];
  aggregates: Aggregates;
}

export function generateFakeHistory(opts: FakeHistoryOptions): FakeHistory {
  const rng = makeRng(opts.seed);
  const days = opts.days ?? 90;
  const improvement = opts.improvement ?? 0.4;
  const agg = emptyAggregates();
  const tests: TestRecord[] = [];
  const now = opts.now ?? Date.now();

  for (let i = 0; i < opts.count; i++) {
    const progress = i / Math.max(1, opts.count - 1); // 0 (oldest) .. 1 (newest)
    const ageMs = (1 - progress) * days * 24 * 60 * 60 * 1000;
    const ts = Math.round(now - ageMs - rng.int(1000 * 60 * 60 * 6));

    const baseWpm = 25 + progress * 40 * improvement;
    const wpm = Math.max(5, Math.round(baseWpm + (rng.next() - 0.5) * 14));
    const accuracy = Math.max(60, Math.min(100, Math.round(90 + progress * 8 + (rng.next() - 0.5) * 10)));
    const lang = rng.pick(LANGS);
    const mode = rng.pick(MODES);
    const duration = mode === 'time' ? rng.pick([15, 30, 60]) : 0;
    const keystrokes = 100 + rng.int(300);
    const errors = Math.round(keystrokes * (1 - accuracy / 100) * 0.5);

    const rec: TestRecord = {
      id: `fake-${i}-${ts.toString(36)}`,
      ts,
      mode,
      lang,
      layout: lang === 'hi' ? 'inscript' : 'qwerty',
      duration,
      config: {
        style: 'words',
        punctuation: rng.next() < 0.3,
        numbers: rng.next() < 0.2,
        capitalization: rng.next() < 0.3,
        stopOnError: false,
        backspace: 'allow',
      },
      wpm,
      raw: wpm + rng.int(8),
      cpm: wpm * 5,
      accuracy,
      consistency: 60 + rng.int(35),
      errors,
      uncorrectedErrors: Math.round(errors * 0.3),
      keystrokes,
      correctKeystrokes: keystrokes - errors,
      correctChars: keystrokes - errors,
      skippedChars: rng.int(3),
      correctWords: Math.round(keystrokes / 5),
      incorrectWords: rng.int(4),
      timeMs: duration > 0 ? duration * 1000 : 20000 + rng.int(40000),
      perSecond: [],
      ...(mode === 'lesson' ? { lessonId: `en-beginner-0${1 + rng.int(6)}` } : {}),
    };
    tests.push(rec);

    // Approximate per-key / per-finger / daily aggregates for this test.
    const weakChar = rng.pick(SAMPLE_CHARS);
    for (let k = 0; k < Math.min(40, keystrokes); k++) {
      const ch = rng.next() < 0.15 ? weakChar : rng.pick(SAMPLE_CHARS);
      const ok = rng.next() > (1 - accuracy / 100) * (ch === weakChar ? 2.2 : 0.6);
      bump(agg.keys, ch, 90 + rng.int(220), ok);
    }
    if (rng.next() < 0.6) {
      bump(agg.words, rng.pick(SAMPLE_WORDS), 300 + rng.int(500), rng.next() > 0.1);
    }
    const dayKey = isoDay(ts);
    const day = agg.days[dayKey] ?? { tests: 0, timeMs: 0, keystrokes: 0, wpmSum: 0 };
    day.tests++;
    day.timeMs += rec.timeMs;
    day.keystrokes += rec.keystrokes;
    day.wpmSum += rec.wpm;
    agg.days[dayKey] = day;
  }

  return { tests, aggregates: agg };
}
