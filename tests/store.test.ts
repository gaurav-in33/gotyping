import { describe, expect, it } from 'vitest';
import {
  SettingsStore,
  SETTINGS_KEY,
  SETTINGS_VERSION,
  defaultSettings,
  migrate,
  parseSettings,
  type StorageLike,
} from '../src/store/settings';
import {
  applyCap,
  averageWpm,
  compactOldSeries,
  filterTests,
  makeTestRecord,
  personalBest,
} from '../src/store/history';
import { foldCapture, foldTest, isoDay, topBy } from '../src/store/aggregates';
import { cellErrorRate, cellMean, cellStdev, emptyAggregates } from '../src/store/types';
import { computeMetrics, UNIT_CORRECT } from '../src/core/engine/metrics';
import type { Capture } from '../src/core/engine/session';
import type { TestRecord } from '../src/store/types';

class FakeStorage implements StorageLike {
  map = new Map<string, string>();
  getItem(k: string): string | null {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
}

// ----------------------------------------------------------------- settings

describe('settings store', () => {
  it('starts from defaults when storage is empty', () => {
    const s = new SettingsStore(new FakeStorage());
    expect(s.get().typing.defaultTime).toBe(30);
    expect(s.get().v).toBe(SETTINGS_VERSION);
  });

  it('persists updates', () => {
    const backend = new FakeStorage();
    const s = new SettingsStore(backend);
    s.update((d) => {
      d.typing.defaultTime = 120;
    });
    expect(JSON.parse(backend.getItem(SETTINGS_KEY)!).typing.defaultTime).toBe(120);
    expect(new SettingsStore(backend).get().typing.defaultTime).toBe(120);
  });

  it('notifies subscribers', () => {
    const s = new SettingsStore(new FakeStorage());
    let seen = 0;
    const off = s.subscribe(() => seen++);
    s.update((d) => {
      d.motion.animations = false;
    });
    expect(seen).toBe(1);
    off();
    s.update((d) => {
      d.motion.animations = true;
    });
    expect(seen).toBe(1);
  });

  it('resets to defaults', () => {
    const s = new SettingsStore(new FakeStorage());
    s.update((d) => {
      d.display.fontSize = 48;
    });
    s.reset();
    expect(s.get().display.fontSize).toBe(defaultSettings.display.fontSize);
  });

  it('survives a missing storage backend', () => {
    const s = new SettingsStore(null);
    expect(() => s.update((d) => (d.display.fontSize = 20))).not.toThrow();
    expect(s.get().display.fontSize).toBe(20);
  });
});

describe('settings parsing and migration', () => {
  it('falls back to defaults on corrupt JSON', () => {
    expect(parseSettings('{not json').typing.defaultTime).toBe(30);
    expect(parseSettings('null').typing.defaultTime).toBe(30);
    expect(parseSettings('[]').typing.defaultTime).toBe(30);
  });

  it('keeps unknown-but-valid user values and fills gaps', () => {
    const partial = JSON.stringify({ v: SETTINGS_VERSION, display: { fontSize: 40 } });
    const s = parseSettings(partial);
    expect(s.display.fontSize).toBe(40);
    expect(s.display.lineHeight).toBe(defaultSettings.display.lineHeight);
  });

  it('ignores values of the wrong type', () => {
    const bad = JSON.stringify({ v: SETTINGS_VERSION, display: { fontSize: 'huge' } });
    expect(parseSettings(bad).display.fontSize).toBe(defaultSettings.display.fontSize);
  });

  it('migrates a v1 payload to the current version', () => {
    const v1 = {
      v: 1,
      display: { liveStats: { wpm: true, accuracy: true, errors: false, timer: true } },
      typing: { defaultTime: 60 },
    };
    const out = migrate({ ...v1 } as Record<string, unknown>);
    expect(out['v']).toBe(SETTINGS_VERSION);
    const display = out['display'] as Record<string, unknown>;
    const live = display['liveStats'] as Record<string, unknown>;
    expect(live['progress']).toBe(true);
    const typing = out['typing'] as Record<string, unknown>;
    expect(typing['pauseOnBlur']).toBe(true);
  });

  it('migrates through parseSettings and keeps user values', () => {
    const v1 = JSON.stringify({ v: 1, typing: { defaultTime: 60 } });
    const s = parseSettings(v1);
    expect(s.v).toBe(SETTINGS_VERSION);
    expect(s.typing.defaultTime).toBe(60);
    expect(s.typing.pauseOnBlur).toBe(true);
  });

  it('stamps the current version on payloads from the future', () => {
    const out = migrate({ v: 99 } as Record<string, unknown>);
    expect(out['v']).toBe(SETTINGS_VERSION);
  });

  it('migrates a v2 payload: adds the Practice category (Step 2)', () => {
    const v2 = { v: 2, typing: { defaultTime: 45 } };
    const out = migrate({ ...v2 } as Record<string, unknown>);
    expect(out['v']).toBe(SETTINGS_VERSION);
    const practice = out['practice'] as Record<string, unknown>;
    expect(practice['difficulty']).toBe('normal');
    expect(practice['targetWpm']).toBe(40);
    expect(practice['targetAccuracy']).toBe(95);
  });

  it('does not clobber a user Practice value already present at v2', () => {
    const v2 = { v: 2, practice: { difficulty: 'hard' } };
    const out = migrate({ ...v2 } as Record<string, unknown>);
    const practice = out['practice'] as Record<string, unknown>;
    expect(practice['difficulty']).toBe('hard');
  });

  it('migrates the legacy on-screen keyboard into a visible guide with optional tapping', () => {
    const out = migrate({ v: 4, display: { showKeyboard: true }, keyboard: {} });
    const keyboard = out['keyboard'] as Record<string, unknown>;
    expect(keyboard['guideVisible']).toBe(true);
    expect(keyboard['tapGuideToType']).toBe(true);
    expect(parseSettings(JSON.stringify({ v: 4, display: { showKeyboard: false } })).keyboard.guideVisible).toBe(true);
    expect(defaultSettings.keyboard.tapGuideToType).toBe(false);
  });
});

// ------------------------------------------------------------------ history

const rec = (over: Partial<TestRecord>): TestRecord => ({
  id: Math.random().toString(36).slice(2),
  ts: 0,
  mode: 'time',
  lang: 'en',
  layout: 'qwerty',
  duration: 30,
  config: {
    style: 'words', punctuation: false, numbers: false,
    capitalization: false, stopOnError: false, backspace: 'allow',
  },
  wpm: 50, raw: 55, cpm: 250, accuracy: 95, consistency: 80,
  errors: 2, uncorrectedErrors: 0, keystrokes: 100, correctKeystrokes: 98,
  correctChars: 98, skippedChars: 0, correctWords: 20, incorrectWords: 1,
  timeMs: 30000, perSecond: [60, 60, 60],
  ...over,
});

describe('history', () => {
  it('caps to the newest N records', () => {
    const tests = Array.from({ length: 10 }, (_, i) => rec({ ts: i }));
    const kept = applyCap(tests, 4);
    expect(kept).toHaveLength(4);
    expect(kept.map((t) => t.ts)).toEqual([6, 7, 8, 9]);
  });

  it('leaves history untouched below the cap', () => {
    const tests = [rec({ ts: 1 }), rec({ ts: 2 })];
    expect(applyCap(tests, 5)).toHaveLength(2);
  });

  it('treats a cap of 0 as unlimited', () => {
    const tests = Array.from({ length: 7 }, (_, i) => rec({ ts: i }));
    expect(applyCap(tests, 0)).toHaveLength(7);
  });

  it('filters by language, mode and duration', () => {
    const tests = [
      rec({ lang: 'en', mode: 'time', duration: 30 }),
      rec({ lang: 'hi', mode: 'time', duration: 30 }),
      rec({ lang: 'en', mode: 'words', duration: 0 }),
    ];
    expect(filterTests(tests, { lang: 'en' })).toHaveLength(2);
    expect(filterTests(tests, { mode: 'words' })).toHaveLength(1);
    expect(filterTests(tests, { lang: 'en', duration: 30 })).toHaveLength(1);
    expect(filterTests(tests, {})).toHaveLength(3);
  });

  it('filters by lessonId (Stats > lesson filter)', () => {
    const tests = [
      rec({ lang: 'en', lessonId: 'home-row-1' }),
      rec({ lang: 'en', lessonId: 'home-row-2' }),
      rec({ lang: 'en' }), // no lesson (a Type/Practice session)
    ];
    expect(filterTests(tests, { lessonId: 'home-row-1' })).toHaveLength(1);
    expect(filterTests(tests, { lessonId: 'home-row-2' })[0]!.lessonId).toBe('home-row-2');
    expect(filterTests(tests, {})).toHaveLength(3);
  });

  it('finds the personal best within a filter', () => {
    const tests = [
      rec({ wpm: 40, lang: 'en' }),
      rec({ wpm: 90, lang: 'hi' }),
      rec({ wpm: 70, lang: 'en' }),
    ];
    expect(personalBest(tests)?.wpm).toBe(90);
    expect(personalBest(tests, { lang: 'en' })?.wpm).toBe(70);
    expect(personalBest([], {})).toBeNull();
  });

  it('averages wpm', () => {
    expect(averageWpm([rec({ wpm: 40 }), rec({ wpm: 60 })])).toBe(50);
    expect(averageWpm([])).toBe(0);
  });

  it('compacts per-second series on older tests only', () => {
    const tests = Array.from({ length: 5 }, (_, i) => rec({ ts: i }));
    const out = compactOldSeries(tests, 2);
    expect(out[0]!.perSecond.length).toBeGreaterThan(0);
    expect(out[1]!.perSecond.length).toBeGreaterThan(0);
    expect(out[2]!.perSecond).toEqual([]);
  });

  it('builds a record from metrics', () => {
    const m = computeMetrics({
      states: Uint8Array.from([UNIT_CORRECT, UNIT_CORRECT]),
      units: ['a', 'b'],
      keystrokes: 2, mistakes: 0, activeMs: 60000, perSecond: [24],
    });
    const r = makeTestRecord({
      metrics: m, mode: 'time', lang: 'en', layout: 'qwerty', duration: 60,
      config: {
        style: 'words', punctuation: false, numbers: false,
        capitalization: false, stopOnError: false, backspace: 'allow',
      },
      now: 1700000000000,
    });
    expect(r.wpm).toBe(m.wpm);
    expect(r.ts).toBe(1700000000000);
    expect(r.id).toBeTruthy();
    expect(r.lessonId).toBeUndefined();
  });
});

// --------------------------------------------------------------- aggregates

const cap = (expected: string | null, typed: string, latencyMs: number, ok: boolean): Capture => ({
  expected, typed, latencyMs, ok,
});

describe('aggregates', () => {
  it('folds per-key counts, errors and latency', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [
      cap('a', 'a', 100, true),
      cap('a', 'b', 200, false),
      cap('b', 'b', 300, true),
    ]);
    expect(agg.keys['a']!.count).toBe(2);
    expect(agg.keys['a']!.errors).toBe(1);
    expect(cellMean(agg.keys['a']!)).toBe(150);
    expect(cellErrorRate(agg.keys['a']!)).toBe(0.5);
    expect(agg.errorPairs['a→b']).toBe(1);
  });

