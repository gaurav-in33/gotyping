import { useEffect, useMemo, useState } from 'preact/hooks';
import { historyRepo, filterTests, type HistoryFilter } from '../../store/history';
import { idb, STORES } from '../../store/db';
import { emptyAggregates, cellErrorRate, cellMean, type Aggregates, type TestRecord } from '../../store/types';
import {
  activityDays,
  computeOverview,
  recordsByGroup,
  topErrorPairs,
} from '../../store/stats';
import { LineChart } from '../../ui/components/Chart';
import { KeyboardDiagram } from '../../ui/components/KeyboardDiagram';
import { QWERTY, type KeyCap } from '../../core/layouts/qwerty';
import { FINGER_LABEL, type Finger } from '../../core/layouts/fingers';
import './stats.css';

const TABS = ['Overview', 'Progress', 'Keys', 'Fingers', 'Errors', 'Activity', 'Records', 'History'] as const;
type Tab = (typeof TABS)[number];

function errorColor(rate: number): string {
  // 0 -> panel/neutral, 1 -> strong red.
  const r = Math.min(1, rate);
  return `color-mix(in srgb, var(--bad, #c0392b) ${Math.round(r * 90)}%, var(--panel))`;
}

function keyCell(cap: KeyCap, agg: Aggregates): { count: number; errors: number; sum: number } {
  const a = agg.keys[cap.normal];
  const b = cap.shift && cap.shift !== cap.normal ? agg.keys[cap.shift] : undefined;
  const count = (a?.count ?? 0) + (b?.count ?? 0);
  const errors = (a?.errors ?? 0) + (b?.errors ?? 0);
  const sum = (a?.sum ?? 0) + (b?.sum ?? 0);
  return { count, errors, sum };
}

