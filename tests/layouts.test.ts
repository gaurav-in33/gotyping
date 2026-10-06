import { describe, expect, it } from 'vitest';
import { QWERTY, indexLayout, reverseIndex } from '../src/core/layouts/qwerty';
import { LayoutResolver, unitsFromInsertedText, type KeyLike } from '../src/core/layouts/resolver';
import {
  INSCRIPT,
  INSCRIPT_DISPUTED_CODES,
  INSCRIPT_STATUS,
  REMINGTON,
  REMINGTON_STATUS,
  coveredCodes,
  layoutById,
} from '../src/core/layouts/hindi';
import { fingerForCode, handOf, FINGER_BY_CODE } from '../src/core/layouts/fingers';

const key = (over: Partial<KeyLike>): KeyLike => ({
  key: '', code: '', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...over,
});

describe('qwerty layout', () => {
  it('indexes every key by code', () => {
    const idx = indexLayout(QWERTY);
    expect(idx.get('KeyA')?.normal).toBe('a');
    expect(idx.get('KeyA')?.shift).toBe('A');
    expect(idx.get('Digit1')?.shift).toBe('!');
  });
  it('reverse-maps characters to keys', () => {
    const rev = reverseIndex(QWERTY);
    expect(rev.get('a')).toEqual({ code: 'KeyA', shift: false });
    expect(rev.get('A')).toEqual({ code: 'KeyA', shift: true });
    expect(rev.get(' ')).toEqual({ code: 'Space', shift: false });
  });
  it('has no duplicate codes', () => {
    const codes = QWERTY.rows.flatMap((r) => r.keys.map((k) => k.code));
    expect(new Set(codes).size).toBe(codes.length);
  });
  it('is marked verified', () => {
    expect(QWERTY.verified).toBe(true);
  });
});

describe('latin resolver', () => {
  const r = new LayoutResolver(QWERTY);

  it('resolves printable keys from event.key', () => {
    expect(r.resolve(key({ key: 'a', code: 'KeyA' }))).toEqual({ kind: 'char', unit: 'a' });
    expect(r.resolve(key({ key: 'A', code: 'KeyA', shiftKey: true }))).toEqual({ kind: 'char', unit: 'A' });
  });
  it('resolves space from either key or code', () => {
    expect(r.resolve(key({ key: ' ', code: 'Space' }))).toEqual({ kind: 'char', unit: ' ' });
  });
  it('maps control keys', () => {
    expect(r.resolve(key({ key: 'Backspace' })).kind).toBe('backspace');
    expect(r.resolve(key({ key: 'Enter' })).kind).toBe('enter');
    expect(r.resolve(key({ key: 'Tab' })).kind).toBe('tab');
  });
  it('ignores modifiers and named keys', () => {
    expect(r.resolve(key({ key: 'Shift' })).kind).toBe('ignore');
    expect(r.resolve(key({ key: 'a', ctrlKey: true })).kind).toBe('ignore');
    expect(r.resolve(key({ key: 'r', metaKey: true })).kind).toBe('ignore');
    expect(r.resolve(key({ key: 'ArrowLeft' })).kind).toBe('ignore');
  });
});

describe('devanagari resolver', () => {
  const r = new LayoutResolver(INSCRIPT);

  it('resolves from event.code, not event.key', () => {
    // On a US layout the OS reports key "q" for the physical Q key.
    const out = r.resolve(key({ key: 'q', code: 'KeyQ' }));
    expect(out.kind).toBe('char');
    if (out.kind === 'char') expect(out.unit).not.toBe('q');
  });

  it('applies the shift layer', () => {
    const normal = r.resolve(key({ key: 'q', code: 'KeyQ' }));
    const shifted = r.resolve(key({ key: 'Q', code: 'KeyQ', shiftKey: true }));
    expect(normal).not.toEqual(shifted);
  });

  it('maps Devanagari digits', () => {
    expect(r.resolve(key({ key: '1', code: 'Digit1' }))).toEqual({ kind: 'char', unit: '१' });
  });

  it('still produces space', () => {
    expect(r.resolve(key({ key: ' ', code: 'Space' }))).toEqual({ kind: 'char', unit: ' ' });
  });

  it('reports the script', () => {
    expect(r.script).toBe('devanagari');
  });
});

