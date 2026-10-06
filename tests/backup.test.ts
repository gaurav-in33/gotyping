import { describe, expect, it } from 'vitest';
import { BACKUP_SCHEMA, makeBackup, mergeTests, validateBackup } from '../src/store/backup';
import { defaultSettings } from '../src/store/settings';
import { emptyAggregates, type TestRecord } from '../src/store/types';

const rec = (over: Partial<TestRecord> = {}): TestRecord => ({
  id: 'id-' + (over.ts ?? 0),
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
  timeMs: 30000, perSecond: [],
  ...over,
});

describe('export / import round trip', () => {
  it('round-trips settings, tests and aggregates exactly', () => {
    const settings = { ...defaultSettings };
    settings.display.fontSize = 36;
    const tests = [rec({ ts: 1 }), rec({ ts: 2 })];
    const aggregates = emptyAggregates();
    aggregates.keys['a'] = { count: 5, errors: 1, sum: 500, sumSq: 50000 };

    const json = JSON.stringify(makeBackup({ settings, tests, aggregates, now: 123 }));
    const result = validateBackup(json);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.backup!.tests).toHaveLength(2);
    expect(result.backup!.settings.display.fontSize).toBe(36);
    expect(result.backup!.aggregates.keys['a']!.count).toBe(5);
    expect(result.backup!.exportedAt).toBe(123);
    expect(result.summary!.tests).toBe(2);
  });

  it('marks the export with the app name and schema', () => {
    const b = makeBackup({ settings: defaultSettings, tests: [], aggregates: emptyAggregates() });
    expect(b.app).toBe('gotyping');
    expect(b.schema).toBe(BACKUP_SCHEMA);
  });
});

describe('validation rejects bad input', () => {
  it('rejects non-JSON', () => {
    const r = validateBackup('definitely not json');
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/not valid JSON/i);
  });

  it('rejects JSON that is not an object', () => {
    expect(validateBackup('[1,2,3]').ok).toBe(false);
    expect(validateBackup('"a string"').ok).toBe(false);
    expect(validateBackup('null').ok).toBe(false);
  });

  it('rejects a file from another app', () => {
    const r = validateBackup(JSON.stringify({ app: 'someapp', schema: 1, tests: [] }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/not a gotyping backup/i);
  });

  it('rejects a missing tests array', () => {
    const r = validateBackup(JSON.stringify({ app: 'gotyping', schema: 1 }));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/tests/i);
  });

  it('rejects a schema from a newer version', () => {
    const r = validateBackup(
      JSON.stringify({ app: 'gotyping', schema: BACKUP_SCHEMA + 5, tests: [] }),
    );
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/newer than this app supports/i);
  });

  it('rejects a corrupted (truncated) export', () => {
    const json = JSON.stringify(
      makeBackup({ settings: defaultSettings, tests: [rec()], aggregates: emptyAggregates() }),
    );
    expect(validateBackup(json.slice(0, json.length - 20)).ok).toBe(false);
  });
});

describe('validation is tolerant where it safely can be', () => {
  it('skips malformed records but keeps the good ones, and says so', () => {
    const payload = {
      app: 'gotyping',
      schema: BACKUP_SCHEMA,
      exportedAt: 1,
      settings: defaultSettings,
      aggregates: emptyAggregates(),
      tests: [rec({ ts: 1 }), { id: 'broken' }, null, 42, rec({ ts: 2 })],
    };
    const r = validateBackup(JSON.stringify(payload));
    expect(r.ok).toBe(true);
    expect(r.backup!.tests).toHaveLength(2);
    expect(r.errors.join(' ')).toMatch(/3 test record\(s\) were malformed/);
  });

  it('substitutes defaults for missing settings and aggregates', () => {
    const r = validateBackup(
      JSON.stringify({ app: 'gotyping', schema: BACKUP_SCHEMA, tests: [] }),
    );
    expect(r.ok).toBe(true);
    expect(r.backup!.settings.typing.defaultTime).toBe(defaultSettings.typing.defaultTime);
    expect(r.backup!.aggregates.keys).toEqual({});
  });

  it('never trusts imported data blindly: a hostile payload cannot inject fields', () => {
    const r = validateBackup(
      JSON.stringify({
        app: 'gotyping', schema: BACKUP_SCHEMA, tests: [],
        lessons: 'not-an-array', challenges: { nope: true },
      }),
    );
    expect(r.ok).toBe(true);
    expect(r.backup!.lessons).toEqual([]);
    expect(r.backup!.challenges).toEqual([]);
  });
});

describe('merge', () => {
  it('de-duplicates by id and sorts by time', () => {
    const a = [rec({ ts: 2 }), rec({ ts: 1 })];
    const b = [rec({ ts: 1 }), rec({ ts: 3 })];
    const out = mergeTests(a, b);
    expect(out.map((t) => t.ts)).toEqual([1, 2, 3]);
  });

  it('keeps the existing record when ids collide', () => {
    const existing = [rec({ ts: 1, wpm: 100 })];
    const incoming = [rec({ ts: 1, wpm: 1 })];
    expect(mergeTests(existing, incoming)[0]!.wpm).toBe(100);
  });

  it('handles empty inputs', () => {
    expect(mergeTests([], [])).toEqual([]);
  });
});
