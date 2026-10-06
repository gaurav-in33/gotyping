# GOTYPING SPEC PACK (AGENT.md + docs). Split into files at the FILE markers.

---
<!-- FILE: AGENT.md -->

# AGENT.md — permanent rules for GoTyping (read before EVERY task)

GoTyping is a brand-new, premium, local-first typing platform (English, Hindi, Hinglish). The typing experience is the star. Maximum capability, minimum confusion.

**Repository isolation:** Work ONLY in the GitHub repository named `gotyping`. Do not read, modify, delete or push to any other repository, and do not create new repositories. If `gotyping` is not accessible, stop and tell the owner.

## Source of truth (read in this order)
1. `docs/01-PRODUCT-SPEC.md` — what to build, by section
2. `docs/02-ARCHITECTURE.md` — stack, folders, modules, storage, performance budget
3. `docs/03-DESIGN-SYSTEM.md` — look, tokens, themes, layout rules
4. `docs/04-TYPING-ENGINE.md` — metrics formulas, state machine, modes (exact definitions)
5. `docs/05-LEARN-AND-ADAPTIVE.md` — lessons + adaptive engine
6. `docs/06-HINDI-LAYOUTS.md` — Inscript and Remington (verification rules!)
7. `docs/07-ACCEPTANCE.md` — checklist + required tests
8. `docs/08-LEGACY-REFERENCE.md` — what may be reused from the old Gku Type
9. `data/` — seed content (words, quotes, themes, curriculum outline, legacy Inscript map)
10. `prompts/STEP-1|2|3.md` — the current phase task

## Non-negotiables
- Brand: **GoTyping**. Brand-new identity. Do NOT use the Gku Type name, logo or colors. Create an original simple wordmark SVG. Tagline is provisional, kept in one config file (`src/brand.ts`).
- No ads. No analytics. No tracking. No mandatory sign-in. No third-party scripts, fonts, CDNs or network calls at runtime (same-origin only). Never send typing data anywhere.
- **No sound in this version.** No audio code, no sound settings, no placeholder UI. The engine emits events (keystroke, error, complete) so sound can be added later without refactoring.
- Local-first: settings in localStorage, history and stats in IndexedDB. Never write storage per keystroke. Provide export/import.
- Do not copy TypingClub or any other site's UI, text, branding or lessons. Lesson text must be original (generated from key sets, the word lists in `data/`, or your own sentences).
- One feature = one implementation. If two places need the same thing (e.g. keyboard heatmap in Stats and in Tools), build one component and expose two entry points.
- No dead buttons, no placeholder screens in anything that ships. If a feature is not ready, it is not in the UI.
- Do not add dependencies without a written reason in `CHANGELOG.md`. Allowed by default: preact, vite, typescript, vitest. Hand-write charts (SVG/canvas), router, store and IndexedDB wrapper.
- Never copy broken legacy code. `legacy/` is reference only. Reimplement cleanly with tests.

## Engineering rules
- TypeScript strict. Engine code is pure (no DOM, no timers owned by UI). UI never computes metrics itself.
- Typing hot path: no layout reads per keystroke, no full re-render, no storage, no allocation spikes. Details in `docs/02-ARCHITECTURE.md`.
- Every setting must actually change behavior and have a category. Settings are versioned and migrated.
- Accessibility is a feature: keyboard navigation, visible focus, reduced motion, high contrast, labels, scalable text.
- Keep files small and modular. No file over ~400 lines without a reason.
- Repository must build (`npm run build`) and pass tests (`npm test`) after every commit. Never leave `main` broken.

## Workflow
- Audit first, plan second (`PLAN.md`), build third. Commit in small logical commits with clear messages.
- Update `README.md` and `CHANGELOG.md` (progress log) every phase.
- Run build and tests yourself. Fix failures before moving on. State clearly anything you could not test (e.g. real devices, real keyboards).
- Do not ask the owner questions that the docs or code answer. If something truly needs a decision, list it once at the end of your report with your recommended default.
- Deploy target: Vercel (static Vite build, `dist/`). Do not add server code.
- Do not start the next step until the owner says so.

## Owner
Gaurav. Works from an Android phone. Prefers short, plain reports in simple Hinglish/English with clear next steps. Final reports must follow the format at the bottom of each `prompts/STEP-*.md`.


---
<!-- FILE: docs/01-PRODUCT-SPEC.md -->

