**Repository isolation:** Work ONLY in the GitHub repository named `gotyping`. Do not read, modify, delete or push to any other repository, and do not create new repositories. If `gotyping` is not accessible, stop and tell the owner.

# STEP 3 — Challenges + Tools + Premium Settings + Fun modes + PWA + Polish

Read `AGENT.md` and re-read all docs. Update `PLAN.md`. This is the final step: afterwards **no placeholder screens may remain anywhere**.

## Scope
1. **Challenges**: Daily (date-seeded), Weekly, Speed Ladder, Accuracy, No-Mistake, Endurance, Personal Best; XP, levels, streaks (with optional grace day), goals, achievements (about 30 in `content/achievements.json`), milestones. Setting "Progression: Full / Minimal / Off" (Off removes the Challenges section and XP UI).
2. **Tools** (`docs/01` section 6): all listed tools, grouped in clean categories, one implementation per feature (heatmap = Stats component; speed test = link to Type). Hindi tools incl. keyboard reference for both layouts, layout test page, exam-style practice; KrutiDev converter only if reliable (otherwise omit and document).
3. **Fun/advanced modes** under Type > More modes: Code typing (own snippets, several languages), Memory, Ghost race, Random capitalization, Difficult-word, Speed burst, Endurance (Morse only if clean).
4. **Premium settings**: custom theme builder (`docs/03`: grouped swatches, live preview, contrast warnings, save/duplicate/delete, export/import), full typography and layout controls, typing-screen customization (all toggles in `docs/01` section 9), extra keyboard layouts (data-driven, e.g. Colemak, Dvorak) if clean, accessibility options, progressive disclosure ("Show advanced").
5. **PWA/offline**: manifest, icons, service worker, update prompt, verify offline use; verify zero cross-origin requests.
6. **Polish**: responsive QA at 360/768/1280/1920, loading/empty/error states everywhere, keyboard navigation and focus audit, screen-reader labels, reduced motion and high contrast verified, performance audit (Lighthouse mobile Perf and A11y ≥ 95, report numbers), console clean, dead-button sweep, README/CHANGELOG final, delete nothing in `legacy/` without telling the owner (recommend removing it from the repo once done).

## Tests required
xp/levels/streaks/achievements, daily/weekly seeding, text tools (case/clean/format/counters), calculators, theme contrast helper, theme import/export validation, backup round-trip with all stores, Ghost timeline replay.

## Definition of done
Every item in `docs/07-ACCEPTANCE.md` checked (or explicitly listed as not verifiable here, with why). Build and tests pass. Production deployed on Vercel. Final report includes a feature-by-feature checklist, Lighthouse numbers, Hindi layout verification status, known limitations, and recommended next ideas. No sound, no tracking, no sign-in.

## Report format
Same as before, plus the full acceptance checklist with checked/unchecked items.
