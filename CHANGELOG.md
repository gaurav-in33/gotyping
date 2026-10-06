# Changelog

## October 2026 — Hindi phone input and display-only keyboard guide

### Fixed

- **Hindi Gboard/iOS path:** `KeyboardInputReader` now maps an inserted
  English-QWERTY character back to its physical QWERTY key and then through
  the same InScript/Remington key table used by USB/Bluetooth `keydown`.
  `k` therefore becomes **क**, `K` becomes **ख**, and `k` + `e` becomes
  **का** — no Latin character is admitted into a Hindi typing session.
- The reader prefers `beforeinput`, falls back to an `input` value diff for
  Android 229 / `Unidentified` events, handles composition drafts/commit
  echoes once, clears the hidden field after every completed press, and
  suppresses an input event paired with a handled physical keydown.
- A direct Devanagari IME result is accepted as-is and is never remapped.

### Added

- **Tools → Phone keyboard test**, a real-device event inspector showing
  `key`, `code`, `data`, `inputType`, `isComposing`, `keyCode`, and the final
  unit produced by the shared reader.
- **Keyboard guide** in Type, Learn, Practice and Settings: normal + Shift
  labels, next-key/finger color, and Shift highlighting. It is display-only
  by default; the optional global **Tap guide to type** setting restores the
  old tap-to-type behavior.
- A global **Guide: Show / Hide** preference (default Show), a compact
  `visualViewport`-aware phone layout, and Settings schema migration v5.
- jsdom coverage for Gboard-style beforeinput/input, uppercase first letter,
  conjuncts, composition, direct Devanagari input, backspace, word skip,
  punctuation/digits, and duplicate physical+input suppression.

### Documentation

- `docs/TEST-ON-DEVICE.md` now has exact Android Gboard/iOS configuration and
  real-device acceptance steps.
- `docs/layout-sources.md` documents the one-table phone mapping and its
  inherited InScript verification status.

## Step 3 — Tools, theme builder, fun modes, offline mode, original on-screen keyboard (later replaced)

### Added

**Tools (`docs/01` §6)** — all six categories from the spec, each its own tab
in `ToolsScreen.tsx`:

- **Typing utilities** — WPM/CPM/accuracy calculators, word and character
  counters, text analyzer.