# 01 — Product Spec

**GoTyping** — fast, calm, premium typing platform. Local-first, no account, no ads, no tracking. English + Hindi + Hinglish (architecture open to more languages).

Users can: practice casually, learn touch typing from zero, build speed, build accuracy, fix weak keys, drill specific letters/pairs/words, train endurance, practice Hindi/Hinglish/English, customize everything, analyze performance, use typing/text tools, create their own tests.

## Navigation (7 primary sections — do not add more)
Desktop: top bar. Mobile: bottom bar with Type, Learn, Practice, Stats, More (More = Tools, Challenges, Settings).
1. **TYPE** 2. **LEARN** 3. **PRACTICE** 4. **STATS** 5. **TOOLS** 6. **CHALLENGES** 7. **SETTINGS**

## 1. TYPE
Modes (grouped; show only the main ones by default, rest under "More modes"):
- Main: Time, Words, Quote, Custom text
- Text styles: Paragraph, Sentence, Words-only, Numbers, Punctuation, Mixed
- Special: Code typing, Zen (free typing, no target)
- Challenge variants: Blind, Expert, Master, plus the Advanced/Fun modes below
Presets: time 15/30/60/120/custom (5–600 s); words 10/25/50/100/custom (5–500).
Config options: language, punctuation, numbers, capitalization, difficulty, word list, quote category, custom text, code language, weak-key mode. Use a compact "config summary" pill that expands into a grouped panel. Never show every option at once.
Behavior (all configurable): keep going vs stop on error; backspace (allowed / word-only / off); skip word; undo skip; caret behavior; auto-scroll; focus behavior; restart; pause where appropriate.
Result screen: big WPM, accuracy, raw, consistency, graph; details (CPM, errors, correct chars, keystrokes, time, skipped, correct/incorrect words, weak keys); actions: restart, next, retry weak keys, copy result. Details expand; the first view stays calm.

## 2. LEARN (structured course)
Original TypingClub-style progression: short levels, clear objective, target accuracy, optional target WPM, estimated time, best result, retry, continue, practice weak areas, completion state. Categories and lesson list: `data/curriculum-outline.json` (53 lessons across Beginner, Letter rows, Skill building, Speed, Accuracy, Advanced, Hindi, Hinglish). Lessons are short (1–8 min). Finger guide on keyboard during lessons. Details: `docs/05`.

## 3. PRACTICE (adaptive)
One adaptive engine with profiles: Weak Keys, Slow Keys, Error Recovery, Bigram Trainer, Trigram Trainer, Difficult Words, Accuracy Drill, Speed Drill, Consistency Drill, Endurance Drill. Details: `docs/05`.

## 4. STATS
Summary cards on the overview; drill-down pages: Progress (charts over time), Keys (heatmap, per-key table), Fingers and hands, Errors (pairs), Activity (calendar), Records, History.
Core metrics: WPM, raw WPM, CPM, accuracy, errors, correct chars, keystrokes, time, consistency, skipped chars, correct/incorrect words.
Breakdowns: by language, mode, duration, lesson. Trends: daily/weekly/monthly. Also: personal bests, averages, recent tests, longest session, strongest/weakest/slowest/most-mistyped keys, common error pairs, left/right balance, streaks, milestones.

## 5. CHALLENGES (optional, never childish)
Daily (seeded by date, deterministic, no server), Weekly, Speed Ladder, Accuracy, No-Mistake, Endurance, Personal Best. XP, levels, streaks, goals, achievements, badges, milestones. Setting "Progression: Full / Minimal / Off". Off removes the Challenges section and XP UI entirely.

## 6. TOOLS (one section, clean categories, practical only)
- Typing utilities: WPM calculator, CPM calculator, accuracy calculator, word counter, character counter, text analyzer. ("Typing speed test" = a link to Type, not a second implementation.)
- Keyboard tools: keyboard tester, key visualizer, finger assignment guide, layout reference. (Keyboard heatmap = the Stats component, linked.)
- Text tools: custom text generator, text cleaner, text formatter, case converter, punctuation helper, typing text importer (paste or local .txt; never uploaded).
- Hindi / Indian typing: Hindi keyboard reference (Inscript and Remington), Unicode notes, government-exam-style practice (timed passage, gross/net speed, error rules; labelled "exam-style, not official"), KrutiDev↔Unicode converter only if a reliable mapping exists (label Beta; otherwise omit and document why). Hindi practice = link into Type/Learn.
- Productivity: Pomodoro, typing session timer, practice goal timer.

