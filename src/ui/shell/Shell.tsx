import type { ComponentChildren } from 'preact';
import { getSections, useRoute } from '../../router';
import { Wordmark } from './Wordmark';
import { useSettings } from '../useSettings';
import { THEMES_BY_ID, resolveTheme } from '../theme/theme';

function Nav({ className, primaryOnly }: { className: string; primaryOnly: boolean }) {
  const path = useRoute();
  const items = getSections().filter((s) => (primaryOnly ? s.primary : true));
  return (
    <nav class={className} aria-label={primaryOnly ? 'Primary' : 'Sections'}>
      {items.map((s) => {
        const active = path === s.path || path.startsWith(s.path + '/');
        return (
          <a
            key={s.id}
            class="navlink"
            href={s.path}
            aria-current={active ? 'page' : undefined}
          >
            {s.label}
          </a>
        );
      })}
    </nav>
  );
}

/** Light/dark quick toggle. Respects the user's chosen presets. */
function ThemeToggle() {
  const [settings, update] = useSettings();
  const theme = resolveTheme(settings);
  const isDark = theme.mode === 'dark';
  const next = isDark ? 'light' : 'dark';
  const targetName = THEMES_BY_ID[isDark ? settings.theme.lightTheme : settings.theme.darkTheme]?.name;

  return (
    <button
      class="icon-btn"
      type="button"
      title={`Switch to ${next} (${targetName ?? next})`}
      aria-label={`Switch to ${next} appearance`}
      onClick={() =>
        update((d) => {
          d.theme.appearance = next;
        })
      }
    >
      {isDark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" stroke-width="1.8" />
          <path
            d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2Z"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

export function Shell({
  children,
  typing,
}: {
  children: ComponentChildren;
  typing: boolean;
}) {
  return (
    <div class="app" data-typing={typing ? 'true' : 'false'}>
      <a class="skip-link" href="#main">
        Skip to content
      </a>
      <header class="topbar">
        <Wordmark />
        <Nav className="topbar__nav" primaryOnly={false} />
        <div class="topbar__right">
          <ThemeToggle />
        </div>
      </header>
      <main id="main" class="page" tabIndex={-1}>
        {children}
      </main>
      <Nav className="bottombar" primaryOnly />
    </div>
  );
}
