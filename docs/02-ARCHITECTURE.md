# 02 — Architecture

## Stack (decided; do not re-litigate)
Vite + TypeScript (strict) + Preact. Vitest for tests. No UI kit, no CSS framework, no chart library, no state library, no router library. CSS with custom properties (theme tokens). Hand-written: router (History API), store, IndexedDB wrapper, SVG/canvas charts, service worker (or `vite-plugin-pwa` if justified in CHANGELOG).
Deploy: Vercel static (`npm run build` → `dist/`), `vercel.json` with SPA rewrite and strict headers.

## Folder structure
```
/AGENT.md  /README.md  /CHANGELOG.md  /PLAN.md
/docs  /data (seed content, copied/transformed into src/content)  /legacy (reference only, never imported)
/public  manifest, icons, favicon
/src
  main.tsx  app.tsx  brand.ts  router.ts
  core/                 PURE logic, no DOM
    engine/             session.ts (state machine), metrics.ts, modes.ts, events.ts
    text/               generators.ts (words, quotes, numbers, punctuation, code, seeded RNG), custom.ts
    layouts/            qwerty.ts, inscript.ts, remington.ts, fingers.ts, resolver.ts (event -> character)
    adaptive/           profiler.ts (key/bigram/trigram/word scores), planner.ts (weighted sampling), profiles.ts
    progress/           xp.ts, levels.ts, streaks.ts, achievements.ts, challenges.ts
  content/              words-*.json, quotes.json, curriculum.ts, themes.json, achievements.json (lazy per language)
  store/                settings.ts (localStorage, versioned+migrations), db.ts (IndexedDB), history.ts, aggregates.ts, backup.ts (export/import+validation)
  ui/                   shell/, components/, charts/, keyboard/ (on-screen keyboard, finger guide, heatmap), theme/ (apply tokens, builder)
  features/             type/, learn/, practice/, stats/, tools/, challenges/, settings/   (each lazy-loaded)
  styles/               tokens.css, base.css, utilities.css
/tests                  engine, metrics, layouts, adaptive, store, backup
```
Rules: `core/` must not import from `ui/` or `features/`. `features/` talks to `core/` through small interfaces. UI never computes WPM/accuracy.

## Typing hot path (performance contract)
- One persistent hidden input (or keydown on a focused element) captures input. Physical keyboard: resolve character from `KeyboardEvent` via `layouts/resolver.ts` (English: `event.key`; Hindi: `event.code` + shift → layout map). Soft keyboards (English) via `beforeinput`/`input`. Hindi on touch devices: on-screen GoTyping keyboard drives the engine (Gboard Hindi is unreliable for this).
- Engine `Session`: target stored as array of code-point units; per-unit state in a `Uint8Array`; counters are plain numbers. `handleChar(ch, t)` and `handleBackspace(t)` are O(1) amortized and allocation-light. Time via `performance.now()`.
- Renderer: text pre-rendered as one span per unit inside line containers. Each key updates only the changed unit(s) and the caret via `transform` in a `requestAnimationFrame` batch. **No layout reads per keystroke**: line breaks/positions measured once per render and on resize/font change. Virtualize long text (render visible lines + buffer, append as you go).
- Live stats update at most 4 times/second from the engine (never per key).
- No storage writes during a test. Persist on completion (and on idle/`pagehide` for in-progress drafts only if needed).
- Charts/heavy views are lazy chunks. Initial JS target: under ~100 KB gzip for shell + Type. Lighthouse targets: Performance ≥ 95, Accessibility ≥ 95.

## Storage
- `localStorage`: settings (`gotyping:settings`, `{v, ...}` with migrations), small progress flags.
- IndexedDB `gotyping` db: stores `tests` (one record per finished test), `aggregates` (per-key, per-bigram/trigram, per-word, per-finger, per-day), `lessons`, `challenges`, `ghosts` (best-run per-char timeline, compact).
- Test record: id, ts, mode, lang, layout, duration, config snapshot, wpm, raw, cpm, accuracy, consistency, errors, correct/total keystrokes, correct chars, skipped, correct/incorrect words, per-second series, lesson id (optional).
- Per-key aggregate: count, errors, sum and sum-of-squares of latency. Bigram/trigram: same. Error pairs: `expected→typed` counts. Aggregates update once per finished test.
- Export: single JSON `{app:"gotyping", schema, exportedAt, settings, tests, aggregates, lessons, challenges}`. Import: validate schema/version, show a summary, offer merge or replace. Never trust imported data blindly.
- Cap history (default 5,000 tests; setting) and compact old per-second series.

## Offline / PWA (Step 3)
Manifest, icons, service worker precaching app shell + content, offline-first, "update available" prompt. No analytics, no remote logging. Verify no cross-origin requests.

## Security headers (`vercel.json`)
CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'`. Plus `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal. Long cache for hashed assets, no-cache for `index.html`/service worker.

## Extensibility
New language = new folder in `content/` (words, quotes, curriculum) + optional layout in `core/layouts/` registered in one registry. New theme = JSON entry. New adaptive profile = entry in `profiles.ts`.
