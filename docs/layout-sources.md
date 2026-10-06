# Keyboard layout sources and verification status

`docs/06-HINDI-LAYOUTS.md` rule 1 says: **do not invent key tables**, verify every key
against an authoritative source, and cite it here. This file records exactly what has and
has not been verified, so nothing ships with a false claim of correctness.

> **Session note:** Step 2 was built once before (local commit, never pushed) and the exact
> working notes from that investigation were lost when the session ended. This file reflects
> a **fresh** verification pass done for this rebuild, not a recovery of the old one. Where
> the owner remembered specific disputed keys (Z, Backslash, Shift+N, the number row) but the
> fresh research did not reproduce a conflict for one of them, that is written below rather
> than silently dropped.

## QWERTY (Latin) — `verified: true`

`src/core/layouts/qwerty.ts`. Standard US ANSI layout; cross-checked at runtime because for
Latin scripts the resolver trusts `KeyboardEvent.key` (the OS has already applied whatever
layout the user has installed) — the table itself is only used for on-screen geometry,
finger mapping and the heatmap, so a user on AZERTY or Dvorak still types correctly.

## Hindi InScript — per-key verified, layout stays **Beta**

### Sources used this session

1. **Windows `KBDINDEV.DLL`** ("Devanagari - INSCRIPT"), the literal InScript keyboard driver
   shipped on every Windows PC and the default layout for Hindi, Konkani and Sanskrit
   (`KLID 00000439`). Read via:
   - <http://kbdlayout.info/KBDINDEV/> (overview, scancodes, virtual keys, KLC/XML export)
   - <https://learn.microsoft.com/en-us/globalization/keyboards/kbdindev.html> (per-state key
     images with Unicode code point + character name captions — used as the primary source
     because it is unambiguous, unlike scraped glyphs)
2. **X11 `xkeyboard-config` "in(deva)"** — the default Linux/X11 Devanagari InScript driver:
   <http://ftp.netbsd.org/pub/NetBSD/NetBSD-current/xsrc/external/mit/xkeyboard-config/dist/symbols/in>
   (`xkb_symbols "deva"` block). Independent implementation of the same government standard,
   used to cross-check Windows rather than trust one vendor.
3. **Wikipedia, "InScript keyboard"** — <https://en.wikipedia.org/wiki/InScript_keyboard> —
   background: standardised by the Government of India (DOE, 1986, revised 1988), built into
   Windows 2000+, most Linux and macOS.
4. **Community charts**, used only to sanity-check, never as the primary source (they are not
   government or OS material, and sometimes disagree with each other and with 1–2):
   <https://jptyping.com/blog/hindi-inscript-keyboard-complete-guide>,
   <https://jptyping.com/inscript-keyboard>, <https://anykeyboard.io/languages/indic/hindi-devanagari-inscript-keyboard>.
5. `data/inscript-legacy.json` (now superseded by `data/inscript-verified.json` /
   `src/content/inscript-verified.json`) — the original unverified, from-memory table from
   the old project. Kept in the repo as a historical reference only (docs/08); no longer used
   by `src/core/layouts/hindi.ts`.

### What changed

- Letter rows (QWERTYUIOP / ASDFGHJKL / ZXCVBNM, both shift states), the comma/period base
  values, and the `[`/`]` keys all **matched exactly** across sources 1 and 2 — these are
  shipped as `verified: true`.
- Added `Backslash` (ॉ / ऑ), `Minus` (- / ः) and `Equal` (ृ / ऋ), which the old legacy table
  was simply missing. Sources 1 and 2 agree, so these ship `verified: true` (Backslash is the
  one exception — see below).
- **Fixed a real bug** carried over from the legacy file: `Slash` shift produced the same
  character as its base (`य`/`य`), clearly a copy/paste error. Sources 1, 2 and 4 all agree
  the shift value is य़ (U+095F, YYA with nukta). Corrected and shipped `verified: true`.
- Per-key `verified: boolean` was added to every mapped key (`KeyCap.verified` in
  `src/core/layouts/qwerty.ts`), not just a single layout-level flag, per docs/06 rule 2.

### The 14 keys flagged `verified: false` (the owner's "14 disputed keys")

