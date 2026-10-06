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