- **Keyboard** — keyboard tester (press any physical key and see it light up
  on a rendered diagram of the selected layout, with the mapped character,
  Shift variant and a verified/unverified/unmapped state per key — shares
  `KeyboardDiagram` with Stats' heatmap, one implementation, two callers), key
  visualizer, finger-assignment guide, layout reference (heatmap itself stays
  a Stats-only link, per spec).
- **Text tools** — custom text generator, text cleaner/formatter, case
  converter, punctuation helper, local paste-or-`.txt` text importer (nothing
  ever uploaded).
- **Hindi / Indian** — InScript and Remington keyboard reference, Unicode
  notes, government-exam practice honestly labelled "exam-style, not
  official".
- **Productivity** — Pomodoro, session timer, practice goal timer.
- **Remington (Gail) stayed Beta, by decision, not oversight.** It is mapped
  only up to the digit row. A second, documented search pass this step (see
  `docs/layout-sources.md` → "Step 3 revisit") checked a CRPF exam PDF, two
  typing-tutor sites already on file, and one new site
  (`smarttypingsolution.com`); none produced an authoritative, independently
  checkable full key chart. Remington keeps `verified: false` and is excluded
  from live Hindi Learn/Type sessions by `isFunctional()`'s ≥20-key threshold;
  Settings shows its Beta status and the reason explicitly.
- **KrutiDev ↔ Unicode converter was not shipped.** No reliable, checkable
  mapping table was found (`docs/layout-sources.md`). Per `docs/06` and the
  owner's explicit instruction, nothing invented ships in its place.

**Settings**

- "Show advanced" progressive disclosure on every settings category (a
  `<details>` block), so the default view stays short while power users can
  still reach every knob.
- Custom theme builder (`ThemeBuilder.tsx`) — build a theme from scratch and
  save it into `settings.theme.customThemes`, where it is picked up by the
  same `allThemes()` used for the 10 built-in themes.
- A progression-visibility setting that removes XP, levels, streaks,
  Challenges and every gamification element when turned off.
- New Keyboard/Display toggles actually wired to behaviour this step (they
  existed in the settings schema before but had no UI control and no reading
  code): **On-screen keyboard**, **Highlight next key**, **Key labels**,
  **Finger guide** — under Settings → Language and keyboard → Show advanced.

**On-screen keyboard**

- Historical note: this step introduced an interactive `OnScreenKeyboard.tsx`.
  It was replaced in October 2026 by the shared display-only `KeyboardGuide`
  (global Show/Hide, normal + Shift layers, optional tap-to-type disabled by
  default), so the old file no longer ships.
- `src/core/layouts/registry.ts` — new `ALL_LAYOUTS` / `layoutByAnyId()`,
  a single place that resolves a settings layout id to its table, now shared
  by the Keyboard tester, the keyboard guide and the Learn finger guide
  instead of three separate lookups.
- Fixed a real bug while building this: `FingerGuide` was hardcoded to QWERTY
  regardless of the lesson's language or the user's physical-layout setting.
  It now takes the active layout as a prop and recomputes its reverse index
  from it.

**Fun modes** (`docs/01` §7) — Blind, Random capitalization, Sudden death,
Memory, Ghost race. Selectable from the Type screen's config panel; switching
mid-session restarts cleanly.

**Offline mode (PWA)**

- Hand-rolled service worker (`public/sw.js`, templated by
  `scripts/build-sw.mjs` at build time) with a versioned cache name and a
  build-time-generated precache list — every hashed asset in `dist/` plus
  `/`, `/index.html` and `/manifest.webmanifest`. Cache-first for precached
  assets, network-first with a cache fallback for navigations, so the app
  still boots with no connection after one successful visit.
- Web app manifest + icon set (`public/manifest.webmanifest`,
  `public/icons/`), registered from `src/sw-register.ts`, called from
  `src/main.tsx` and **gated to production builds only** (`import.meta.env.DEV`
  early-return) so `npm run dev` never registers a half-templated worker.
- Verified this step, not just asserted: a clean `npm run build` produced a
  syntactically valid `dist/sw.js` with every `__SW_VERSION__` /
  `__SW_PRECACHE__` placeholder substituted (the build now hard-fails with a
  clear error if either literal survives, instead of shipping silently
  broken); `dist/` served over HTTP and `/`, `/sw.js`, `/manifest.webmanifest`
  all returned 200 with correct content; and a full-source grep found zero
  uses of `fetch` / `XMLHttpRequest` / `sendBeacon` / `WebSocket` anywhere in
  `src/`, and zero outbound `http(s)://` references in `src/`, `public/` or
  `index.html` other than the harmless, non-fetched SVG namespace URI in
  `favicon.svg` — the app makes no outbound or cross-origin network requests.

**Tests** — grew from 142 (Step 1) to 270, covering adaptive planning,
progress/XP/streaks/achievements, lessons, generators, layouts, backup,
stats, metrics, tools, fun modes, lesson progress, fake-history seeding, and
an expanded DOM integration suite (now exercising the replacement keyboard guide
and its Settings toggles end-to-end with real events).

### Known limitations (unchanged from Step 1, reconfirmed this step)

- Remington (Gail) stays Beta; KrutiDev stays unshipped — see above and
  `docs/layout-sources.md`.
- **Lighthouse could not be run in this sandbox.** No Chromium could be
  installed (`apt-get` has no network route to its mirror; Puppeteer's
  Chrome auto-download fails TLS). No Lighthouse numbers are available;
  this is a sandbox limitation, not a claim that the numbers are good.
- Offline mode was verified by static code review, a build-output content
  check, and `curl` against the built `dist/` output — not by toggling
  "Offline" in a real browser's devtools, since no real browser is available
  in this sandbox.

## Step 2 — Learn, Practice, Stats and Challenges

Merged to `main` as a single squashed commit before this step began, so no
granular history exists to mine; this entry is written from reading the
shipped code rather than from original commit messages.

### Added

- **Learn** (`src/features/learn/`) — a structured course (`core/curriculum.ts`)
  of lessons rendered through `LessonView.tsx`, including adaptive lessons
  that target a learner's actual weak keys/bigrams via
  `core/adaptive/planner.ts` and `core/adaptive/scoring.ts` (falling back to a
  general drill when there isn't enough history yet), plus a finger guide.
- **Practice** (`src/features/practice/`) — profile-based practice sessions
  (`core/adaptive/profiles.ts`) that generate text weighted toward specific
  weaknesses (e.g. punctuation, numbers, specific finger/hand).
- **Stats** (`src/features/stats/`) — aggregated history view: per-key,
  per-bigram/trigram, per-finger and per-day stats folded from finished
  tests, including the keyboard heatmap built on the same `KeyboardDiagram`
  used elsewhere.
- **Challenges** (`src/features/challenges/`) — XP, levels, streaks and
  achievements (`core/progress/xp.ts`, `levels.ts`, `streaks.ts`,
  `achievements.ts`, `challenges.ts`).
- Settings, Tools (Keyboard tester) and the About card from `docs/01` were
  already present on `main` going into Step 3 and were re-verified rather
  than rebuilt.

### Known limitations carried into Step 3

- No CHANGELOG entry existed for this step before now — the gap was found
  and closed while preparing the Step 3 entry above, written from code
  inspection since no per-commit history survived the squash merge.

## Step 1 — Foundation, typing engine and the Type section

### Added

**Tooling**

- Vite + TypeScript (strict, with `noUncheckedIndexedAccess`) + Preact + Vitest.
- JSX compiled by esbuild with `jsxImportSource: "preact"`, which avoids needing
  `@preact/preset-vite` as a dependency.
- `vercel.json` with the SPA rewrite and the CSP / security headers from `docs/02`.

**Core (pure, no DOM)**

- `core/engine/session.ts` — the typing state machine: per-unit state in a `Uint8Array`,
  O(1) `handleChar` / `handleBackspace`, keep-going vs stop-on-error, backspace
  allow/word/off, space-skips-word with undo, time-mode text extension, pause/resume,
  Expert and Master fail rules, Zen, and a per-keystroke capture buffer.
- `core/engine/metrics.ts` — WPM, raw WPM, CPM, accuracy, errors, uncorrected errors,
  consistency, skipped chars, word tallies, and the short-test guard, exactly as defined
  in `docs/04`.
- `core/engine/events.ts` — `start / keystroke / mistake / skip / undo / tick / pause /
  resume / complete / fail`. No audio in this version; the events exist so sound can be
  added later without refactoring.
- `core/text/` — seeded RNG (mulberry32 + xmur3) and generators for words, paragraphs,
  sentences, numbers, punctuation, mixed text, quotes and custom text, with a variety
  guard and lesson key-set filtering.
- `core/layouts/` — QWERTY table, finger map, and a resolver that trusts `event.key` for
  Latin and resolves from `event.code` + Shift for Devanagari.

**Storage**

- Versioned settings in localStorage with a working migration path and an injectable
  backend for tests.
- Hand-written IndexedDB wrapper; test history with cap enforcement and series
  compaction; aggregates (per key, bigram, trigram, word, finger, error pair, day)
  folded once per finished test.
- Export / import with strict validation that skips malformed records instead of
  trusting the file.

**UI**

- Shell with a desktop top bar and mobile bottom bar, driven by a section registry so
  unbuilt features are simply absent (no dead links, no placeholder screens).
- Hand-written History API router.
- Original GoTyping wordmark (inline SVG). Nothing from the old Gku Type identity.
- 10 themes applied as CSS custom properties, with light / dark / system / high contrast.
- Type screen: config summary pill that expands into a grouped panel, live stats at
  ≤ 4 Hz, result screen with a hand-drawn SVG graph, copy-result.
- Settings: Typing, Display, Motion, Language & keyboard, Accessibility, Themes, Data,
  Privacy, About — with progressive disclosure.

**Tests** — 142 across engine, metrics, generators, layouts, store, backup and a DOM
integration suite.

### Fixed (bugs the DOM integration suite caught before release)

1. **The typing text never rendered.** The text renderer was mounted in a `useEffect`
   with `[]` dependencies, which ran while the language pack was still loading and the
   text element did not exist yet, and never ran again. Replaced with a callback ref that
   attaches whenever the node appears and re-syncs the running session.
2. **Display and theme settings silently did nothing.** `preact/compat`'s `Suspense`
   discards the ancestor's pending effects when a lazy child suspends on first render, so
   `useAppliedSettings` never committed — changing font size, width, density or reduced
   motion had no visible effect until a reload, and navigating to a not-yet-loaded
   section left the previous screen mounted indefinitely. Route-level code splitting is
   now an explicit dynamic import with real loading and error states.
3. **Navigation could be silently dropped.** Because effects run after render, a
   `navigate()` that landed between a component rendering and its route subscription was
   lost. `useRoute` now re-syncs on subscribe, and `emit` isolates subscriber failures so
   one bad listener cannot break routing for everyone.

### Dependency decisions

- **preact** — the stack decided in `docs/02`.
- **vite / typescript / vitest** — allowed by default in `AGENT.md`.
- **jsdom** (dev only) — *added with reason.* `docs/08` records that the old version's
  worst flaw was being "never tested in a real browser by the assistant that built it".
  A real browser could not be installed in this environment (the Chromium download is
  blocked), so jsdom lets the suite mount the actual app and drive it with real
  `KeyboardEvent` / `InputEvent` objects. It immediately paid for itself by catching the
  three bugs above, each of which would have shipped. It is `devDependencies` only and
  is not in the production bundle.
- `preact/compat` was used briefly for `lazy` / `Suspense` and has been removed; the app
  no longer imports it, which also trimmed the entry chunk by ~2 KB gzip.

### Known limitations

- **Hindi InScript is Beta.** The only key table available is the old project's
  unverified from-memory map. It is flagged `verified: false`, badged Beta in the UI, and
  documented in `docs/layout-sources.md`. Hindi *text* handling is correct and tested;
  the physical key mapping is what remains unverified.
- **Remington (Gail) and the KrutiDev converter are not shipped** — no trustworthy source
  is available, and `docs/06` forbids inventing one.
- **Not tested on real hardware.** No physical keyboard, no touch device, no Lighthouse
  run was possible in this environment. Caret geometry in particular is measured from
  real layout boxes, which jsdom reports as zero, so it needs a visual check on a device.
- Learn, Practice, Stats, Challenges, Tools, the theme builder and PWA support are Step
  2 / Step 3 work and are deliberately absent from the navigation rather than stubbed.