| Keys | Why |
| --- | --- |
| `Digit1`–`Digit9`, `Digit0` (10) | **Genuine, confirmed disagreement between the two authoritative OS drivers.** Windows `KBDINDEV.DLL` types plain ASCII `1`–`0` on the base layer (Devanagari numerals need OS-level digit-shaping, not the keyboard driver). The X11 `in(deva)` driver types the Devanagari digit (e.g. `U0967` १) directly on the base layer, with ASCII digits moved to the `AltGr` layer. The shipped legacy table (and most community/exam-prep teaching charts) follow the X11/teaching convention. We kept the **existing shipped behaviour** (Devanagari digit on the base layer) rather than silently change what users already see, but flagged all ten keys `verified: false` so the Keyboard tester surfaces them for the owner to confirm against whichever IME they actually use. |
| `Period` (`.`) | Shift value: Windows and X11 **agree** with each other (। U+0964, single danda) and that is what is shipped — but several community exam-prep charts (e.g. jptyping.com) show the double danda (॥ U+0965) instead. Flagged because a real-world exam IME might follow the community convention rather than the OS driver. |
| `KeyZ` | The legacy file's own status note said this key was "added late and unverified". It now cross-checks cleanly against both Windows and X11 (ॆ / ऎ), but it stays Beta until a human presses it on real hardware (docs/06 rule 5) rather than being silently promoted to fully-trusted. |
| `Backslash` | Did not exist in the legacy table at all; added from Windows/X11 (both agree: ॉ / ऑ). Flagged because the owner's prior (lost) session reported this exact key as disputed, and that investigation could not be recovered — kept conservative rather than assume the discrepancy was resolved. |
| `KeyN` | Same situation as Backslash: the owner's prior session flagged Shift+N as disputed. This fresh pass found Windows, X11 **and** a community chart all agreeing on ळ (LLA) — no live conflict could be reproduced — but it is kept Beta rather than quietly declared resolved, since the original finding could not be recovered to confirm what the disagreement actually was. |

All 14 are listed together in `INSCRIPT_DISPUTED_CODES` (`src/core/layouts/hindi.ts`) and
rendered with an individual "unverified" mark in Tools → Keyboard tester, in addition to the
layout-wide Beta badge.

### Still to do (carried to Step 3)

1. Have the owner press every key on real InScript-capable hardware/IME via the Keyboard
   tester and report mismatches — per-key `verified` here means "cross-checked against a
   cited software source", not "confirmed on physical hardware".
2. If the owner's exam uses a specific vendor's IME (e.g. a government exam portal's own
   applet), check its chart specifically — InScript implementations can still drift in minor
   ways between vendors, as shown by the digit-row disagreement above.

## Hindi Remington (Gail) — ships in **Beta**, mostly unmapped

Per the owner's instruction: *"Remington ka koi bharosemand chart nahi mila to use Beta
rakho"* (no reliable chart was found, so keep it in Beta) — the layout exists and is
selectable, but almost nothing is populated, by design.

**What was checked:** unlike InScript, Remington (Gail) has no government/BIS standard and
no OS-shipped keyboard driver to cross-check against. Community sources found:

- <https://gurukultypingskill.com/remington-gail-keyboard-layout> — interactive chart, but
  the published text mixes base/shift/finger-guide labels and multi-key conjunct sequences
  in a way that cannot be parsed back into a key table without risking silent corruption
  (docs/06 rule 1 explicitly forbids this).
- <https://krutidev-to-unicode.com/mangal-keyboard-layout/> — chart is image-only, not
  machine-readable text.
- <https://www.easyhindityping.com/typing/remington-gail-hindi-typing>,
  <https://www.typingwale.com/typing-test/hindi-typing/remington-gail> — describe the layout
  and its exam usage (CPCT, GAIL, some High Court exams) but do not publish a full,
  unambiguous per-key chart either, and some pages conflate the legacy **Kruti Dev / DevLys**
  font-remap layout (non-Unicode, different exams) with the **Mangal Unicode Remington/GAIL**
  layout (what GoTyping would need) — a real, documented source of confusion in the wild.

**What shipped:** only the digit row (`Digit0`–`Digit9` → plain ASCII `0`–`9`), which every
source agrees on, all flagged `verified: false` anyway out of caution. Every other key is
left unmapped (blank on the on-screen keyboard and in the Keyboard tester) rather than
guessed. The on-screen Beta note and the Settings hint say this explicitly, and Remington is
not offered as a layout for live Learn/Type Hindi sessions yet — only as a reference entry in
Settings and the Keyboard tester — so nobody can accidentally practise a wrong mapping.

Revisit when a citable source (official GAIL exam notification appendix, or a Remington
keyboard driver shipped by an OS/IME vendor) is available.

## KrutiDev ↔ Unicode — not shipped

Same reasoning as Step 1 (docs/06, final section): a converter is only worth shipping with a
mapping that has been tested against real documents. Still omitted after a second search pass
in Step 3 — see "Step 3 revisit" below for exactly what was checked and why it still fails the
reliability bar.

