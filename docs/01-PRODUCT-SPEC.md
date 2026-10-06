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
