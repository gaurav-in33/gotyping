# Test on device

This sandbox has no real browser, no touchscreen, and no phone — it runs
headless Node + jsdom only. Everything below was deliberately **not**
claimed as verified in `docs/07-ACCEPTANCE.md` because it genuinely cannot
be checked from here. Go through this list on your own phone (and one
desktop browser) before you consider the app done. Each item says what to
do and what "pass" looks like.

## How to test

```
npm run build
npx serve dist        # or any static file server
```

Open the printed URL on your phone (same Wi-Fi) and in a desktop browser.
Use that build for everything below, not `npm run dev` — the service
worker and manifest only matter in the production build.

## 1. PWA install & offline

- [ ] **Install prompt** — On Android Chrome, visit the site twice (or wait
  a bit); you should get an "Install app" / "Add to Home Screen" prompt or
  be able to trigger one from the browser menu. On iOS Safari there is no
  automatic prompt — use Share → "Add to Home Screen" manually. Confirm the
  icon and name look right on the home screen.
- [ ] **Launch from home screen** — Open the installed icon. It should open
  in standalone mode (no browser address bar), not a browser tab.
- [ ] **Offline after first load** — With the app open once (so the service
  worker has cached it), turn on Airplane Mode, then fully close and
  reopen the app. It should still load and let you type a test. We
  verified the service worker file is syntactically valid and precaches
  the right files from a clean build, but never an actual device with the
  network physically cut.
- [ ] **Update flow** — Ship a trivial change, rebuild, reload the already-
  installed app twice; it should pick up the new version (possibly after
  a prompt/second reload) rather than being stuck on stale cached code.

## 2. Phone keyboard input — Hindi via English QWERTY (required)

GoTyping Hindi mode maps the **phone's English QWERTY characters** through
its selected physical Hindi table. Do **not** choose Gboard's Hindi layout
for this main test: that is a separate direct-Devanagari fallback path.

### Android Gboard setup

1. In Android **Settings → System → Keyboard → On-screen keyboard → Gboard →
   Languages**, add/select **English (US) → QWERTY**. Keep it selected while
   testing GoTyping Hindi.
2. In **Gboard → Text correction**, turn **Auto-correction OFF**,
   **Show suggestion strip OFF**, and **Spell check OFF**. Also turn
   **Auto-capitalisation OFF** (on some Gboard versions this is under
   **Text correction → Auto-capitalization**). Turn **Glide typing OFF** for
   this exact test so a swipe cannot insert a word at once.
3. In GoTyping, open **Settings → Language and keyboard**, choose
   **हिंदी (Hindi)** and **Hindi — InScript**. Leave **Tap guide to type OFF**.
   The guide is only a visual reference; type on Gboard.
4. Open **Tools → Phone keyboard test**, tap its input, and type the checks
   below. This page records `keydown`, `beforeinput`, `input`, and composition
   events so an Android `keyCode 229` issue can be reported with evidence.

### Exact checks

- [ ] **Lower/Shift mapping** — With English QWERTY Gboard: type `k`; Final
  units must show **क**, never `k`. Use Gboard Shift then `k`; it must show
  **ख**, never `K` or क. This specifically verifies auto-capitalisation did
  not make the first key wrong.
- [ ] **Matra / no extra text** — Type `k`, then `e`; Final units must read
  **का**. There must never be a visible/recorded `k`, an extra क, or a second
  matra.
- [ ] **Conjuncts** — Type the literal English-QWERTY sequences `k d <`,
  `l d j`, `p d }`, and `M d j` (without the displayed spaces). They must
  produce **क्ष**, **त्र**, **ज्ञ**, **श्र** respectively.
- [ ] **Space, digits, punctuation, backspace** — Check a mid-word Space
  performs the configured skip-word behavior. Check `1` produces **१** and
  `>` produces **।** in InScript. Press Backspace and confirm exactly one
  unit is removed.
- [ ] **No double count** — Watch the raw-event table. One Gboard tap may
  emit `beforeinput` plus `input`, or composition events, but only **one**
  final unit may be added for it. A `keydown` with `Unidentified` / 229 must
  not cause a second unit.
- [ ] **Direct Hindi IME fallback** — Now select a Hindi/Devanagari Gboard
  layout, type **क** then **ा**, and confirm the final units stay **का**.
  They must not be remapped through English QWERTY.
- [ ] **iOS** — With iOS English QWERTY, disable Auto-Capitalization,
  Predictive, and Auto-Correction in **Settings → General → Keyboard**. Run
  the same `k`, `K`, `k e`, conjunct, and backspace checks. Report the raw
  event rows from Phone keyboard test if a result differs.

### Guide and viewport checks

- [ ] **Display-only by default** — In Type, Learn and Practice, the compact
  keyboard guide is shown by default. It shows normal + small Shift glyphs,
  colors the next key by finger, and highlights both Shift and the target
  key when Shift is needed. Tapping it must not type and must not dismiss or
  change the phone keyboard.
- [ ] **Optional legacy tap behavior** — Enable **Settings → Language and
  keyboard → Tap guide to type**. A highlighted guide key may now type its
  target unit. Turn it OFF again and confirm it returns to display-only.
- [ ] **Global toggle** — Use **Guide: Hide** on one typing screen; open a
  different typing screen and confirm it stays hidden. Use **Guide: Show**
  there and confirm the preference returns globally. Also check the same
  English guide preview in Settings.
