/**
 * Offline mode (docs/01 "Build offline mode (PWA)"). Registers the
 * hand-written service worker (public/sw.js) in production only — the dev
 * server already serves everything instantly, and a cached dev bundle would
 * just confuse hot reload. Registration failing (unsupported browser,
 * blocked API) must never break the app: typing works with or without it.
 */
export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* Offline support is a progressive enhancement. */
    });
  });
}
