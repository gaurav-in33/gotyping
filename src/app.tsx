import { useEffect, useState } from 'preact/hooks';
import type { ComponentType } from 'preact';
import { Shell } from './ui/shell/Shell';
import {
  linkHandler,
  matchSection,
  navigate,
  registerSection,
  useRoute,
  type Section,
} from './router';
import { useAppliedSettings, useSettings } from './ui/useSettings';

/**
 * Section registry. Only built sections are registered, so the navigation can
 * never show a dead link or a placeholder screen (AGENT.md).
 * Step 2 adds Learn / Practice / Stats; Step 3 adds Tools / Challenges.
 */
registerSection({
  id: 'type',
  path: '/',
  label: 'Type',
  primary: true,
  load: () => import('./features/type/TypeScreen'),
});

registerSection({
  id: 'settings',
  path: '/settings',
  label: 'Settings',
  primary: true,
  load: () => import('./features/settings/SettingsScreen'),
});

/**
 * Route-level code splitting without preact/compat's Suspense.
 *
 * Suspense is deliberately avoided: when a lazy child suspends on the first
 * render, Preact discards the *ancestor's* pending effects, which silently
 * stopped App's theme/display settings from ever being applied, and left a
 * stale screen mounted when navigating to a not-yet-loaded chunk.
 * An explicit loader keeps the control flow obvious and gives us a real error
 * state instead of a view that hangs forever.
 */
const chunkCache = new Map<string, ComponentType>();

interface ScreenState {
  Screen: ComponentType | null;
  loading: boolean;
  failed: boolean;
}

function useScreen(section: Section | null): ScreenState {
  const id = section?.id ?? null;
  const [state, setState] = useState<ScreenState>(() => ({
    Screen: id ? (chunkCache.get(id) ?? null) : null,
    loading: id !== null && !chunkCache.has(id),
    failed: false,
  }));

  useEffect(() => {
    if (!section) {
      setState({ Screen: null, loading: false, failed: false });
      return;
    }
    const cached = chunkCache.get(section.id);
    if (cached) {
      setState({ Screen: cached, loading: false, failed: false });
      return;
    }
    let alive = true;
    setState({ Screen: null, loading: true, failed: false });
    section
      .load()
      .then((mod) => {
        if (!alive) return;
        chunkCache.set(section.id, mod.default);
        setState({ Screen: mod.default, loading: false, failed: false });
      })
      .catch(() => {
        if (!alive) return;
        setState({ Screen: null, loading: false, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [section, id]);

  return state;
}

function NotFound() {
  return (
    <div class="empty-state">
      <h1 style="font-size:1.2rem;margin-bottom:.5rem">Page not found</h1>
      <p style="margin-bottom:1rem">That address does not exist in GoTyping.</p>
      <button class="btn" type="button" onClick={() => navigate('/')}>
        Go to Type
      </button>
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div class="empty-state">
      <h1 style="font-size:1.2rem;margin-bottom:.5rem">That section could not load</h1>
      <p style="margin-bottom:1rem">
        The page may have updated since you opened it. Reloading usually fixes it.
      </p>
      <button class="btn" type="button" onClick={onRetry}>
        Reload
      </button>
    </div>
  );
}

export function App() {
  const [settings] = useSettings();
  const path = useRoute();
  const [typing, setTyping] = useState(false);
  useAppliedSettings(settings);

  // Client-side navigation for every internal link.
  useEffect(() => {
    document.addEventListener('click', linkHandler);
    return () => document.removeEventListener('click', linkHandler);
  }, []);

  // Chrome dims while the user is actually typing.
  useEffect(() => {
    const on = (): void => setTyping(true);
    const off = (): void => setTyping(false);
    window.addEventListener('gotyping:typing', on);
    window.addEventListener('gotyping:idle', off);
    return () => {
      window.removeEventListener('gotyping:typing', on);
      window.removeEventListener('gotyping:idle', off);
    };
  }, []);

  // Move focus to the main region on route change (screen-reader friendly).
  useEffect(() => {
    document.getElementById('main')?.focus();
  }, [path]);

  const section = matchSection(path);
  const { Screen, loading, failed } = useScreen(section);

  let body: preact.ComponentChildren;
  if (!section) body = <NotFound />;
  else if (failed) body = <LoadFailed onRetry={() => location.reload()} />;
  else if (Screen) body = <Screen />;
  else if (loading) body = <p class="loading">Loading…</p>;
  else body = <p class="loading">Loading…</p>;

  return <Shell typing={typing && settings.display.focusMode}>{body}</Shell>;
}