  it('computes latency stdev from sum of squares', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [
      cap('x', 'x', 100, true),
      cap('x', 'x', 300, true),
    ]);
    // mean 200, deviations +-100 -> stdev 100
    expect(cellStdev(agg.keys['x']!)).toBeCloseTo(100, 6);
  });

  it('clamps outlier latency so one pause cannot skew the mean', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [cap('q', 'q', 999999, true)]);
    expect(cellMean(agg.keys['q']!)).toBe(2000);
  });

  it('builds bigrams and trigrams but skips spaces', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [
      cap('c', 'c', 100, true),
      cap('a', 'a', 100, true),
      cap('t', 't', 100, true),
      cap(' ', ' ', 100, true),
      cap('d', 'd', 100, true),
    ]);
    expect(agg.bigrams['ca']).toBeDefined();
    expect(agg.bigrams['at']).toBeDefined();
    expect(agg.bigrams['t ']).toBeUndefined();
    expect(agg.trigrams['cat']).toBeDefined();
  });

  it('tallies whole words', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [
      cap('c', 'c', 100, true),
      cap('a', 'x', 100, false),
      cap('t', 't', 100, true),
      cap(' ', ' ', 100, true),
      cap('g', 'g', 100, true),
      cap('o', 'o', 100, true),
    ]);
    expect(agg.words['cat']!.count).toBe(1);
    expect(agg.words['cat']!.errors).toBe(1);
    expect(agg.words['go']!.errors).toBe(0);
  });

  it('attributes keystrokes to fingers', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [cap('f', 'f', 100, true), cap('j', 'j', 100, false)]);
    expect(agg.fingers['l-index']!.count).toBe(1);
    expect(agg.fingers['r-index']!.errors).toBe(1);
  });

  it('ignores zen captures with no expected unit', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [cap(null, 'a', 100, true)]);
    expect(Object.keys(agg.keys)).toHaveLength(0);
  });

  it('folds a whole test into per-day rollups', () => {
    const agg = emptyAggregates();
    const r = rec({ ts: new Date(2026, 0, 15, 10, 0, 0).getTime(), wpm: 55 });
    foldTest(agg, r, [cap('a', 'a', 100, true)]);
    const day = agg.days[isoDay(r.ts)]!;
    expect(day.tests).toBe(1);
    expect(day.wpmSum).toBe(55);
  });

  it('isoDay formats as YYYY-MM-DD', () => {
    expect(isoDay(new Date(2026, 1, 3, 12).getTime())).toBe('2026-02-03');
  });

  it('topBy ranks and respects minCount', () => {
    const agg = emptyAggregates();
    foldCapture(agg, [
      cap('a', 'z', 100, false),
      cap('a', 'z', 100, false),
      cap('b', 'b', 100, true),
    ]);
    const worst = topBy(agg.keys, cellErrorRate, 5, 2);
    expect(worst).toHaveLength(1);
    expect(worst[0]!.key).toBe('a');
  });
});
