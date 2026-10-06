/**
 * Minimal hand-written IndexedDB wrapper (no dependency).
 * Object stores follow docs/02: tests, aggregates, lessons, challenges, ghosts.
 */

export const DB_NAME = 'gotyping';
export const DB_VERSION = 1;

export const STORES = {
  tests: 'tests',
  aggregates: 'aggregates',
  lessons: 'lessons',
  challenges: 'challenges',
  ghosts: 'ghosts',
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORES.tests)) {
        const s = db.createObjectStore(STORES.tests, { keyPath: 'id' });
        s.createIndex('ts', 'ts');
        s.createIndex('lang', 'lang');
        s.createIndex('mode', 'mode');
      }
      if (!db.objectStoreNames.contains(STORES.aggregates)) {
        db.createObjectStore(STORES.aggregates);
      }
      if (!db.objectStoreNames.contains(STORES.lessons)) {
        db.createObjectStore(STORES.lessons, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.challenges)) {
        db.createObjectStore(STORES.challenges, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.ghosts)) {
        db.createObjectStore(STORES.ghosts, { keyPath: 'id' });
      }
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return dbPromise;
}

async function tx<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: T;
    Promise.resolve(fn(s)).then(
      (r) => {
        result = r;
      },
      (e: unknown) => reject(e),
    );
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export const idb = {
  async get<T>(store: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return tx(store, 'readonly', (s) => req<T | undefined>(s.get(key) as IDBRequest<T | undefined>));
  },
  async put<T>(store: StoreName, value: T, key?: IDBValidKey): Promise<void> {
    await tx(store, 'readwrite', (s) => {
      if (key !== undefined) s.put(value as unknown as object, key);
      else s.put(value as unknown as object);
    });
  },
  async all<T>(store: StoreName): Promise<T[]> {
    return tx(store, 'readonly', (s) => req<T[]>(s.getAll() as IDBRequest<T[]>));
  },
  async delete(store: StoreName, key: IDBValidKey): Promise<void> {
    await tx(store, 'readwrite', (s) => {
      s.delete(key);
    });
  },
  async clear(store: StoreName): Promise<void> {
    await tx(store, 'readwrite', (s) => {
      s.clear();
    });
  },
  async count(store: StoreName): Promise<number> {
    return tx(store, 'readonly', (s) => req<number>(s.count()));
  },
  /** Oldest-first keys, used to enforce the history cap. */
  async oldestIds(store: StoreName, limit: number): Promise<IDBValidKey[]> {
    return tx(store, 'readonly', async (s) => {
      const index = s.indexNames.contains('ts') ? s.index('ts') : null;
      const source: IDBObjectStore | IDBIndex = index ?? s;
      const keys = await req<IDBValidKey[]>(source.getAllKeys(undefined, limit));
      return keys;
    });
  },
  available(): boolean {
    return typeof indexedDB !== 'undefined';
  },
};
