/** Preact binding for the settings store. */
import { useCallback, useEffect, useState } from 'preact/hooks';
import { settingsStore, type Settings } from '../store/settings';
import { applyDisplaySettings, applyTheme, resolveTheme } from './theme/theme';

export type UpdateFn = (fn: (draft: Settings) => void) => void;

export function useSettings(): [Settings, UpdateFn] {
  const [value, setValue] = useState<Settings>(settingsStore.get());

  useEffect(() => settingsStore.subscribe(setValue), []);

  const update = useCallback<UpdateFn>((fn) => {
    settingsStore.update(fn);
  }, []);

  return [value, update];
}

/** Applies theme + display settings to the document; mounted once by App. */
export function useAppliedSettings(settings: Settings): void {
  useEffect(() => {
    applyTheme(resolveTheme(settings));
    applyDisplaySettings(settings);
  }, [settings]);

  // Follow the OS when appearance is "system".
  useEffect(() => {
    if (settings.theme.appearance !== 'system') return;
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = (): void => applyTheme(resolveTheme(settingsStore.get()));
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [settings.theme.appearance]);

  // Respect the OS reduced-motion preference as a floor.
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && !settings.motion.reducedMotion) {
      settingsStore.update((d) => {
        d.motion.reducedMotion = true;
      });
    }
    // Only on mount: after this the user owns the setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
