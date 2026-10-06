# GoTyping

**Type better. Go further.**

A calm, premium, local-first typing platform for English, Hindi and Hinglish.
No ads, no analytics, no tracking, no account, no sound. Your typing data never
leaves your device — it works fully offline after the first load.

> Status: **Steps 1–3 complete** — Type, Learn, Practice, Stats, Challenges,
> Tools, Settings (with a custom theme builder) and offline/PWA support are
> all built. See `CHANGELOG.md` for what shipped in each step and the known
> limitations of each.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Vite dev server                               |
| `npm run build`   | Typecheck (`tsc --noEmit`), build to `dist/`, then generate the service worker |
| `npm run preview` | Serve the production build                    |
| `npm test`        | Run the full test suite once                  |
| `npm run test:watch` | Watch mode                                 |

## What works today

- **Type** — Time, Words, Quote, Custom text and Zen modes; text styles (words,
  paragraph, sentence, numbers, punctuation, mixed); punctuation / numbers /
  capitalization toggles; keep-going or stop-on-error; backspace free / word-only / off;
  space-skips-word with undo; live stats; result screen with a hand-drawn SVG graph;
  an on-screen keyboard (optional, incl. Hindi) that highlights the next key and
  supports tap-to-type. "More modes": Ghost race, Memory, Blind, Random capitalization,
  Difficult words, Sudden death, Speed burst, Endurance.
- **Learn** — a structured course with adaptive lessons that target your actual
  weak keys/bigrams once there's enough history, a finger guide that follows the
  active language/layout, and persisted pass/best/progress per lesson.
- **Practice** — profile-based drills (e.g. punctuation, numbers, specific
  finger/hand) generated from your own stats, with a clear fallback when you
  don't have history yet.
- **Stats** — per-key / per-bigram / per-trigram / per-finger / per-day
  aggregates folded from finished tests, a keyboard heatmap, and filters by
  language, mode, duration and lesson.
- **Challenges** — XP, levels, streaks and achievements; a Progression setting
  (Settings → Practice) can reduce or fully remove the gamification layer.
- **Tools** — Typing utilities (WPM/CPM/accuracy calculators, counters, text
  analyzer), Keyboard (tester, key visualizer, finger guide, layout reference),
  Text tools (generator, cleaner, formatter, case converter, punctuation
  helper, local text importer), Hindi/Indian (InScript + Remington reference,
  Unicode notes, exam-style practice honestly labelled as such), Productivity
  (Pomodoro, session timer, goal timer).
- **Settings** — Typing, Display, Motion, Language & keyboard, Accessibility,
  Themes (10 presets + a custom theme builder with contrast warnings), Data,
  Privacy, About — every category has "Show advanced" progressive disclosure.
  Every option changes real behaviour and persists.
- **Offline / PWA** — installable manifest, app icons, and a versioned service
  worker that precaches every build asset so the app keeps working with no
  connection after one successful visit.
- **Storage** — settings in localStorage (versioned + migrated), tests and
  aggregates in IndexedDB, JSON export/import with strict validation.
- **Languages** — English, Hinglish and Hindi text. Hindi *text* is handled
  correctly (per-unit matras and halants). The InScript key table is verified
  against two independent OS drivers; Remington (Gail) stays Beta — only the
  digit row has a trustworthy source — and a KrutiDev↔Unicode converter was
  not shipped because no reliable mapping could be found. See
  [`docs/layout-sources.md`](docs/layout-sources.md) for the full trail.

## Project layout

```
AGENT.md          permanent rules — read before any task
PLAN.md           current step plan
docs/             product spec, architecture, design system, engine, acceptance
data/             seed content (words, quotes, themes, curriculum outline)
legacy/           old Gku Type docs — reference only, never imported
prompts/          per-step task briefs
public/           manifest, icons, hand-rolled service worker template
scripts/          build-sw.mjs — fills the service worker precache list at build time
src/
  core/           PURE logic, no DOM: engine, text generators, layouts, adaptive
                  planner/scoring, progress (xp/levels/streaks/achievements), tools
  store/          settings, IndexedDB, history, aggregates, backup
  ui/             shell, shared components (incl. the keyboard diagram), theme
  features/       type/, learn/, practice/, stats/, challenges/, tools/, settings/
                  (each lazy-loaded per route)
  styles/         tokens.css, base.css, utilities.css
tests/            engine, metrics, generators, layouts, adaptive, progress, lessons,
                  store, backup, stats, theme, tools, fun-modes, lesson-progress,
                  fake-history, plus a DOM integration suite
```

`core/` never imports from `ui/` or `features/`. The UI never computes metrics itself.

## Dependencies

Runtime: **preact** only.
Dev: **vite**, **typescript**, **vitest**, **jsdom**.

Router, store, IndexedDB wrapper, charts, the keyboard layout system and the
service worker are all hand-written. See `CHANGELOG.md` for why jsdom was added.

## Testing

```bash
npm test
```

280+ tests covering the engine state machine, metric formulas against hand-computed
fixtures, seeded text generators, keyboard resolvers (QWERTY, InScript, Remington),
adaptive scoring/planning, XP/levels/streaks/achievements, lesson generation and
progress, settings migrations, history caps and filters, aggregate maths, backup
round-trips (including corrupted input), the theme contrast helper, the Tools
calculators, fun modes, and a DOM integration suite that mounts the real app and
drives it with real key events, soft-keyboard `beforeinput` events, and on-screen
keyboard taps (English and Hindi).

**Not verifiable in this environment:** a real browser (Chromium could not be
installed — no network route to its mirror, and Puppeteer/Playwright's download
also fails), so there are no Lighthouse numbers and no device-level checks for
dropped frames, screen-reader behaviour, or responsive layout at real
breakpoints. Offline mode was verified by static code review, a build-output
content check, and `curl` against the built `dist/` output rather than an
actual browser "Offline" toggle.

## Deploy (Vercel)

Static build, no server code.

- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` already sets the SPA rewrite plus CSP and security headers.

## Privacy

No network calls at runtime — every asset is same-origin and bundled, confirmed
by grepping the whole source tree for `fetch`/`XMLHttpRequest`/`sendBeacon`/
`WebSocket` and for any external `http(s)://` reference (there are none outside
a harmless SVG namespace string). No ads, no analytics, no third-party scripts,
fonts or CDNs. Nothing you type is ever transmitted.