describe('hindi layout honesty (docs/06)', () => {
  it('is flagged unverified so the UI can show a Beta badge', () => {
    expect(INSCRIPT.verified).toBe(false);
    expect(INSCRIPT.note).toMatch(/beta/i);
  });
  it('carries the legacy status text forward', () => {
    expect(INSCRIPT_STATUS).toMatch(/UNVERIFIED/i);
  });
  it('produces Devanagari code points for mapped keys', () => {
    const caps = INSCRIPT.rows.flatMap((r) => r.keys).filter((k) => k.normal);
    expect(caps.length).toBeGreaterThan(20);
    const devanagari = caps.filter((k) => /[\u0900-\u097F]/.test(k.normal));
    expect(devanagari.length).toBeGreaterThan(20);
  });
});

describe('hindi per-key verification (docs/06 rule 2)', () => {
  it('flags exactly the 14 disputed keys and leaves the rest verified', () => {
    expect(INSCRIPT_DISPUTED_CODES.length).toBe(14);
    for (const code of ['KeyZ', 'Backslash', 'KeyN', 'Period', 'Digit1', 'Digit0']) {
      expect(INSCRIPT_DISPUTED_CODES).toContain(code);
    }
    // A key not in the disputed list must be explicitly verified, not just unset.
    const home = INSCRIPT.rows.flatMap((r) => r.keys).find((k) => k.code === 'KeyA');
    expect(home?.verified).toBe(true);
  });

  it('every mapped key carries an explicit verified flag', () => {
    const mapped = INSCRIPT.rows.flatMap((r) => r.keys).filter((k) => k.normal);
    for (const k of mapped) expect(typeof k.verified).toBe('boolean');
  });

  it('fixed the legacy Slash shift bug (shift must differ from the base key)', () => {
    const slash = INSCRIPT.rows.flatMap((r) => r.keys).find((k) => k.code === 'Slash');
    expect(slash?.shift).not.toBe(slash?.normal);
    expect(slash?.shift).toBe('\u095f');
  });

  it('resolves via layoutById', () => {
    expect(layoutById('inscript')).toBe(INSCRIPT);
    expect(layoutById('remington')).toBe(REMINGTON);
    expect(layoutById('qwerty').id).toBe('qwerty');
  });
});

describe('remington (Beta, docs/06 rule 4)', () => {
  it('is present as a selectable layout without inventing a key table', () => {
    expect(REMINGTON.id).toBe('remington');
    expect(REMINGTON.verified).toBe(false);
    expect(REMINGTON_STATUS).toMatch(/BETA/i);
  });

  it('only the digit row is mapped — everything else is honestly left blank', () => {
    const covered = coveredCodes(REMINGTON);
    expect(covered.length).toBe(10);
    for (const code of covered) expect(code.startsWith('Digit')).toBe(true);
  });

  it('every mapped key is flagged unverified', () => {
    const mapped = REMINGTON.rows.flatMap((r) => r.keys).filter((k) => k.normal);
    for (const k of mapped) expect(k.verified).toBe(false);
  });
});

describe('soft keyboard input', () => {
  it('splits inserted text into NFC code-point units', () => {
    expect(unitsFromInsertedText('hi')).toEqual(['h', 'i']);
    expect(unitsFromInsertedText('कि')).toEqual(['क', 'ि']);
  });
});

describe('fingers', () => {
  it('assigns the home row correctly', () => {
    expect(fingerForCode('KeyF')).toBe('l-index');
    expect(fingerForCode('KeyJ')).toBe('r-index');
    expect(fingerForCode('KeyA')).toBe('l-pinky');
    expect(fingerForCode('Semicolon')).toBe('r-pinky');
    expect(fingerForCode('Space')).toBe('thumb');
  });
  it('returns null for unknown codes', () => {
    expect(fingerForCode('F13')).toBeNull();
  });
  it('maps fingers to hands', () => {
    expect(handOf('l-middle')).toBe('left');
    expect(handOf('r-ring')).toBe('right');
    expect(handOf('thumb')).toBe('both');
  });
  it('covers every letter key on QWERTY', () => {
    const letters = QWERTY.rows.flatMap((r) => r.keys).filter((k) => /^Key[A-Z]$/.test(k.code));
    for (const k of letters) expect(FINGER_BY_CODE[k.code]).toBeDefined();
  });
});