- [ ] **Virtual keyboard overlap** — Open Gboard on a 360–430px phone. The
  target text (including its next line), compact guide and Gboard should fit
  together. In a very short landscape viewport the guide may auto-collapse,
  but its **Guide: Show** button must remain available.
- [ ] **Small tap targets** — Settings toggles, Guide: Show/Hide, and the
  bottom navigation should be comfortably tappable with a thumb.

## 3. Layout & visual (real viewports)

- [ ] **Breakpoints** — Check the layout at phone portrait (~360–430px
  wide), tablet (~768px), small laptop (~1280px) and a large desktop
  (~1920px). Nothing in this sandbox can render a real viewport, so this
  has only been reviewed as CSS source, never seen rendered.
- [ ] **Safe areas / notches** — On an iPhone with a notch/Dynamic Island,
  confirm the top/bottom bars don't collide with the notch or the home
  indicator bar.
- [ ] **Orientation change** — Rotate the phone mid-test; confirm nothing
  breaks (timer, text layout, keyboard guide).
- [ ] **System dark/light mode** — Switch the phone's OS theme while the
  app is set to "System" appearance (Settings → Theme) and confirm it
  actually follows the OS, live, without needing a reload.

## 4. Performance

- [ ] **Typing latency on a mid-range phone** — Type a fast 60-second test
  and watch for input lag or dropped frames, especially with animations
  on and with the keyboard guide and native phone keyboard visible at the same time. We verified
  by code reading that no per-keystroke DOM layout reads happen in the hot
  path, but actual frame timing can only be measured on real hardware.
- [ ] **Lighthouse (mobile profile)** — Run Lighthouse from Chrome DevTools
  (remote-debug the phone, or just run it against the desktop build) for
  Performance and Accessibility scores. This sandbox could not install any
  Chromium to run Lighthouse at all — there are no numbers yet, not even
  desktop ones.

## 5. Accessibility (needs assistive tech)

- [ ] **Screen reader pass** — Go through Type, Settings, Stats and
  Practice with TalkBack (Android) or VoiceOver (iOS/macOS). Confirm every
  control is announced with a sensible label, especially the keyboard guide,
  the live stats toggles, and the theme builder's color pickers.
- [ ] **Keyboard-only navigation** — On a desktop browser with a physical
  keyboard only (no mouse), Tab through every screen and confirm there is
  always a visible focus ring and a sane tab order. `aria-label`s exist in
  the code and were spot-checked by reading, but a full manual tab-order
  walk was not done.
- [ ] **Reduced motion / high contrast / larger text** — Turn each on at
  the OS level (not just the in-app Settings toggle) and confirm the app
  respects the OS-level `prefers-reduced-motion` / `prefers-contrast`
  media queries too, not only its own toggles.

## 6. Browser-permission-gated features

- [ ] **Clipboard copy buttons** — "Copy result" (Type → Result) and the
  Tools → Text Tools copy button both call `navigator.clipboard.writeText`
  and silently fall back (text stays selectable) if permission is denied.
  Confirm on a real mobile browser that the permission prompt (if any)
  appears sensibly and the fallback is actually usable by hand.
- [ ] **Settings export/import file dialogs** — Settings → Data → Export
  downloads a JSON file; Import opens a file picker. Confirm both work
  through a real mobile "Files"/share sheet, not just in a desktop browser
  (mobile file pickers and downloads behave differently per OS/browser).
- [ ] **IndexedDB persistence on iOS Safari** — iOS Safari has historically
  evicted IndexedDB/LocalStorage after periods of inactivity or low
  storage more aggressively than other browsers. Use the app for a few
  days on an iPhone and confirm history/stats/lesson progress survive.

## 7. Things fixed this session that deserve a real re-check anyway

These were fixed and covered by automated tests, but automated tests run
in jsdom, not a real engine — a quick manual pass is cheap insurance:

- [ ] **Code typing mode** (Type → More modes → Code) — pick JavaScript,
  then Python, type a full test of each, and confirm the on-screen text
  renders monospaced code sensibly (indentation, braces, keywords) rather
  than looking like garbled plain text.
- [ ] **Auto restart** (Settings → Typing → "Auto restart") — turn it on,
  finish a short test, and confirm a new test actually starts on its own
  about 1.5 seconds later, and that it's not jarring/too fast to read the
  result first.
- [ ] **"Words" live stat** (Settings → Display → Live stats → Words) —
  turn it on and confirm a running word count appears during a test and
  looks right.
- [ ] **Adaptive practice toggle** (Settings → Practice → "Adaptive
  practice") — turn it off, do a Practice drill, and confirm the words
  feel generic/random rather than obviously repeating your personal weak
  keys; turn it back on and confirm the drill noticeably reuses your weak
  spots again.
- [ ] **Learn lesson grid column counts** (Learn screen) — the lesson tiles
  are meant to show 2 columns on a phone, 3–4 on a tablet, 5–6 on a
  desktop, and stay square without clipping any title text. This is pure
  CSS (`src/features/learn/learn.css`) reviewed by reading only — jsdom
  reports every layout dimension as 0, so the actual column counts and
  tile squareness have never been seen rendered. Also confirm every
  lesson tile opens (no lesson is locked any more — this was removed on
  purpose) and that the "Continue" badge lands on a sensible lesson.

## What is explicitly out of scope here

Remington layout and the KrutiDev↔Unicode converter are intentionally
**not** on this list: per `docs/layout-sources.md`, Remington ships marked
Beta and KrutiDev conversion was intentionally omitted because no
trustworthy source mapping was found — both are documented limitations,
not pending device tests.
