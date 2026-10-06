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
