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

## 2. Touch & mobile input

- [ ] **On-screen keyboard taps** — In Type, turn on "Show on-screen
  keyboard" (Settings → Display) and actually tap keys with a finger on a
  real touchscreen, not a mouse click. We fixed a real bug this session
  where tapping a Shift-only highlighted key (common in Hindi InScript)
  typed the wrong character — this is now covered by automated DOM tests
  that simulate clicks, but a real finger-tap on a real screen (different
  event timing/hit-testing) has not been done.
- [ ] **Native mobile keyboard typing** — Type a full test using the
  phone's own keyboard (autocorrect/autocomplete/swipe-typing all OFF, and
  then once with them ON to see how badly swipe-typing interacts with a
  typing test — expected to be bad, just confirm it's not silently
  corrupting stats).
- [ ] **Virtual keyboard overlap** — When the phone's keyboard opens, check
  that it doesn't cover the text being typed or the input focus area, and
  that the page doesn't jump around oddly when the keyboard opens/closes.
- [ ] **Small tap targets** — On-screen keyboard keys, Settings toggles,
  and the bottom nav bar should be comfortably tappable with a thumb (no
  accidental taps on the wrong adjacent control).

## 3. Layout & visual (real viewports)

- [ ] **Breakpoints** — Check the layout at phone portrait (~360–430px
  wide), tablet (~768px), small laptop (~1280px) and a large desktop
  (~1920px). Nothing in this sandbox can render a real viewport, so this
  has only been reviewed as CSS source, never seen rendered.
- [ ] **Safe areas / notches** — On an iPhone with a notch/Dynamic Island,
  confirm the top/bottom bars don't collide with the notch or the home
  indicator bar.
- [ ] **Orientation change** — Rotate the phone mid-test; confirm nothing
  breaks (timer, text layout, on-screen keyboard).
- [ ] **System dark/light mode** — Switch the phone's OS theme while the
  app is set to "System" appearance (Settings → Theme) and confirm it
  actually follows the OS, live, without needing a reload.

## 4. Performance

- [ ] **Typing latency on a mid-range phone** — Type a fast 60-second test
  and watch for input lag or dropped frames, especially with animations
  on and with the on-screen keyboard visible at the same time. We verified
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
  control is announced with a sensible label, especially the on-screen
  keyboard, the live stats toggles, and the theme builder's color pickers.
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
