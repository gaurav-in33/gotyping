# Keyboard layout sources and verification status

`docs/06-HINDI-LAYOUTS.md` rule 1 says: **do not invent key tables**, verify every key
against an authoritative source, and cite it here. This file records exactly what has and
has not been verified, so nothing ships with a false claim of correctness.

## QWERTY (Latin) — `verified: true`

`src/core/layouts/qwerty.ts`. This is the standard US ANSI layout; the character for each
physical key is common knowledge and is additionally cross-checked at runtime, because for
Latin scripts the resolver trusts `KeyboardEvent.key` (the OS has already applied whatever
layout the user has installed). The table is used for the on-screen keyboard geometry,
finger mapping and the heatmap — not to translate keystrokes — so a user on AZERTY or
Dvorak still types correctly today.

Finger assignment (`src/core/layouts/fingers.ts`) follows standard touch-typing home-row
positions (ASDF / JKL;), with the left index covering T/G/B and the right index covering
Y/H/N, which is the conventional split.

## Hindi InScript — `verified: false` (ships as **Beta**)

**Source: none authoritative yet.** The only table available in this repository is
`data/inscript-legacy.json`, which the old Gku Type project wrote *from memory*. Its own
`status` field says:

> LEGACY, UNVERIFIED. Built from memory in the old project. Verify every key against an
> authoritative Inscript chart before shipping. KeyZ was added late and is explicitly
> unverified.

Accordingly:

- `src/core/layouts/hindi.ts` sets `verified: false` and carries a `note`.
- Settings shows a **Beta** badge next to the Hindi layout, and the hint text points here.
- `tests/layouts.test.ts` asserts the layout stays flagged unverified, so nobody can
  silently promote it to "correct" without doing the verification work.

The 44 mapped keys cover digits (Devanagari numerals), the three letter rows and the
shift layer. They have **not** been checked against the official chart.

### What still has to be done (Step 2)

1. Check every key against the official InScript chart (Government of India / BIS / CDAC
   published material) and record the exact document name, version and URL here.
2. Mark `verified` per key, not just per layout, so partially verified layouts are possible.
3. Build the Tools > Keyboard tester page (docs/06 rule 5) so the owner can press every
   physical key on a real device and report mismatches.
4. Add the per-key unit tests required by docs/06 rule 6 (known sample words typed as a
   keystroke sequence must produce the exact Unicode string, including halant/matra order).

## Hindi Remington (Gail) — not shipped

Deliberately **omitted** rather than guessed. The repository contains no Remington table
and no trustworthy source for one, and docs/06 rule 1 forbids inventing it. Shipping a
half-remembered typewriter layout would silently corrupt what users type. It is listed in
Settings only once a cited source exists.

## KrutiDev ↔ Unicode — not shipped

Same reasoning (docs/06, final section): a converter is only worth shipping with a mapping
that has been tested against real documents. Until then it is omitted rather than shipped
broken. Revisit in Step 3.

## Engine-level Devanagari correctness (this *is* verified)

Independently of the key tables, the typing engine handles Devanagari text correctly and is
tested:

- text is NFC-normalized and split into code-point units, so each consonant, matra and
  halant is its own keystroke (`tests/engine.test.ts`);
- conjuncts such as क्ष / त्र / ज्ञ are typed and scored unit by unit;
- a wrong matra is counted as exactly one mistake.

So Hindi *text* is handled correctly today. What is unverified is only the mapping from
physical keys to Devanagari characters when typing Hindi on a physical keyboard.
