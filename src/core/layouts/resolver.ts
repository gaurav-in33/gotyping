/**
 * Keyboard event -> character unit (docs/02).
 *
 * Latin layouts: trust `event.key` — the OS already applied the user's layout.
 * Devanagari layouts: the OS layout is usually US QWERTY, so we resolve from
 * the *physical* key (`event.code`) plus Shift through the layout table.
 */
import type { PhysicalLayout } from './qwerty';
import { indexLayout } from './qwerty';

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
      // Fall through: let plain Latin keys (e.g. punctuation) still work.
      if (!e.altKey && isPrintableKey(e.key)) return { kind: 'char', unit: e.key };
      return { kind: 'ignore' };
    }

    if (e.altKey) return { kind: 'ignore' };
    if (isPrintableKey(e.key)) return { kind: 'char', unit: e.key };
    return { kind: 'ignore' };
  }
}

/**
 * Soft keyboards (Android/iOS) do not produce reliable keydown events.
 * `beforeinput`/`input` deltas are converted to units instead.
 */
export function unitsFromInsertedText(text: string): string[] {
  return Array.from(text.normalize('NFC'));
}
