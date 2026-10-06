/**
 * Dev-only: write fake history into IndexedDB for manually verifying Stats
 * with empty / small / large (~5,000 test) histories (docs/07). Never
 * imported by production UI code paths — see src/dev/devTools.ts, which is
 * only loaded when `import.meta.env.DEV` is true.
 */
import { idb, STORES } from '../store/db';
import { generateFakeHistory } from './fakeHistory';
import { emptyAggregates, type Aggregates } from '../store/types';

export async function seedFakeHistory(count = 200, seed: number | string = 'dev-seed'): Promise<void> {
  if (!idb.available()) {
    // eslint-disable-next-line no-console
    console.warn('IndexedDB unavailable — cannot seed fake history.');
    return;
  }
  const { tests, aggregates } = generateFakeHistory({ count, seed });
  for (const t of tests) await idb.put(STORES.tests, t);
  const stored = (await idb.get<Aggregates>(STORES.aggregates, 'global')) ?? emptyAggregates();
  for (const [k, c] of Object.entries(aggregates.keys)) {
    const cur = stored.keys[k] ?? { count: 0, errors: 0, sum: 0, sumSq: 0 };
    stored.keys[k] = {
      count: cur.count + c.count,
      errors: cur.errors + c.errors,
      sum: cur.sum + c.sum,
      sumSq: cur.sumSq + c.sumSq,
    };
  }
  for (const [k, c] of Object.entries(aggregates.words)) {
    const cur = stored.words[k] ?? { count: 0, errors: 0, sum: 0, sumSq: 0 };
    stored.words[k] = {
      count: cur.count + c.count,
      errors: cur.errors + c.errors,
      sum: cur.sum + c.sum,
      sumSq: cur.sumSq + c.sumSq,
    };
  }
  for (const [k, d] of Object.entries(aggregates.days)) {
    const cur = stored.days[k] ?? { tests: 0, timeMs: 0, keystrokes: 0, wpmSum: 0 };
    stored.days[k] = {
      tests: cur.tests + d.tests,
      timeMs: cur.timeMs + d.timeMs,
      keystrokes: cur.keystrokes + d.keystrokes,
      wpmSum: cur.wpmSum + d.wpmSum,
    };
  }
  await idb.put(STORES.aggregates, stored, 'global');
  // eslint-disable-next-line no-console
  console.info(`Seeded ${tests.length} fake tests. Reload the Stats page to see them.`);
}

export async function clearSeededHistory(): Promise<void> {
  if (!idb.available()) return;
  const all = await idb.all<{ id: string }>(STORES.tests);
  for (const t of all) {
    if (t.id.startsWith('fake-')) await idb.delete(STORES.tests, t.id);
  }
}
