/**
 * Keyboard event -> character unit (docs/02).
 *
 * Latin layouts: trust `event.key` — the OS already applied the user's layout.
 * Devanagari layouts: the OS layout is usually US QWERTY, so we resolve from
 * the *physical* key (`event.code`) plus Shift through the layout table.
 */
import type { PhysicalLayout } from './qwerty';
import { indexLayout, QWERTY, reverseIndex } from './qwerty';

export interface KeyLike {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export type Resolved =
  | { kind: 'char'; unit: string }
  | { kind: 'backspace' }
  | { kind: 'enter' }
  | { kind: 'tab' }
  | { kind: 'ignore' };

/** A printable single-code-point key, excluding named keys like "Shift". */
function isPrintableKey(key: string): boolean {
  return Array.from(key).length === 1;
}

/**
 * English QWERTY character -> physical code. Soft keyboards give us a
 * character rather than `KeyboardEvent.code`; Hindi must still go through the
 * exact same physical-key layout table as USB/Bluetooth keyboards.
 */
const QWERTY_CHARACTER_INDEX = reverseIndex(QWERTY);

/** Devanagari plus the Vedic/extended range used by Hindi IMEs. */
export function isDevanagariUnit(unit: string): boolean {
  return /^[\u0900-\u097f\ua8e0-\ua8ff]$/u.test(unit);
}

export class LayoutResolver {
  private index: Map<string, { normal: string; shift: string }>;

  constructor(private layout: PhysicalLayout) {
    this.index = new Map();
    for (const [code, cap] of indexLayout(layout)) {
      this.index.set(code, { normal: cap.normal, shift: cap.shift });
    }
  }

  setLayout(layout: PhysicalLayout): void {
    this.layout = layout;
    this.index = new Map();
    for (const [code, cap] of indexLayout(layout)) {
      this.index.set(code, { normal: cap.normal, shift: cap.shift });
    }
  }

  get script(): PhysicalLayout['script'] {
    return this.layout.script;
  }

  resolve(e: KeyLike): Resolved {
    // Shortcuts belong to the app, never to the typing stream.
    if (e.ctrlKey || e.metaKey) return { kind: 'ignore' };

    if (e.key === 'Backspace') return { kind: 'backspace' };
    if (e.key === 'Enter') return { kind: 'enter' };
    if (e.key === 'Tab') return { kind: 'tab' };
    if (e.code === 'Space' || e.key === ' ') return { kind: 'char', unit: ' ' };

    if (this.layout.script === 'devanagari') {
      const cap = this.index.get(e.code);
      if (cap) {
        const unit = e.shiftKey ? cap.shift : cap.normal;
        if (unit) return { kind: 'char', unit };
      }
      // Hindi must never fall back to a literal Latin character. A missing
      // table entry is intentionally ignored (notably Remington Beta keys),
      // while mapped punctuation/digits already came through the same branch.
      return { kind: 'ignore' };
    }

    if (e.altKey) return { kind: 'ignore' };
    if (isPrintableKey(e.key)) return { kind: 'char', unit: e.key };
    return { kind: 'ignore' };
  }

  /**
   * Convert inserted soft-keyboard text to engine units.
   *
   * Latin layouts trust inserted text directly. Hindi is different: Android
   * Gboard's English QWERTY sends `"k"`, which represents physical `KeyK`,
   * not a literal Latin k to score. We first recover that QWERTY physical key
   * and then call `resolve`, so soft and physical input share one InScript /
   * Remington table. A Devanagari character is already an IME result and is
   * accepted verbatim rather than mapped for a second time.
   */
  resolveSoftText(text: string): string[] {
    const out: string[] = [];
    for (const unit of unitsFromInsertedText(text)) {
      if (this.layout.script !== 'devanagari') {
        out.push(unit);
        continue;
      }
      if (isDevanagariUnit(unit)) {
        out.push(unit);
        continue;
      }
      const physical = QWERTY_CHARACTER_INDEX.get(unit);
      if (!physical) continue; // Never leak a Latin character into Hindi mode.
      const resolved = this.resolve({
        key: unit,
        code: physical.code,
        shiftKey: physical.shift,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      });
      if (resolved.kind === 'char') out.push(resolved.unit);
    }
    return out;
  }
}

/**
 * Soft keyboards (Android/iOS) do not produce reliable keydown events.
 * `beforeinput`/`input` deltas are converted to units instead.
 */
export function unitsFromInsertedText(text: string): string[] {
  return Array.from(text.normalize('NFC'));
}