## Step 3 revisit: Remington and KrutiDev, searched again

Per the owner's Step 3 instruction ("mere chart se bhar sako to bharo" — fill Remington in if a
trustworthy chart turns up, otherwise keep it Beta), both gaps above were searched again before
any new Tools/Settings work was built. Nothing found this pass clears the bar set in Step 2, so
both decisions are **unchanged**:

- **Remington (Gail)** stays shipped with only the digit row mapped, `verified: false`, and
  excluded from live Learn/Type Hindi sessions (`isFunctional()` in
  `src/core/layouts/hindi.ts` requires ≥20 mapped keys; Remington has 10).
- **KrutiDev ↔ Unicode converter** stays omitted entirely — not even as a Beta feature — because
  omission was the owner's own fallback instruction when no reliable mapping exists, and nothing
  found changes that.

Sources checked this pass, and why each still fails rule 1 (no inventing a key table from an
unreliable or unparsable source):

- A government (CRPF) recruitment PDF that references a Remington/GAIL typing test: describes
  the *exam format* (duration, word count, qualifying speed) but does not publish a key-by-key
  layout chart at all — nothing to extract.
- `gurukultypingskill.com`'s Remington/GAIL page (re-checked): still the same interactive-widget
  chart identified in Step 2, where base/shift/finger-guide labels and multi-key conjunct
  sequences are interleaved in the rendered text in a way that cannot be parsed back into a
  `KeyCap` table without a real risk of silently transposing two keys.
- `easyhindityping.com`'s Remington/GAIL page (re-checked, including the page's first content
  chunk specifically in case earlier reads had missed a clean table further down): prose
  description and practice links, no machine-readable per-key chart.
- `smarttypingsolution.com` (new this pass): markets a typing-tutor product and shows marketing
  screenshots of its own software's keyboard overlay, not a citable, independent layout
  reference — the image is also not a primary/authoritative source (not government, not an OS
  driver), so even a successfully-read chart from it would not have cleared rule 1's bar.

None of the above is a complaint about the sources existing — Remington/GAIL and KrutiDev are
both real, widely-used conventions in Indian government typing exams. The problem is specific
to what Step 3 can verify without guessing: there is no government standard document or
OS-shipped keyboard driver for either (unlike InScript, which has both — see above), so every
available source is either incomplete, image-only, or structured in a way that cannot be
machine-read without risking a silently wrong character. Shipping a guess would fail a real
exam-taker in a way they would not discover until the exam itself; staying Beta/omitted fails
loudly and visibly instead (Beta badge, Settings hint, Tools empty-state), which is the
tradeoff AGENT.md's and docs/06's verification rule explicitly asks for.

**What would unblock this:** an official GAIL/CPCT/government exam notification appendix that
publishes the Remington key table directly, or a Remington/KrutiDev keyboard driver shipped by
an OS or IME vendor (the same kind of primary source that made InScript shippable). Revisit
again whenever one surfaces — the `data/remington-beta.json` + `REMINGTON` layout structures
already exist and are ready to receive more verified keys without any code changes.

## Engine-level Devanagari correctness (independently verified)

Independently of the key tables, the typing engine handles Devanagari text correctly:

- text is NFC-normalized and split into code-point units, so each consonant, matra and
  halant is its own keystroke (`tests/engine.test.ts`);
- conjuncts such as क्ष / त्र / ज्ञ are typed and scored unit by unit;
- a wrong matra is counted as exactly one mistake.

So Hindi *text* (what Learn/Practice/Type show and score) is correct today, independent of
whether a given physical key mapping is fully verified.

## Colemak / Dvorak (Step 3, Latin) — `verified: true`, reference-only

`src/core/layouts/alt-latin.ts`. Standard ANSI Colemak and Dvorak tables (Wikipedia:
"Colemak", "Dvorak keyboard layout" — both are long-settled, unambiguous public standards with
no competing versions to reconcile, unlike Remington).

These are safe to mark `verified: true` on a much lower bar than the Hindi layouts above for a
structural reason, not a documentation one: `core/layouts/resolver.ts` **trusts
`KeyboardEvent.key` for Latin scripts** — the OS has already applied whatever physical layout is
actually installed before the browser sees the event. So this table is never consulted to
decide what a keystroke produces; it only drives what the on-screen keyboard, finger guide and
Stats heatmap *draw* for someone who tells Settings they type on one of these layouts. A wrong
cell here would misdraw a picture, not mis-score a single keystroke — a fundamentally smaller
blast radius than the Hindi tables, where the same file *does* decide the typed character
(InScript/Remington resolve from the physical key, not `event.key`, because Devanagari has no
single universal OS layout to defer to).