## 7. Advanced / Fun modes (under Type > More modes)
Ghost race (vs personal best, replayed from stored per-character timeline), Memory typing, Blind, Random capitalization, Difficult-word mode, Sudden death (= Master), Speed burst, Endurance. Morse-style challenge only if it can be done cleanly; otherwise omit.

## 8. Languages
English, Hindi, Hinglish. Language packs are data (words, quotes, layouts, lessons) so others can be added. Hindi layouts: **Inscript and Remington (Gail), switchable** — see `docs/06`.

## 9. Settings (center with progressive disclosure)
Typing · Display · Motion · Keyboard · Language · Practice · Accessibility · Themes · Data · Privacy · About. (No Sound category in this version.) Each category: common options first, "Show advanced" for the rest. Full list in `docs/03` (appearance) and below:
- Typing: default mode/time/words, punctuation, numbers, capitalization, stop on error, backspace, skip behavior, auto restart, caret behavior, Tab-restarts-test (default off).
- Display: font, size, text width, line height, letter spacing, text weight, cursor style/animation/width, alignment, text opacity, typed/untyped/error appearance, smooth scroll, keyboard visibility, stats visibility (WPM, accuracy, errors, timer, progress, word count), layout density, focus mode, distraction-free.
- Motion: animations, transitions, reduced motion, effects.
- Keyboard: physical layout (QWERTY default; others data-driven), on-screen keyboard, finger guide, key highlighting, key labels, Hindi layout.
- Language: default language, per-language options, Hindi layout.
- Practice: difficulty, adaptive on/off, target WPM, target accuracy, session length.
- Accessibility: high contrast, reduced motion, larger text, keyboard navigation, focus visibility, screen-reader labels.
- Data: history size, export, import, reset stats, reset settings, clear all.
- Privacy: plain statement (no ads, no tracking, no account, local data, no network calls).
- About: GoTyping, version, tagline, credits.

## 10. Product rules
- Typing screen stays clean even at maximum customization.
- Every feature has one logical home; every setting one category; every screen one purpose.
- A beginner understands it immediately; an expert can spend hours tuning it.


---
<!-- FILE: docs/02-ARCHITECTURE.md -->

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


---
<!-- FILE: docs/03-DESIGN-SYSTEM.md -->

# 03 — Design System

Feel: premium, calm, focused, fast, intentional, consistent. Think "paid professional tool", not a template. Do not clone any other typing site.

## Principles
- Typing text is the hero: large, high contrast, generous line height, centered, nothing competing.
- Few surfaces. Prefer whitespace, hairline borders and typography hierarchy over stacked cards and boxes.
- One accent color per theme. No big gradients, no random icons, no emoji as UI, no decorative illustrations.
- Subtle motion only (120–200 ms, ease-out). Everything respects reduced motion.
- Chrome fades away while typing (focus mode): nav and config dim, stats stay subtle.

## Tokens (CSS custom properties, applied from theme JSON; see `data/themes.json`)
bg, panel, text, muted, accent, onAccent, typed, untyped, error, caret, selection, keyBg, keyActive, button, border, shadow, chart1, chart2, chart3, progress.
Spacing scale 4/8/12/16/24/32/48/64. Radius: 6 (controls), 10 (panels) — keep radii restrained. One shadow level + none. Font sizes in rem so user scaling works.

## Themes
Presets (10): Paper (default light), Graphite (default dark), Midnight, Sand, Forest, Ocean, Rose, Mono, High Contrast Light, High Contrast Dark. Appearance mode: Light / Dark / System / High contrast. "System" maps to Paper/Graphite unless the user picked others.
**Custom theme builder** (Settings > Themes): start from any preset, edit every token with a color picker + hex field, live preview (a mini typing panel + keyboard + chart), contrast warnings (WCAG AA for text/bg, typed/untyped/error vs bg), name + save multiple custom themes, duplicate, delete, export/import theme JSON. Premium feel: a calm two-column editor with grouped swatches (Page, Text, Typing, Keyboard, Controls, Charts), not a wall of inputs.