export default function StatsScreen() {
  const [tab, setTab] = useState<Tab>('Overview');
  const [tests, setTests] = useState<TestRecord[] | null>(null);
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [filter, setFilter] = useState<HistoryFilter>({});

  useEffect(() => {
    let alive = true;
    void Promise.all([
      historyRepo.all(),
      idb.available() ? idb.get<Aggregates>(STORES.aggregates, 'global') : Promise.resolve(undefined),
    ]).then(([t, a]) => {
      if (!alive) return;
      setTests(t);
      setAgg(a ?? emptyAggregates());
    });
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => (tests ? filterTests(tests, filter) : []), [tests, filter]);
  const overview = useMemo(
    () => computeOverview(filtered, agg?.days ?? {}),
    [filtered, agg],
  );

  if (!tests || !agg) return <p class="loading">Loading stats…</p>;

  const langs = [...new Set(tests.map((t) => t.lang))];
  const modes = [...new Set(tests.map((t) => t.mode))];
  const durations = [...new Set(tests.map((t) => t.duration))].sort((a, b) => a - b);

  if (tests.length === 0) {
    return (
      <div class="stats">
        <div class="page-head">
          <h1>Stats</h1>
          <p>No tests yet — finish a Type test, a Learn lesson or a Practice drill to see stats here.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="stats">
      <div class="page-head">
        <h1>Stats</h1>
        <p>{tests.length} test(s) recorded on this device.</p>
      </div>

      <nav class="stats__tabs" aria-label="Stats sections">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            class="stats__tab"
            aria-current={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      <div class="stats__filters">
        <select
          class="btn btn--sm"
          aria-label="Filter by language"
          value={filter.lang ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setFilter((f) => ({ ...f, lang: v ? (v as HistoryFilter['lang']) : undefined }));
          }}
        >
          <option value="">All languages</option>
          {langs.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          class="btn btn--sm"
          aria-label="Filter by mode"
          value={filter.mode ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setFilter((f) => ({ ...f, mode: v || undefined }));
          }}
        >
          <option value="">All modes</option>
          {modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          class="btn btn--sm"
          aria-label="Filter by duration"
          value={filter.duration ?? ''}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            setFilter((f) => ({ ...f, duration: v ? Number(v) : undefined }));
          }}
        >
          <option value="">Any duration</option>
          {durations.map((d) => (
            <option key={d} value={d}>
              {d > 0 ? `${d}s` : 'untimed'}
            </option>
          ))}
        </select>
        {(filter.lang || filter.mode || filter.duration !== undefined) && (
          <button class="btn btn--ghost btn--sm" type="button" onClick={() => setFilter({})}>
            Clear filters
          </button>
        )}
      </div>

      {tab === 'Overview' && (
        <dl class="stats__cards">
          <div class="stats__card panel">
            <dt>Tests (filtered)</dt>
            <dd>{overview.count}</dd>
          </div>
          <div class="stats__card panel">
            <dt>Avg WPM</dt>
            <dd>{overview.avgWpm}</dd>
          </div>
          <div class="stats__card panel">
            <dt>Avg accuracy</dt>
            <dd>{overview.avgAccuracy}%</dd>
          </div>
          <div class="stats__card panel">
            <dt>Best WPM</dt>
            <dd>{overview.bestWpm}</dd>
          </div>
          <div class="stats__card panel">
            <dt>Time typed</dt>
            <dd>{Math.round(overview.totalTimeMs / 60000)}m</dd>
          </div>
          <div class="stats__card panel">
            <dt>Day streak</dt>
            <dd>{overview.streakDays}</dd>
          </div>
        </dl>
      )}

      {tab === 'Progress' && (
        <LineChart
          ariaLabel="WPM over your recent tests"
          xLabel="tests (oldest to newest)"
          series={[
            {
              points: filtered.slice(-60).map((t) => t.wpm),
              color: 'var(--chart1)',
              label: 'wpm',
            },
            {
              points: filtered.slice(-60).map((t) => t.accuracy),
              color: 'var(--chart2, var(--accent))',
              label: 'accuracy',
              dashed: true,
            },
          ]}
        />
      )}

      {tab === 'Keys' && (
        <>
          <p class="hint">Darker = higher error rate. Hover a key for the exact numbers.</p>
          <KeyboardDiagram
            layout={QWERTY}
            ariaLabel="Key error-rate heatmap"
            colorFor={(k) => {
              const c = keyCell(k, agg);
              return c.count > 0 ? errorColor(cellErrorRate({ ...c, sumSq: 0 })) : undefined;
            }}
            subLabelFor={(k) => {
              const c = keyCell(k, agg);
              return c.count > 0 ? `${Math.round(cellErrorRate({ ...c, sumSq: 0 }) * 100)}%` : undefined;
            }}
          />
        </>
      )}

      {tab === 'Fingers' && (
        <div class="error-list">
          {(Object.keys(FINGER_LABEL) as Finger[]).map((f) => {
            const cell = agg.fingers[f];
            const rate = cell ? cellErrorRate(cell) : 0;
            const mean = cell ? cellMean(cell) : 0;
            return (
              <div class="error-row" key={f}>
                <span style={{ width: '110px' }}>{FINGER_LABEL[f]}</span>
                <span class="error-row__bar" style={{ width: `${Math.round(rate * 200)}px` }} />
                <span class="hint">
                  {cell ? `${Math.round(rate * 100)}% err · ${Math.round(mean)}ms avg` : 'no data'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'Errors' && (
        <div class="error-list">
          {topErrorPairs(agg.errorPairs, 15).map((e) => (
            <div class="error-row" key={e.pair}>
              <span>
                {e.expected || '·'} → {e.typed || '·'}
              </span>
              <span class="error-row__bar" style={{ width: `${Math.min(200, e.count * 4)}px` }} />
              <span class="hint">{e.count}×</span>
            </div>
          ))}
          {Object.keys(agg.errorPairs).length === 0 ? <p class="hint">No mistakes recorded yet.</p> : null}
        </div>
      )}

      {tab === 'Activity' && (
        <div class="calendar" role="img" aria-label="Typing activity calendar">
          {activityDays(agg.days, 14).map((d) => (
            <div
              key={d.date}
              class="calendar__cell"
              title={`${d.date}: ${d.tests} test(s)`}
              style={{
                background:
                  d.tests > 0
                    ? `color-mix(in srgb, var(--accent) ${Math.min(100, d.tests * 25)}%, var(--border))`
                    : undefined,
              }}
            />
          ))}
        </div>
      )}

      {tab === 'Records' && (
        <table class="stats-table">
          <thead>
            <tr>
              <th>Mode</th>
              <th>WPM</th>
              <th>Accuracy</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recordsByGroup(tests).map((r) => (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td>{r.best.wpm}</td>
                <td>{r.best.accuracy}%</td>
                <td>{new Date(r.best.ts).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'History' && (
        <table class="stats-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Lang</th>
              <th>Mode</th>
              <th>WPM</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice()
              .sort((a, b) => b.ts - a.ts)
              .slice(0, 200)
              .map((t) => (
                <tr key={t.id}>
                  <td>{new Date(t.ts).toLocaleString()}</td>
                  <td>{t.lang}</td>
                  <td>
                    {t.mode}
                    {t.lessonId ? ` (${t.lessonId})` : ''}
                  </td>
                  <td>{t.wpm}</td>
                  <td>{t.accuracy}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
