# PLAN — Step 1 (Foundation + TYPE)

## Status of the step prompt
`prompts/STEP-1.md` was **not** included in the upload (only STEP-2 and STEP-3 arrived).
Step 1 scope below is derived from what STEP-2 and STEP-3 explicitly leave out, plus
`docs/02` (architecture), `docs/04` (engine) and `docs/07` (acceptance):

- STEP-2 = Learn + Practice + Stats, and states *"Step 1 is complete"*.
- STEP-3 = Challenges + Tools + Premium settings + Fun modes + PWA + Polish.
- Therefore **Step 1 = project foundation + the TYPE section + settings/themes core + storage + tests.**

Owner: if this does not match `PROMPT-STEP-1.md`, send that file and I will correct course.

## Scope (this step)

### 1. Tooling and repo hygiene
- Vite + TypeScript (strict) + Preact + Vitest. No other runtime dependencies.
- JSX via esbuild `jsxImportSource: "preact"` — avoids needing `@preact/preset-vite`.
- `vercel.json` (SPA rewrite + CSP and security headers from `docs/02`), `.gitignore`,
  `README.md`, `CHANGELOG.md`.

### 2. Design system (`docs/03`)
- `styles/tokens.css`, `base.css`, `utilities.css`. All 20 tokens from `data/themes.json`.
- 10 presets wired; appearance mode Light / Dark / System / High contrast.
- Original GoTyping wordmark (inline SVG, geometric, legible at 24 px). No Gku Type assets.
- `src/brand.ts` holds name + provisional tagline.

### 3. Shell
- Hand-written History API router, lazy-loaded feature chunks.
- Desktop top bar, mobile bottom bar. **Section registry** — only implemented sections are
  registered, so Step 1 ships no dead nav entries (AGENT.md: no placeholder screens).
  Step 1 registers **Type** and **Settings**; Step 2/3 register the rest.

### 4. Core engine (`docs/04`) — pure, no DOM, fully tested
- `core/engine/session.ts` state machine, `metrics.ts`, `modes.ts`, `events.ts`.
- NFC code-point units; per-unit state in `Uint8Array`; O(1) `handleChar` / `handleBackspace`.
- Keep-going vs stop-on-error; backspace allow/word/off; space-skips-word + undo skip;
  time-mode text extension; short-test guard; per-key capture buffer; ≤ 4 Hz tick.

### 5. Text generation
- Seeded RNG (deterministic for tests). Generators: words, quote, numbers, punctuation,
  mixed, paragraph, sentence, custom. Content lazy-loaded per language.

### 6. Layouts
- QWERTY resolver + finger map (English/Hinglish) — complete and tested.
- Hindi: engine-level Devanagari correctness (matra/halant sequences) is done and tested.
  Physical Inscript/Remington key tables need authoritative verification per `docs/06` rule 1,
  so they ship **unverified → Beta, behind a flag**, with status recorded in
  `docs/layout-sources.md`. Full verification + on-screen Hindi keyboard: Step 2.

### 7. Storage
- `store/settings.ts` — localStorage, versioned with migrations, injectable backend for tests.
- `store/db.ts` — hand-written IndexedDB wrapper; `history.ts`, `aggregates.ts`, `backup.ts`.
- No writes during a test; persist once on completion.

### 8. TYPE feature
- Config summary pill → grouped panel; collapses on typing start.
- Text renderer honouring the hot-path contract: one span per unit, no layout reads per
  keystroke, caret moved via `transform` inside a rAF batch.
- Live stats row (≤ 4 Hz, each stat toggleable); result screen with hand-drawn SVG graph.

### 9. Settings
Typing · Display · Motion · Keyboard · Language · Accessibility · Themes · Data · Privacy · About.
Every option changes real behaviour. (Practice category is Step 2.)

### 10. Tests
engine, metrics (hand-computed fixtures), generators (seeded determinism), qwerty resolver,
settings migrations, history cap, aggregates math, backup round-trip + corrupted input.

## Out of scope (later steps)
Learn, Practice, Stats pages, Challenges, Tools, fun modes, theme builder UI, PWA — Steps 2–3.

## Definition of done
`npm run build` and `npm test` pass, TypeScript clean, no console errors, Type section works
end-to-end on desktop and mobile widths, settings persist and all change behaviour,
export/import round-trips, live preview runs.