## Typography
- UI: system UI stack. Typing: user-selectable from system stacks (System mono, System sans, System serif, plus any bundled font only if small, self-hosted, and justified). Devanagari must render well with a proper fallback stack (Noto Sans Devanagari / Mangal / system).
- Controls: font family, size (16–48 px typing text), text width (narrow/medium/wide/full), line height, letter spacing, typing text weight.

## Layout
Density: compact / comfortable / spacious. Width: centered / wide. Distraction-free: only text + minimal timer. Responsive breakpoints: <640 mobile, 640–1024 tablet, >1024 desktop. Touch targets ≥ 44 px.

## Shell
- Desktop: slim top bar (wordmark left, 7 sections center, quick theme toggle + settings right).
- Mobile: bottom bar (Type, Learn, Practice, Stats, More). More opens a simple sheet: Tools, Challenges, Settings.
- Page headers: one title + one-line purpose. Sub-navigation as segmented tabs, never nested sidebars.

## Type screen composition
1. Config summary pill (e.g. "time · 30 · english · punctuation off") → expands into grouped panel (Mode, Length, Language, Text options, Behavior). Collapses once typing starts.
2. Text area (3 visible lines default, smooth scroll, caret).
3. Optional live stats row (each stat toggleable).
4. Optional on-screen keyboard with finger guide (toggle).
5. Restart control + hint. Nothing else.

## Components to build once and reuse
Button, IconButton (inline SVG icon set, small and consistent), Segmented control, Toggle, Slider, Select, Field, Tabs, Sheet/Modal (sparingly), Toast, EmptyState, StatCard, ProgressBar, Chart (line, bar, calendar heat), Keyboard (layout renderer shared by on-screen keyboard, finger guide, heatmap, tester, layout reference).

## States
Every screen needs: loading (skeleton, not spinner walls), empty (helpful sentence + one action), error (plain language + retry). Provide them; do not leave blanks.

## Brand
Original wordmark "GoTyping" as inline SVG (simple, geometric, works at 24 px and as favicon). Provisional tagline in `src/brand.ts`: "Type better. Go further." (owner may change.)


---
<!-- FILE: docs/04-TYPING-ENGINE.md -->

# 04 — Typing Engine (exact definitions)

Pure TypeScript module in `src/core/engine`. Fully unit-tested. No DOM.

## Units
Text is processed as an array of **code-point units** after NFC normalization. In Hindi/Inscript each matra/halant/consonant is one keystroke/unit. Avoid ZWJ/ZWNJ in shipped word lists. Space is a unit. Newlines (code mode/paragraph) are units typed with Enter.

## Per-unit state
0 pending · 1 correct · 2 wrong (uncorrected) · 3 skipped.

## Counters
`keystrokes` = every character key press (not Backspace). `mistakes` = keystrokes that did not match the expected unit at that moment (counted when typed, even if corrected later). `correctKeystrokes = keystrokes − mistakes`.

## Metrics (all computed by `metrics.ts`)
- Elapsed minutes `m` = active typing time / 60000 (starts at first keystroke, excludes pauses).
- **WPM** = (final correct units, state=1, including correct spaces) / 5 / m.
- **Raw WPM** = keystrokes / 5 / m.
- **CPM** = correct units / m.
- **Accuracy %** = correctKeystrokes / keystrokes × 100 (100 when keystrokes = 0).
- **Errors** = mistakes (also expose uncorrected-at-end count separately).
- **Skipped chars** = units with state 3 (not counted as correct, not counted as mistakes).
- **Correct words** = words whose units are all state 1 at completion; **incorrect words** = typed words with any state 2 (skipped words are reported separately as skipped).
- **Consistency** = sample raw WPM once per second (≥ 3 samples); `max(0, round(100 × (1 − stdev/mean)))`.
- **Time**: for Time mode the configured duration; for Words/Quote/Lesson the actual elapsed.
Short-test guard: below 2 seconds or 5 keystrokes, show results but do not save to records.

