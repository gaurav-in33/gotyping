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
