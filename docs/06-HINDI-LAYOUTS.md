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
