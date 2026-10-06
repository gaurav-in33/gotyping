/**
 * GoTyping service worker — offline mode (docs/01).
 *
 * Same-origin only: this worker never fetches, caches or proxies anything
 * off gotyping's own origin, matching the app's "no network calls" privacy
 * promise (see Settings > Privacy). It only makes the app's own already-
 * bundled assets available without a network connection.
 *
 * The precache list below is a placeholder: scripts/build-sw.mjs rewrites
 * this file after `vite build` to fill in the actual list of built asset
 * paths, so the source committed here never needs manual updating per
 * release.
 */
const VERSION = '__SW_VERSION__';
const CACHE_NAME = `gotyping-${VERSION}`;
const PRECACHE = __SW_PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept a cross-origin request — there should not be any from
  // this app, and this worker must not become the thing that makes one.
  if (url.origin !== self.location.origin) return;

  // Page navigations: prefer a fresh app shell, fall back to the cached one
  // when there is no network (that is the whole point of offline mode).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((res) => res || caches.match('/'))),
    );
    return;
  }

  // Everything else (hashed JS/CSS chunks, fonts, icons): cache-first so a
  // repeat visit is instant and works offline, refreshed in the background
  // whenever the network is actually available.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            void caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
