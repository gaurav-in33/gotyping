/**
 * Settings: localStorage-backed, versioned, migrated.
 * The storage backend is injectable so tests run without a DOM.
 * Every option here must actually change behaviour somewhere (AGENT.md).
 */
import type { BackspaceMode } from '../core/engine/session';

export const SETTINGS_KEY = 'gotyping:settings';
export const SETTINGS_VERSION = 2;

export type AppearanceMode = 'light' | 'dark' | 'system' | 'contrast';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type TextWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type CaretStyle = 'line' | 'block' | 'underline' | 'off';
export type FontChoice = 'mono' | 'sans' | 'serif';
export type LanguageId = 'en' | 'hi' | 'hinglish';

export interface Settings {
  v: number;
  typing: {
    defaultMode: 'time' | 'words' | 'quote' | 'custom';
    defaultTime: number;
    defaultWords: number;
    punctuation: boolean;
    numbers: boolean;
    capitalization: boolean;
    stopOnError: boolean;
    backspace: BackspaceMode;
    skipWord: boolean;
    autoRestart: boolean;
    tabRestarts: boolean;
    pauseOnBlur: boolean;
  };
  display: {
    font: FontChoice;
    fontSize: number;
    textWidth: TextWidth;
    lineHeight: number;
    letterSpacing: number;
    textWeight: number;
    caretStyle: CaretStyle;
    smoothCaret: boolean;
    density: Density;
    focusMode: boolean;
    showKeyboard: boolean;
    liveStats: {
      wpm: boolean;
      accuracy: boolean;
      errors: boolean;
      timer: boolean;
      progress: boolean;
    };
  };
  motion: {
    animations: boolean;
    reducedMotion: boolean;
  };
  keyboard: {
    physicalLayout: string;
    hindiLayout: string;
    fingerGuide: boolean;
    highlightNextKey: boolean;
    showKeyLabels: boolean;
  };
  language: {
    current: LanguageId;
  };
  a11y: {
    highContrast: boolean;
    largerText: boolean;
    focusVisible: boolean;
  };
  theme: {
    appearance: AppearanceMode;
    lightTheme: string;
    darkTheme: string;
  };
  data: {
    historyCap: number;
  };
}

export const defaultSettings: Settings = {
  v: SETTINGS_VERSION,
  typing: {
    defaultMode: 'time',
    defaultTime: 30,
    defaultWords: 25,
    punctuation: false,
    numbers: false,
    capitalization: false,
    stopOnError: false,
    backspace: 'allow',
    skipWord: true,
    autoRestart: false,
    tabRestarts: false,
    pauseOnBlur: true,
  },
  display: {
    font: 'mono',
    fontSize: 28,
    textWidth: 'medium',
    lineHeight: 1.6,
    letterSpacing: 0,
    textWeight: 500,
    caretStyle: 'line',
    smoothCaret: true,
    density: 'comfortable',
    focusMode: true,
    showKeyboard: false,
    liveStats: { wpm: true, accuracy: true, errors: false, timer: true, progress: true },
  },
  motion: { animations: true, reducedMotion: false },
  keyboard: {
    physicalLayout: 'qwerty',
    hindiLayout: 'inscript',
    fingerGuide: true,
    highlightNextKey: true,
    showKeyLabels: true,
  },
  language: { current: 'en' },
  a11y: { highContrast: false, largerText: false, focusVisible: true },
  theme: { appearance: 'system', lightTheme: 'paper', darkTheme: 'graphite' },
  data: { historyCap: 5000 },
};

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Deep merge of a partial stored object onto defaults (defaults win on type mismatch). */
function mergeDefaults<T>(base: T, patch: unknown): T {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return base;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  const p = patch as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (!(key in p)) continue;
    const b = out[key];
    const v = p[key];
    if (b !== null && typeof b === 'object' && !Array.isArray(b)) {
      out[key] = mergeDefaults(b, v);
    } else if (typeof v === typeof b && v !== undefined) {
      out[key] = v;
    }
  }
  return out as T;
}

type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

/**
 * Migrations run in order for every version below SETTINGS_VERSION.
 * v1 -> v2: `display.liveStats` gained `progress`; `typing.pauseOnBlur` added.
 * (v1 shipped only internally; the migration exists to prove the path works
 * and to give Step 2+ a pattern to follow.)
 */
export const migrations: Record<number, Migration> = {
  1: (s) => {
    const display = (s['display'] as Record<string, unknown> | undefined) ?? {};
    const live = (display['liveStats'] as Record<string, unknown> | undefined) ?? {};
    if (!('progress' in live)) live['progress'] = true;
    display['liveStats'] = live;
    s['display'] = display;
    const typing = (s['typing'] as Record<string, unknown> | undefined) ?? {};
    if (!('pauseOnBlur' in typing)) typing['pauseOnBlur'] = true;
    s['typing'] = typing;
    s['v'] = 2;
    return s;
  },
};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let out = raw;
  let v = typeof out['v'] === 'number' ? (out['v'] as number) : 1;
  let guard = 0;
  while (v < SETTINGS_VERSION && guard < 20) {
    const m = migrations[v];
    if (!m) break;
    out = m(out);
    const nv = typeof out['v'] === 'number' ? (out['v'] as number) : v + 1;
    v = nv > v ? nv : v + 1;
    guard++;
  }
  out['v'] = SETTINGS_VERSION;
  return out;
}

export function parseSettings(json: string | null): Settings {
  if (!json) return structuredCloneSafe(defaultSettings);
  try {
    const raw = JSON.parse(json) as unknown;
    if (raw === null || typeof raw !== 'object') return structuredCloneSafe(defaultSettings);
    const migrated = migrate(raw as Record<string, unknown>);
    return mergeDefaults(structuredCloneSafe(defaultSettings), migrated);
  } catch {
    return structuredCloneSafe(defaultSettings);
  }
}

function structuredCloneSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

type Listener = (s: Settings) => void;

/** Observable settings store. */
export class SettingsStore {
  private value: Settings;
  private listeners = new Set<Listener>();

  constructor(private storage: StorageLike | null) {
    this.value = parseSettings(storage ? storage.getItem(SETTINGS_KEY) : null);
  }

  get(): Settings {
    return this.value;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Apply a mutation to a draft copy and persist. */
  update(fn: (draft: Settings) => void): Settings {
    const draft = structuredCloneSafe(this.value);
    fn(draft);
    draft.v = SETTINGS_VERSION;
    this.value = draft;
    this.persist();
    for (const l of this.listeners) l(draft);
    return draft;
  }

  replace(next: Settings): Settings {
    this.value = mergeDefaults(structuredCloneSafe(defaultSettings), next);
    this.persist();
    for (const l of this.listeners) l(this.value);
    return this.value;
  }

  reset(): Settings {
    return this.replace(structuredCloneSafe(defaultSettings));
  }

  private persist(): void {
    try {
      this.storage?.setItem(SETTINGS_KEY, JSON.stringify(this.value));
    } catch {
      /* quota or private mode — settings stay in memory for this session */
    }
  }
}

/** Browser singleton; tests construct their own store with a fake backend. */
export const settingsStore = new SettingsStore(
  typeof localStorage !== 'undefined' ? localStorage : null,
);
