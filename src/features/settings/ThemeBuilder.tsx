import { useMemo, useState } from 'preact/hooks';
import { contrastWarnings, THEMES, type Theme } from '../../ui/theme/theme';
import { TOKEN_NAMES } from '../../ui/theme/theme';
import type { CustomTheme, Settings } from '../../store/settings';

function uid(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Group related tokens so the builder reads like a form, not a token dump. */
const GROUPS: Array<{ label: string; tokens: string[] }> = [
  { label: 'Surfaces', tokens: ['bg', 'panel', 'border'] },
  { label: 'Text', tokens: ['text', 'muted', 'onAccent'] },
  { label: 'Typing', tokens: ['typed', 'untyped', 'error', 'caret'] },
  { label: 'Accent', tokens: ['accent'] },
];

function knownGroupTokens(): Set<string> {
  return new Set(GROUPS.flatMap((g) => g.tokens));
}

/**
 * Custom theme builder (docs/01 Settings > Themes). Clones a preset, lets the
 * user tweak each color token with a live preview and WCAG contrast
 * warnings, then saves it into settings.theme.customThemes — reusing
 * ui/theme/theme.ts's existing contrast + apply machinery rather than
 * re-implementing color math here.
 */
export function ThemeBuilder({
  settings,
  onSave,
  onDelete,
}: {
  settings: Settings;
  onSave: (theme: CustomTheme) => void;
  onDelete: (id: string) => void;
}) {
  const [baseId, setBaseId] = useState(THEMES[0]!.id);
  const base = THEMES.find((t) => t.id === baseId) ?? THEMES[0]!;
  const [name, setName] = useState('My theme');
  const [mode, setMode] = useState<'light' | 'dark'>(base.mode);
  const [tokens, setTokens] = useState<Record<string, string>>({ ...base.tokens });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadBase = (t: Theme): void => {
    setBaseId(t.id);
    setMode(t.mode);
    setTokens({ ...t.tokens });
  };

  const loadCustom = (t: CustomTheme): void => {
    setEditingId(t.id);
    setName(t.name);
    setMode(t.mode);
    setTokens({ ...t.tokens });
  };

  const warnings = useMemo(() => contrastWarnings(tokens), [tokens]);
  const otherTokens = useMemo(
    () => TOKEN_NAMES.filter((n) => !knownGroupTokens().has(n)),
    [],
  );

  const save = (): void => {
    const theme: CustomTheme = {
      id: editingId ?? uid(),
      name: name.trim() || 'Untitled theme',
      mode,
      tokens,
    };
    onSave(theme);
    setEditingId(theme.id);
  };

  return (
    <div class="theme-builder">
      <div class="field">
        <div class="field__text">
          <span class="field__label">Start from</span>
          <span class="field__hint">Clones a preset's colors as a starting point</span>
        </div>
        <div class="field__control">
          <select
            class="btn btn--sm"
            value={baseId}
            onChange={(e) => {
              const t = THEMES.find((x) => x.id === (e.target as HTMLSelectElement).value);
              if (t) loadBase(t);
            }}
          >
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.mode})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div class="field">
        <div class="field__text">
          <span class="field__label">Name</span>
        </div>
        <div class="field__control">
          <input
            class="btn btn--sm"
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            maxLength={40}
          />
          <div class="segmented" role="radiogroup" aria-label="Mode">
            {(['light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {GROUPS.map((g) => (
        <div class="theme-builder__group" key={g.label}>
          <span class="settings__title">{g.label}</span>
          <div class="theme-builder__swatches">
            {g.tokens.map((tok) => (
              <label class="theme-builder__swatch" key={tok}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(tokens[tok] ?? '') ? tokens[tok] : '#000000'}
                  onInput={(e) =>
                    setTokens((t) => ({ ...t, [tok]: (e.target as HTMLInputElement).value }))
                  }
                />
                {tok}
              </label>
            ))}
          </div>
        </div>
      ))}

      {otherTokens.length > 0 ? (
        <div class="theme-builder__group">
          <span class="settings__title">Other tokens</span>
          <div class="theme-builder__swatches">
            {otherTokens.map((tok) => (
              <label class="theme-builder__swatch" key={tok}>
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(tokens[tok] ?? '') ? tokens[tok] : '#000000'}
                  onInput={(e) =>
                    setTokens((t) => ({ ...t, [tok]: (e.target as HTMLInputElement).value }))
                  }
                />
                {tok}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div
        class="theme-builder__preview"
        style={{ background: tokens['bg'], color: tokens['text'], border: `1px solid ${tokens['border']}` }}
      >
        <span style={{ color: tokens['typed'] }}>The quick </span>
        <span style={{ color: tokens['untyped'] }}>brown fox </span>
        <span style={{ color: tokens['error'] }}>jvmps</span>
        <button
          type="button"
          class="btn btn--sm"
          style={{ background: tokens['accent'], color: tokens['onAccent'], marginLeft: '8px' }}
        >
          Accent
        </button>
      </div>

      {warnings.length > 0 ? (
        <div class="theme-builder__warnings" role="alert">
          <strong>Low contrast (WCAG AA):</strong>
          <ul>
            {warnings.map((w) => (
              <li key={w.pair}>
                {w.pair}: {w.ratio}:1 (needs 4.5:1)
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p class="hint">Passes WCAG AA contrast on every checked pair.</p>
      )}

      <div class="theme-builder__actions">
        <button type="button" class="btn btn--sm btn--primary" onClick={save}>
          {editingId ? 'Save changes' : 'Save as new theme'}
        </button>
        {editingId ? (
          <button
            type="button"
            class="btn btn--sm"
            onClick={() => {
              setEditingId(null);
              setName('My theme');
            }}
          >
            Save as copy instead
          </button>
        ) : null}
      </div>

      {settings.theme.customThemes.length > 0 ? (
        <div class="theme-builder__list">
          <span class="settings__title">Your themes</span>
          <div class="theme-grid">
            {settings.theme.customThemes.map((t) => (
              <div class="theme-swatch" key={t.id}>
                <span class="theme-swatch__dots">
                  <span style={{ background: t.tokens['bg'] }} />
                  <span style={{ background: t.tokens['accent'] }} />
                  <span style={{ background: t.tokens['text'] }} />
                </span>
                <span style={{ flex: 1 }}>{t.name}</span>
                <button type="button" class="btn btn--sm" onClick={() => loadCustom(t)}>
                  Edit
                </button>
                <button type="button" class="btn btn--sm" onClick={() => onDelete(t.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