## Input rules
- Typing the expected unit → state 1, advance. Typing a wrong unit → state 2, advance (**keep going**, default). With **stop on error**: do not advance; the unit stays pending and `mistakes++`.
- **Backspace**: modes `allow` (any), `word` (cannot go before the current word start), `off`. Backspace resets the previous unit to pending (or undoes a skip block). It never reduces `keystrokes`/`mistakes`.
- **Space mid-word = skip word**: remaining units of the current word → state 3, the space counts as a correct keystroke, caret jumps to the next word. Space at word start does nothing (counts as a mistake keystroke). **Undo skip**: Backspace right after a skip restores the whole skipped block. Setting: skip on/off.
- Words/Quote/Lesson tests end on the last unit. Time tests end when the timer reaches the duration; text is extended on demand (append ahead of the caret).
- Pause: only for Zen, Lessons and Practice (not time-trial tests). Window blur in a timed test: pause the clock and show "paused", resume on first key (setting).

## Modes (definitions, to avoid ambiguity)
- Time, Words, Quote, Custom text, Paragraph, Sentence, Words-only, Numbers, Punctuation, Mixed, Code: differ only by text generator + end condition.
- **Zen**: no target text; free typing, word/char count only, no WPM record.
- **Blind**: typed units show no correct/wrong feedback until the end; results normal.
- **Expert**: test fails if a word is completed (Space) with any uncorrected error.
- **Master** (= sudden death): test fails on the first mistake.
- **Memory**: show the words for a short time, then hide them; user types from memory; scored normally.
- **Ghost**: replay the saved personal-best timeline for the same config as a second caret.
- **Random capitalization**, **Difficult-word**, **Speed burst** (10–15 s sprints), **Endurance** (≥ 5 min): generator/end-condition variants.

## Events (for UI and future features)
`start`, `keystroke {unit, ok, t}`, `mistake`, `skip`, `undo`, `tick (≤4 Hz)`, `pause`, `resume`, `complete {metrics}`, `fail {reason}`. No audio now; events keep future sound possible.

## Per-key capture (for stats/adaptive)
On each keystroke record into a compact buffer (not storage): expected unit, typed unit, latency since previous keystroke, correct flag. At completion fold into aggregates (per key, per bigram, per trigram, per word, error pairs, per finger).

## Required unit tests (minimum)
Perfect run; run with corrected mistakes; run with uncorrected mistakes; stop-on-error; each backspace mode; skip + undo skip; word-mode end; time-mode end and text extension; Zen; Expert/Master fail rules; consistency with known series; Hindi sequence with halant/matras; zero-keystroke accuracy; WPM/raw/CPM against hand-computed numbers.


---
<!-- FILE: docs/05-LEARN-AND-ADAPTIVE.md -->

# 05 — Learn course and Adaptive practice

## Learn
Source outline: `data/curriculum-outline.json` (8 categories, 53 lessons; the outline is a starting point, you may refine ids/titles but keep the structure and the categories from the product spec).
- Each lesson: id, title, objective, type (how text is generated), keys, targetAccuracy, optional targetWpm, estimatedMinutes.
- Text generation is **original**: key-set drills (pseudo-words made only from allowed keys, 2–5 letters, no repeating the same key more than twice), n-gram drills, words from `data/words-*.json` filtered to allowed keys, own sentences/paragraphs (write a modest original set; you may extend later), capitalization/punctuation/number/symbol/Shift generators, code snippets (own examples).
- Lesson length: 60–90 s of typing or a fixed character count; short and focused. Show an "intro card" (finger positions, tip) before the first attempt of keys lessons.
- Pass rule: `accuracy ≥ targetAccuracy` and (if set) `wpm ≥ targetWpm`, minimum ~30 keystrokes. Record best accuracy, best WPM, attempts, completed flag. Stars/medals optional and subtle (none is fine).
- Progression: everything unlocked (the owner wants free navigation), but show a clear **Continue** recommendation (first unfinished lesson), per-category progress bars, and a "Practice weak areas" button after each lesson that opens Practice with that lesson's weak keys.
- Finger guide: on-screen keyboard highlights the next key and its finger (colors from tokens, not hard-coded), with hand outlines optional. Works for English layouts and for the selected Hindi layout.
- Hindi lessons use whichever Hindi layout is selected; text content stays Unicode and independent of layout.

## Adaptive engine (one engine, many profiles)
Data: aggregates from IndexedDB (keys, bigrams, trigrams, words, error pairs). Minimum data threshold (e.g. ≥ 30 samples per item) before an item is "scored"; below it, mix in generic text and tell the user plainly ("Not enough data yet").

Scores per item (0–1, higher = needs work):
- error rate (smoothed with a prior), 
- latency vs the user's own median (z-score, clipped), 
- recency decay (recent tests weigh more; half-life ≈ 10 sessions),
- combined `need = w_e·err + w_l·slow` with profile-specific weights.

