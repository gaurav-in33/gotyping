# Changelog

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
