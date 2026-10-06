**Repository isolation:** Work ONLY in the GitHub repository named `gotyping`. Do not read, modify, delete or push to any other repository, and do not create new repositories. If `gotyping` is not accessible, stop and tell the owner.

# STEP 2 — Learn + Practice + Stats

Read `AGENT.md` and re-read `docs/01`, `docs/04`, `docs/05`, `docs/06`, `docs/07`. Inspect the repo (Step 1 is complete). Update `PLAN.md` for this step first.

## Scope
1. **Learn** (`docs/05`, `data/curriculum-outline.json`): course home (categories with progress), lesson screen (intro card, objective, target, attempt, result with pass/fail, retry, continue, "practice weak areas"), original text generators for every lesson type, finger guide, persistence of best/attempts/completed in IndexedDB. English, Hindi (selected layout) and Hinglish courses.
2. **Practice** (adaptive engine): `core/adaptive` profiler + planner + profiles (Weak Keys, Slow Keys, Error Recovery, Bigram, Trigram, Difficult Words, Accuracy, Speed, Consistency, Endurance). Recommended drill on the Practice home, session length from settings, "what changed" summary after a drill, graceful low-data fallback.
3. **Stats** (`docs/01` section 4): overview with summary cards and drill-down pages (Progress charts, Keys heatmap + per-key table, Fingers/hands, Errors, Activity calendar, Records, History). Filters by language, mode, duration, lesson. Hand-written SVG/canvas charts (lazy-loaded). Heatmap built as a reusable keyboard component (it will also be used in Tools).
4. Settings additions: Practice category (difficulty, adaptive on/off, target WPM/accuracy, session length); stats-related Data options (history cap, reset stats).

## Constraints
Same as `AGENT.md`. No sound. No new dependencies without a CHANGELOG reason. One implementation per feature. Lessons must be original (no TypingClub text). Aggregates update once per finished test.

## Tests required
Lesson generators (allowed-keys only, determinism with seed), pass rules, adaptive scoring and sampler (fixtures), aggregate math, stats filters, history cap, store migrations if schema changed.

## Definition of done
Build and tests pass; every Learn category completes end-to-end; Practice produces visibly different text per profile based on seeded fake history (include a dev-only seed script, not shipped in the UI); Stats pages render correctly with empty, small and large histories (generate 5,000 fake tests to check performance); mobile and desktop layouts clean; Vercel preview deployed.

## Report format
Same as Step 1 (what works, not built, not tested, verification notes, preview URL, one recommended default). Then **stop and wait for Step 3.**
