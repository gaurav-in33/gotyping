/**
 * QWERTY physical layout: code -> produced character, plus the row geometry
 * used by the on-screen keyboard / heatmap / finger guide.
 * Latin layouts are data, so Colemak/Dvorak can be added in Step 3.
 */

export interface KeyCap {
  code: string;
  normal: string;
  shift: string;
}

export interface LayoutRow {
  keys: KeyCap[];
  /** Left indent in key units, for rendering the stagger. */
  offset: number;
}

export interface PhysicalLayout {
  id: string;
  name: string;
  script: 'latin' | 'devanagari';
  rows: LayoutRow[];
  /** true only when every key has been checked against an authoritative source. */
  verified: boolean;
  note?: string;
}

const row = (offset: number, caps: Array<[string, string, string]>): LayoutRow => ({
  offset,
  keys: caps.map(([code, normal, shift]) => ({ code, normal, shift })),
});

export const QWERTY: PhysicalLayout = {
  id: 'qwerty',
  name: 'QWERTY',
  script: 'latin',
  verified: true,
  rows: [
    row(0, [
      ['Backquote', '`', '~'],
      ['Digit1', '1', '!'],
      ['Digit2', '2', '@'],
      ['Digit3', '3', '#'],
      ['Digit4', '4', '$'],
      ['Digit5', '5', '%'],
      ['Digit6', '6', '^'],
      ['Digit7', '7', '&'],
      ['Digit8', '8', '*'],
      ['Digit9', '9', '('],
      ['Digit0', '0', ')'],
      ['Minus', '-', '_'],
      ['Equal', '=', '+'],
    ]),
    row(0.5, [
      ['KeyQ', 'q', 'Q'],
      ['KeyW', 'w', 'W'],
      ['KeyE', 'e', 'E'],
      ['KeyR', 'r', 'R'],
      ['KeyT', 't', 'T'],
      ['KeyY', 'y', 'Y'],
      ['KeyU', 'u', 'U'],
      ['KeyI', 'i', 'I'],
      ['KeyO', 'o', 'O'],
      ['KeyP', 'p', 'P'],
      ['BracketLeft', '[', '{'],
      ['BracketRight', ']', '}'],
      ['Backslash', '\\', '|'],
    ]),
    row(0.75, [
      ['KeyA', 'a', 'A'],
      ['KeyS', 's', 'S'],
      ['KeyD', 'd', 'D'],
      ['KeyF', 'f', 'F'],
      ['KeyG', 'g', 'G'],
      ['KeyH', 'h', 'H'],
      ['KeyJ', 'j', 'J'],
      ['KeyK', 'k', 'K'],
      ['KeyL', 'l', 'L'],
      ['Semicolon', ';', ':'],
      ['Quote', "'", '"'],
    ]),
    row(1.25, [
      ['KeyZ', 'z', 'Z'],
      ['KeyX', 'x', 'X'],
      ['KeyC', 'c', 'C'],
      ['KeyV', 'v', 'V'],
      ['KeyB', 'b', 'B'],
      ['KeyN', 'n', 'N'],
      ['KeyM', 'm', 'M'],
      ['Comma', ',', '<'],
      ['Period', '.', '>'],
      ['Slash', '/', '?'],
    ]),
  ],
};

/** code -> KeyCap index for the given layout. */
export function indexLayout(layout: PhysicalLayout): Map<string, KeyCap> {
  const m = new Map<string, KeyCap>();
  for (const r of layout.rows) for (const k of r.keys) m.set(k.code, k);
  return m;
}

/** character -> the key that produces it (first match wins). */
export function reverseIndex(
  layout: PhysicalLayout,
): Map<string, { code: string; shift: boolean }> {
  const m = new Map<string, { code: string; shift: boolean }>();
  for (const r of layout.rows) {
    for (const k of r.keys) {
      if (k.normal && !m.has(k.normal)) m.set(k.normal, { code: k.code, shift: false });
      if (k.shift && !m.has(k.shift)) m.set(k.shift, { code: k.code, shift: true });
    }
  }
  m.set(' ', { code: 'Space', shift: false });
  return m;
}
