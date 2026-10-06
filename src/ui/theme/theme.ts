/**
 * Theme tokens -> CSS custom properties.
 * Themes are plain data (src/content/themes.json) so the Step 3 custom theme
 * builder can clone and edit them without touching code.
 */
import themesData from '../../content/themes.json';
import type { AppearanceMode, Settings } from '../../store/settings';

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  tokens: Record<string, string>;
}

export const TOKEN_NAMES: readonly string[] = themesData.tokens as string[];

const rawThemes = themesData.themes as Record<string, Record<string, string>>;

export const THEMES: Theme[] = Object.entries(rawThemes).map(([id, t]) => {
  const tokens: Record<string, string> = {};
  for (const name of TOKEN_NAMES) {
    const v = t[name];
    if (typeof v === 'string') tokens[name] = v;
  }
  return {
    id,
    name: String(t['name'] ?? id),
    mode: t['mode'] === 'dark' ? 'dark' : 'light',
    tokens,
  };
});

export const THEMES_BY_ID: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
);

export function prefersDark(): boolean {
  if (typeof matchMedia === 'undefined') return false;
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve which preset to show for the current appearance setting. */
export function resolveTheme(settings: Settings): Theme {
  const { appearance, lightTheme, darkTheme } = settings.theme;
  const pick = (id: string, fallback: string): Theme =>
    THEMES_BY_ID[id] ?? THEMES_BY_ID[fallback] ?? THEMES[0]!;

  let mode: AppearanceMode = appearance;
  if (mode === 'system') mode = prefersDark() ? 'dark' : 'light';

  if (settings.a11y.highContrast || mode === 'contrast') {
    const wantDark = appearance === 'dark' || (appearance === 'system' && prefersDark());
    return pick(wantDark ? 'hc-dark' : 'hc-light', 'paper');
  }
  return mode === 'dark' ? pick(darkTheme, 'graphite') : pick(lightTheme, 'paper');
}

/** Write tokens onto :root. Called once per theme change, never per keystroke. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const [name, value] of Object.entries(theme.tokens)) {
    root.style.setProperty(`--${name}`, value);
  }
  root.dataset['themeMode'] = theme.mode;
  root.dataset['theme'] = theme.id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.tokens['bg'] ?? '#ffffff');
}

const WIDTHS: Record<string, string> = {
  narrow: '44rem',
  medium: '58rem',
  wide: '72rem',
  full: '100%',
};

const FONTS: Record<string, string> = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
};

const DEVANAGARI_STACK =
  '"Noto Sans Devanagari", "Nirmala UI", Mangal, "Kohinoor Devanagari", sans-serif';

const DENSITY: Record<string, string> = {
  compact: '0.8',
  comfortable: '1',
  spacious: '1.25',
};

/**
 * Apply the display/accessibility settings that are expressed as CSS
 * variables. Done once per settings change — never in the typing hot path.
 */
export function applyDisplaySettings(s: Settings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const d = s.display;

  root.style.setProperty(
    '--typing-font',
    `${FONTS[d.font] ?? FONTS['mono']!}, ${DEVANAGARI_STACK}`,
  );
  root.style.setProperty('--typing-size', `${d.fontSize}px`);
  root.style.setProperty('--typing-line-height', String(d.lineHeight));
  root.style.setProperty('--typing-letter-spacing', `${d.letterSpacing}px`);
  root.style.setProperty('--typing-weight', String(d.textWeight));
  root.style.setProperty('--content-width', WIDTHS[d.textWidth] ?? WIDTHS['medium']!);
  root.style.setProperty('--density', DENSITY[d.density] ?? '1');
  root.style.setProperty('--root-scale', s.a11y.largerText ? '1.15' : '1');

  const reduce = s.motion.reducedMotion || !s.motion.animations;
  root.dataset['reducedMotion'] = reduce ? 'true' : 'false';
  root.dataset['focusVisible'] = s.a11y.focusVisible ? 'true' : 'false';
  root.style.setProperty('--motion-fast', reduce ? '0ms' : '120ms');
  root.style.setProperty('--motion-base', reduce ? '0ms' : '180ms');
}

/** WCAG relative luminance, used by the Step 3 contrast warnings. */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const n = parseInt(m[1]!, 16);
  const srgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0]! + 0.7152 * srgb[1]! + 0.0722 * srgb[2]!;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}