Planner: weighted sampling without replacement from the word list (and synthetic n-gram drills), weight ∝ Σ need of the keys/bigrams/trigrams contained, with caps so one item cannot dominate (≤ 30 % of text), variety guard (no word repeated within 8), and a small share (~15 %) of easy words to keep rhythm. Deterministic with a seed for tests.

Profiles (entries in `profiles.ts`, not separate code paths):
- **Weak Keys**: weights error rate. **Slow Keys**: weights latency.
- **Error Recovery**: replays words/bigrams from the last N tests where mistakes happened.
- **Bigram Trainer / Trigram Trainer**: sample weak bigrams/trigrams, build drill tokens and real words containing them.
- **Difficult Words**: score words by historical error/latency plus a static difficulty heuristic (same-finger bigrams, rare letters, long words).
- **Accuracy Drill**: stop-on-error on, relaxed pace, target accuracy ≥ 98 %.
- **Speed Drill**: short bursts (10–15 s), common easy words, pace target.
- **Consistency Drill**: steady-rhythm target shown as a pacing line; scored on consistency.
- **Endurance Drill**: ≥ 5 min mixed text, track fatigue (accuracy/speed by minute).
Practice home shows a **recommended drill** (the largest current weakness) plus the profile list. Session length from Settings > Practice. After each drill, show what changed (e.g. "E improved by 8 ms").

## Required tests
Scoring math with fixed fixtures; sampler determinism with seed; cap/variety rules; threshold fallback; profile weight differences; no crash on empty history; Hindi code-point items.


---
<!-- FILE: docs/06-HINDI-LAYOUTS.md -->

# 06 — Hindi layouts (Inscript + Remington Gail)

The owner wants **both Inscript and Remington (Gail)** with a switch in Settings (Keyboard/Language > Hindi layout). Layouts are **data**; test text is Unicode and layout-independent.

## Rules (important)
1. **Do not invent key tables.** `data/inscript-legacy.json` was written from memory in an older project and is UNVERIFIED (the Z key in particular). Verify every key of both layouts against an authoritative source (the official Inscript chart as published by the Indian government/BIS/CDAC material, and a trusted Remington Gail chart). Cite the source in `docs/layout-sources.md`.
2. Each layout file has `verified: true|false` per key and a top-level `status`. Ship unverified keys only behind a visible "Beta" badge, and list them in the report. Do **not** claim a layout is correct if you could not verify it.
3. Resolve by physical key (`KeyboardEvent.code`) + Shift (+ AltGr if the layout needs it). Provide a table for digits, punctuation, Shift layer and any extra layers.
4. Remington Gail is typewriter-derived: some characters/conjuncts need different key sequences than Inscript. Model this honestly. If a conjunct needs multiple keystrokes, the engine counts each unit/keystroke consistently with the Unicode output. If some Remington behavior cannot be reproduced reliably with Unicode text, say so in the report and keep the layout in Beta.
5. Build a **layout test page** (Tools > Keyboard tester, Hindi mode) so the owner can press every physical key and see the produced character on both layouts, with a table of mismatches the owner can report.
6. Unit tests: every verified key resolves to the expected code point(s); typing a known sample word via keystroke sequence yields the exact Unicode string; halant/matra order; Shift layer.
7. Hindi on touch devices: use the on-screen GoTyping keyboard (taps → engine). Do not rely on Gboard.
8. Fonts: ensure Devanagari renders with correct matra placement (system fallback stack; test conjuncts like क्ष, त्र, ज्ञ, श्र).

## Government-exam-style practice (Tools)
Timed passage (10/15 min), Hindi and English, gross/net speed, error rules (full mistake / half mistake), result sheet. Label clearly: "exam-style practice, not official". Exam rules differ; the layout accepted by a specific exam is the user's responsibility to check.

## KrutiDev ↔ Unicode
Only if a reliable, tested mapping is available (no new dependency without a reason). Otherwise omit and write the reason in `docs/layout-sources.md`. Never ship a converter that silently corrupts text. Label Beta.


---
<!-- FILE: docs/07-ACCEPTANCE.md -->

# 07 — Acceptance checklist and required tests

