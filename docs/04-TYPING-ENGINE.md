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
