# 05 — Learn course and Adaptive practice

## Learn
Source outline: `data/curriculum-outline.json` (8 categories, 53 lessons; the outline is a starting point, you may refine ids/titles but keep the structure and the categories from the product spec).
- Each lesson: id, title, objective, type (how text is generated), keys, targetAccuracy, optional targetWpm, estimatedMinutes.
- Text generation is **original**: key-set drills (pseudo-words made only from allowed keys, 2–5 letters, no repeating the same key more than twice), n-gram drills, words from `data/words-*.json` filtered to allowed keys, own sentences/paragraphs (write a modest original set; you may extend later), capitalization/punctuation/number/symbol/Shift generators, code snippets (own examples).
- Lesson length: 60–90 s of typing or a fixed character count; short and focused. Show an "intro card" (finger positions, tip) before the first attempt of keys lessons.
- Pass rule: `accuracy ≥ targetAccuracy` and (if set) `wpm ≥ targetWpm`, minimum ~30 keystrokes. Record best accuracy, best WPM, attempts, completed flag. Stars/medals optional and subtle (none is fine).
- Progression: everything unlocked (the owner wants free navigation), but show a clear **Continue** recommendation (first unfinished lesson), per-category progress bars, and a "Practice weak areas" button after each lesson that opens Practice with that lesson's weak keys.
- Keyboard guide: display-only physical keyboard highlights the next key and its finger (colors from tokens, not hard-coded), plus Shift when needed. Works for English layouts and for the selected Hindi layout; optional tap-to-type remains off by default.
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
