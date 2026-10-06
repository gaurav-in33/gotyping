import { useState } from 'preact/hooks';
import { LANGUAGES } from '../../content';
import type { LanguageId, Settings } from '../../store/settings';
import type { UpdateFn } from '../../ui/useSettings';

export type TestMode = 'time' | 'words' | 'quote' | 'custom' | 'zen';
export type TextStyleId = 'words' | 'paragraph' | 'sentence' | 'numbers' | 'punctuation' | 'mixed';

export interface TestConfig {
  mode: TestMode;
  seconds: number;
  wordCount: number;
  style: TextStyleId;
  custom: string;
}

export const TIME_PRESETS = [15, 30, 60, 120];
export const WORD_PRESETS = [10, 25, 50, 100];

const MODES: Array<{ id: TestMode; label: string }> = [
  { id: 'time', label: 'Time' },
  { id: 'words', label: 'Words' },
  { id: 'quote', label: 'Quote' },
  { id: 'custom', label: 'Custom' },
  { id: 'zen', label: 'Zen' },
];

const STYLES: Array<{ id: TextStyleId; label: string }> = [
  { id: 'words', label: 'Words' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'sentence', label: 'Sentence' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'punctuation', label: 'Punctuation' },
  { id: 'mixed', label: 'Mixed' },
];

function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function summarize(c: TestConfig, lang: LanguageId, s: Settings): string {
  const langLabel = LANGUAGES.find((l) => l.id === lang)?.label ?? lang;
  const parts: string[] = [c.mode];
  if (c.mode === 'time') parts.push(`${c.seconds}s`);
  if (c.mode === 'words') parts.push(`${c.wordCount}`);
  parts.push(langLabel);
  if (c.mode === 'time' || c.mode === 'words') parts.push(c.style);
  if (s.typing.punctuation) parts.push('punctuation');
  if (s.typing.numbers) parts.push('numbers');
  if (s.typing.stopOnError) parts.push('stop on error');
  return parts.join(' · ');
}

export interface ConfigBarProps {
  config: TestConfig;
  onConfig: (next: TestConfig) => void;
  settings: Settings;
  updateSettings: UpdateFn;
  hidden: boolean;
}

export function ConfigBar({
  config,
  onConfig,
  settings,
  updateSettings,
  hidden,
}: ConfigBarProps) {
  const [open, setOpen] = useState(false);
  const lang = settings.language.current;
  const set = (patch: Partial<TestConfig>): void => onConfig({ ...config, ...patch });

  return (
    <div class="config" data-hidden={hidden ? 'true' : 'false'}>
      <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
        <button
          type="button"
          class="config__pill"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span>{summarize(config, lang, settings)}</span>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        </button>

        {open ? (
          <div class="panel config__panel">
            <div class="config__group">
              <span class="config__label">Mode</span>
              <Seg
                label="Mode"
                options={MODES}
                value={config.mode}
                onChange={(mode) => set({ mode })}
              />
            </div>

            {config.mode === 'time' ? (
              <div class="config__group">
                <span class="config__label">Seconds</span>
                <Seg
                  label="Duration"
                  options={TIME_PRESETS.map((n) => ({ id: n, label: String(n) }))}
                  value={config.seconds}
                  onChange={(seconds) => set({ seconds })}
                />
                <input
                  type="number"
                  class="btn btn--sm"
                  min={5}
                  max={600}
                  value={config.seconds}
                  aria-label="Custom duration in seconds (5 to 600)"
                  style={{ width: '5.5rem' }}
                  onChange={(e) => {
                    const n = Number((e.target as HTMLInputElement).value);
                    if (Number.isFinite(n)) set({ seconds: Math.min(600, Math.max(5, n)) });
                  }}
                />
              </div>
            ) : null}

            {config.mode === 'words' ? (
              <div class="config__group">
                <span class="config__label">Words</span>
                <Seg
                  label="Word count"
                  options={WORD_PRESETS.map((n) => ({ id: n, label: String(n) }))}
                  value={config.wordCount}
                  onChange={(wordCount) => set({ wordCount })}
                />
                <input
                  type="number"
                  class="btn btn--sm"
                  min={5}
                  max={500}
                  value={config.wordCount}
                  aria-label="Custom word count (5 to 500)"
                  style={{ width: '5.5rem' }}
                  onChange={(e) => {
                    const n = Number((e.target as HTMLInputElement).value);
                    if (Number.isFinite(n)) set({ wordCount: Math.min(500, Math.max(5, n)) });
                  }}
                />
              </div>
            ) : null}

            {config.mode === 'time' || config.mode === 'words' ? (
              <div class="config__group">
                <span class="config__label">Text</span>
                <Seg
                  label="Text style"
                  options={STYLES}
                  value={config.style}
                  onChange={(style) => set({ style })}
                />
              </div>
            ) : null}

            {config.mode === 'custom' ? (
              <div class="config__group" style={{ alignItems: 'flex-start' }}>
                <span class="config__label">Your text</span>
                <textarea
                  class="panel"
                  rows={4}
                  style={{ flex: 1, minWidth: '16rem', fontFamily: 'inherit' }}
                  placeholder="Paste or type the text you want to practise…"
                  value={config.custom}
                  aria-label="Custom text"
                  onInput={(e) => set({ custom: (e.target as HTMLTextAreaElement).value })}
                />
              </div>
            ) : null}

            <div class="config__group">
              <span class="config__label">Language</span>
              <Seg
                label="Language"
                options={LANGUAGES.map((l) => ({ id: l.id, label: l.label }))}
                value={lang}
                onChange={(id) =>
                  updateSettings((d) => {
                    d.language.current = id;
                  })
                }
              />
            </div>

            <div class="config__group">
              <span class="config__label">Options</span>
              <Seg
                label="Punctuation"
                options={[
                  { id: 'off', label: 'No punctuation' },
                  { id: 'on', label: 'Punctuation' },
                ]}
                value={settings.typing.punctuation ? 'on' : 'off'}
                onChange={(v) =>
                  updateSettings((d) => {
                    d.typing.punctuation = v === 'on';
                  })
                }
              />
              <Seg
                label="Numbers"
                options={[
                  { id: 'off', label: 'No numbers' },
                  { id: 'on', label: 'Numbers' },
                ]}
                value={settings.typing.numbers ? 'on' : 'off'}
                onChange={(v) =>
                  updateSettings((d) => {
                    d.typing.numbers = v === 'on';
                  })
                }
              />
            </div>

            <div class="config__group">
              <span class="config__label">Behaviour</span>
              <Seg
                label="On error"
                options={[
                  { id: 'go', label: 'Keep going' },
                  { id: 'stop', label: 'Stop on error' },
                ]}
                value={settings.typing.stopOnError ? 'stop' : 'go'}
                onChange={(v) =>
                  updateSettings((d) => {
                    d.typing.stopOnError = v === 'stop';
                  })
                }
              />
              <Seg
                label="Backspace"
                options={[
                  { id: 'allow', label: 'Backspace: free' },
                  { id: 'word', label: 'Word only' },
                  { id: 'off', label: 'Off' },
                ]}
                value={settings.typing.backspace}
                onChange={(v) =>
                  updateSettings((d) => {
                    d.typing.backspace = v;
                  })
                }
              />
            </div>

            <p class="hint">
              More options live in <a href="/settings">Settings</a>.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
