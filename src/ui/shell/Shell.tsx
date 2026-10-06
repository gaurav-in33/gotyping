import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { getSections, useRoute } from '../../router';
import { Wordmark } from './Wordmark';
import { useSettings } from '../useSettings';
import { THEMES_BY_ID, resolveTheme } from '../theme/theme';

function isActive(path: string, sectionPath: string): boolean {
  return path === sectionPath || path.startsWith(sectionPath + '/');
}

function Nav({ className, primaryOnly }: { className: string; primaryOnly: boolean }) {
  const path = useRoute();
  const items = getSections().filter((s) => (primaryOnly ? s.primary : true));
  return (
    <nav class={className} aria-label={primaryOnly ? 'Primary' : 'Sections'}>
      {items.map((s) => (
        <a
          key={s.id}
          class="navlink"
          href={s.path}
          aria-current={isActive(path, s.path) ? 'page' : undefined}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * Mobile bottom bar: the primary sections directly, plus a "More" button for
 * everything else (Tools today) — the desktop top nav shows every section
 * flat, but it is hidden under 720px, so without this, secondary sections
 * would be unreachable on a phone.
 */
function BottomNav() {
  const path = useRoute();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sections = getSections();
  const primaryItems = sections.filter((s) => s.primary);
  const moreItems = sections.filter((s) => !s.primary);
  const moreActive = moreItems.some((s) => isActive(path, s.path));

  // Close the sheet on an actual route change, but not on first mount —
  // effects run on mount too, and if that happened to race a very fast
  // click (e.g. in tests) it would silently close a sheet the user just
  // opened before they ever saw it.
  const prevPath = useRef(path);
  useEffect(() => {
    if (prevPath.current !== path) {
      prevPath.current = path;
      setOpen(false);
    }
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <nav class="bottombar" aria-label="Primary">
      {primaryItems.map((s) => (
        <a
          key={s.id}
          class="navlink"
          href={s.path}
          aria-current={isActive(path, s.path) ? 'page' : undefined}
        >
          {s.label}
        </a>
      ))}
      {moreItems.length > 0 ? (
        <div class="bottombar__more" ref={rootRef}>
          {open ? (
            <div class="bottombar__sheet" role="menu" aria-label="More sections">
              {moreItems.map((s) => (
                <a
                  key={s.id}
                  class="bottombar__sheet-link"
                  role="menuitem"
                  href={s.path}
                  aria-current={isActive(path, s.path) ? 'page' : undefined}
                >
                  {s.label}
                </a>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            class="navlink"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-current={moreActive ? 'page' : undefined}
            onClick={() => setOpen((o) => !o)}
          >
            More
          </button>
        </div>
      ) : null}
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
      <BottomNav />
    </div>
  );
}
