# GoTyping

**Type better. Go further.**

A calm, premium, local-first typing platform for English, Hindi and Hinglish.
No ads, no analytics, no tracking, no account, no sound. Your typing data never
leaves your device.

> Status: **Step 1 complete** — foundation, typing engine and the Type section.
> Learn / Practice / Stats arrive in Step 2; Challenges / Tools / PWA in Step 3.
> Sections that are not built are not in the navigation.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server                               |
| `npm run build`   | Typecheck (`tsc --noEmit`) then build to `dist/` |
| `npm run preview` | Serve the production build                    |
| `npm test`        | Run the full test suite once                  |
| `npm run test:watch` | Watch mode                                 |

## What works today

- **Type** — Time, Words, Quote, Custom text and Zen modes; text styles (words,
  paragraph, sentence, numbers, punctuation, mixed); punctuation / numbers /
  capitalization toggles; keep-going or stop-on-error; backspace free / word-only / off;
  space-skips-word with undo; live stats; result screen with a hand-drawn SVG graph.
- **Settings** — Typing, Display, Motion, Language & keyboard, Accessibility, Themes,
  Data, Privacy, About. Every option changes real behaviour and persists.
- **Themes** — 10 presets, light/dark/system/high-contrast, applied as CSS custom
  properties from `data/themes.json`.
- **Storage** — settings in localStorage (versioned + migrated), tests and aggregates in
  IndexedDB, JSON export/import with strict validation.
- **Languages** — English, Hinglish and Hindi text. Hindi *text* is handled correctly
  (per-unit matras and halants); the Hindi *key table* is Beta — see
  [`docs/layout-sources.md`](docs/layout-sources.md).

## Project layout

```
AGENT.md          permanent rules — read before any task
PLAN.md           current step plan
docs/             product spec, architecture, design system, engine, acceptance
data/             seed content (words, quotes, themes, curriculum outline)
legacy/           old Gku Type docs — reference only, never imported
prompts/          per-step task briefs
src/
  core/           PURE logic, no DOM: engine, text generators, layouts
  store/          settings, IndexedDB, history, aggregates, backup
  ui/             shell, shared components, theme
  features/       type/, settings/  (lazy-loaded per route)
  styles/         tokens.css, base.css, utilities.css
tests/            engine, metrics, generators, layouts, store, backup, DOM smoke
```

`core/` never imports from `ui/` or `features/`. The UI never computes metrics itself.

## Dependencies

Runtime: **preact** only.
Dev: **vite**, **typescript**, **vitest**, **jsdom**.

Router, store, IndexedDB wrapper, charts and the keyboard layout system are all
hand-written. See `CHANGELOG.md` for why jsdom was added.

## Testing

```bash
npm test
```

142 tests covering the engine state machine, metric formulas against hand-computed
fixtures, seeded text generators, keyboard resolvers, settings migrations, history
caps, aggregate maths, backup round-trips (including corrupted input), plus a
DOM integration suite that mounts the real app and drives it with real key events.

## Deploy (Vercel)

Static build, no server code.

- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` already sets the SPA rewrite plus CSP and security headers.

## Privacy

No network calls at runtime — every asset is same-origin and bundled. No ads, no
analytics, no third-party scripts, fonts or CDNs. Nothing you type is ever transmitted.