## Functional
- [ ] Core typing works with physical keyboard, USB/OTG keyboard, English soft keyboard, and on-screen keyboard (incl. Hindi).
- [ ] WPM, raw WPM, CPM, accuracy, errors, consistency, skipped, correct/incorrect words are correct (unit tests with hand-computed fixtures).
- [ ] Restart, pause, skip, undo skip, backspace modes work.
- [ ] Time and word tests, presets and custom values work; text extends in Time mode.
- [ ] Quote, Custom text, Paragraph, Sentence, Numbers, Punctuation, Mixed, Code, Zen, Blind, Expert, Master, Memory, Ghost work as defined.
- [ ] English, Hindi (Inscript + Remington switch), Hinglish work. Hindi keys verified or clearly Beta.
- [ ] Learn: all categories open, lessons generate original text, pass/best/progress persist, Continue works, finger guide correct.
- [ ] Practice: all profiles work, recommended drill appears, empty-history fallback is clear.
- [ ] Stats: all drill-down pages work; heatmap and per-finger views correct; filters (language/mode/duration/lesson) work.
- [ ] Challenges: daily/weekly deterministic, XP/levels/streaks/achievements work; Progression Off removes them.
- [ ] Tools: every listed tool works; no duplicate implementations; KrutiDev only if reliable.
- [ ] Themes: 10 presets, appearance modes, custom theme builder (save/duplicate/delete/export/import), contrast warnings.
- [ ] Every setting changes behavior and persists; reset buttons work; export/import round-trips exactly.
- [ ] Keyboard navigation everywhere; visible focus; screen-reader labels; reduced motion and high contrast work; larger text works.
- [ ] Mobile, tablet, desktop layouts are clean (test 360 px, 768 px, 1280 px, 1920 px).
- [ ] PWA installs and works offline after first load.

## Non-functional
- [ ] No ads, no analytics, no third-party requests (verify in the network panel: same-origin only). No sound code or sound UI.
- [ ] No mandatory sign-in. Works offline for core features.
- [ ] No storage writes during a test.
- [ ] Typing latency: no dropped frames on a mid-range phone; no layout reads in the keystroke path.
- [ ] Lighthouse Performance ≥ 95 and Accessibility ≥ 95 (mobile profile); report the numbers.
- [ ] `npm run build` and `npm test` pass; no TypeScript errors; no console errors.
- [ ] No dead buttons, no placeholder screens, no duplicate features; loading/empty/error states exist.
- [ ] README (setup, scripts, structure, deploy to Vercel), CHANGELOG (progress) up to date.

## Required test suites
engine, metrics, layouts (Inscript, Remington, QWERTY resolver), text generators (seeded), adaptive scoring/sampler, xp/levels/streaks, store (settings migrations, history, aggregates), backup (export/import validation incl. corrupted file), theme contrast helper.


---
<!-- FILE: docs/08-LEGACY-REFERENCE.md -->

# 08 — Legacy reference (old Gku Type)

`legacy/` contains the old Android app handoff, progress history and the old single-file website. **Reference only.** GoTyping is a brand-new project: do not reuse the Gku Type name, logo or colors, and do not import legacy code.

## Reuse (ideas and content, reimplemented cleanly)
- Content: word lists (`data/words-*.json`, 638 EN / 513 Hinglish / 594 Hindi), sample quotes (small; expand with original/public-domain quotes).
- Logic ideas: space-skips-rest-of-word, undo skip on Backspace, accuracy formula, lesson pass rule (accuracy threshold, min keystrokes), weak-key tallying, per-second series for the result graph, day-streak from stored dates.
- UX ideas: keep-going default with optional stop-on-error, finger guide, "New best" only after the first test, low-motion mode, Reset all data, Copy result.

## Known weaknesses of the old version (fix, do not preserve)
- One 1,500-line file; no tests; unverified Hindi key map (Z key added late, untested).
- Hindi/English soft-keyboard typing incomplete; on-screen Hindi keyboard missing.
- Tiny stats (session list capped at 200, no per-key/bigram latency, no heatmap).
- Settings were basic; no theme builder; no export/import.
- Never tested in a real browser by the assistant that built it.

## Legacy files
- `legacy/gku-type-web-index.html` — final single-file website.
- `legacy/gku-web-WEB-HANDOFF.md`, `gku-app-HANDOFF.md`, `gku-app-PROGRESS-history.md` — decisions and history.
- (The Android Kotlin starter is not included in this pack.)
