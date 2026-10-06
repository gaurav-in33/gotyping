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
4. Compact display-only keyboard guide with finger cues; global Show/Hide, with optional tap-to-type disabled by default.
5. Restart control + hint. Nothing else.

## Components to build once and reuse
Button, IconButton (inline SVG icon set, small and consistent), Segmented control, Toggle, Slider, Select, Field, Tabs, Sheet/Modal (sparingly), Toast, EmptyState, StatCard, ProgressBar, Chart (line, bar, calendar heat), Keyboard (layout renderer shared by the keyboard guide, finger guide, heatmap, tester, layout reference).

## States
Every screen needs: loading (skeleton, not spinner walls), empty (helpful sentence + one action), error (plain language + retry). Provide them; do not leave blanks.

## Brand
Original wordmark "GoTyping" as inline SVG (simple, geometric, works at 24 px and as favicon). Provisional tagline in `src/brand.ts`: "Type better. Go further." (owner may change.)
