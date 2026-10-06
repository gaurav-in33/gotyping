/**
 * Extra Latin physical layouts (docs/01 Settings > Keyboard "extra keyboard
 * layouts... data-driven, e.g. Colemak, Dvorak, if clean").
 *
 * These are "clean" to add precisely because Latin typing never resolves
 * through this table — `core/layouts/resolver.ts` trusts `KeyboardEvent.key`
 * for Latin scripts, i.e. the OS has already applied whatever physical
 * layout the user actually has installed. So adding Colemak/Dvorak here
 * cannot change what a keystroke produces; it only changes what the
 * on-screen keyboard, finger guide and heatmap *show* for someone who really
 * does type on one of these layouts, by picking the matching reference table
 * in Settings > Keyboard > Physical layout.
 *
 * Standard ANSI layouts (Wikipedia: "Colemak", "Dvorak keyboard layout").
 */
import type { PhysicalLayout } from './qwerty';

const row = (offset: number, caps: Array<[string, string, string]>) => ({
  offset,
  keys: caps.map(([code, normal, shift]) => ({ code, normal, shift, verified: true })),
});

const REFERENCE_NOTE =
  'Reference layout for the on-screen keyboard, finger guide and heatmap only. ' +
  'Typing itself always uses whatever layout your OS has applied (GoTyping trusts ' +
  'KeyboardEvent.key for Latin scripts), so this never changes what a keystroke produces.';

const DIGIT_ROW: Array<[string, string, string]> = [
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
];

export const COLEMAK: PhysicalLayout = {
  id: 'colemak',
  name: 'Colemak (reference)',
  script: 'latin',
  verified: true,
  note: REFERENCE_NOTE,
  rows: [
    row(0, DIGIT_ROW),
    row(0.5, [
      ['KeyQ', 'q', 'Q'],
      ['KeyW', 'w', 'W'],
      ['KeyE', 'f', 'F'],
      ['KeyR', 'p', 'P'],
      ['KeyT', 'g', 'G'],
      ['KeyY', 'j', 'J'],
      ['KeyU', 'l', 'L'],
      ['KeyI', 'u', 'U'],
      ['KeyO', 'y', 'Y'],
      ['KeyP', ';', ':'],
      ['BracketLeft', '[', '{'],
      ['BracketRight', ']', '}'],
      ['Backslash', '\\', '|'],
    ]),
    row(0.75, [
      ['KeyA', 'a', 'A'],
      ['KeyS', 'r', 'R'],
      ['KeyD', 's', 'S'],
      ['KeyF', 't', 'T'],
      ['KeyG', 'd', 'D'],
      ['KeyH', 'h', 'H'],
      ['KeyJ', 'n', 'N'],
      ['KeyK', 'e', 'E'],
      ['KeyL', 'i', 'I'],
      ['Semicolon', 'o', 'O'],
      ['Quote', "'", '"'],
    ]),
    row(1.25, [
      ['KeyZ', 'z', 'Z'],
      ['KeyX', 'x', 'X'],
      ['KeyC', 'c', 'C'],
      ['KeyV', 'v', 'V'],
      ['KeyB', 'b', 'B'],
      ['KeyN', 'k', 'K'],
      ['KeyM', 'm', 'M'],
      ['Comma', ',', '<'],
      ['Period', '.', '>'],
      ['Slash', '/', '?'],
    ]),
  ],
};

export const DVORAK: PhysicalLayout = {
  id: 'dvorak',
  name: 'Dvorak (reference)',
  script: 'latin',
  verified: true,
  note: REFERENCE_NOTE,
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
      ['Minus', '[', '{'],
      ['Equal', ']', '}'],
    ]),
    row(0.5, [
      ['KeyQ', "'", '"'],
      ['KeyW', ',', '<'],
      ['KeyE', '.', '>'],
      ['KeyR', 'p', 'P'],
      ['KeyT', 'y', 'Y'],
      ['KeyY', 'f', 'F'],
      ['KeyU', 'g', 'G'],
      ['KeyI', 'c', 'C'],
      ['KeyO', 'r', 'R'],
      ['KeyP', 'l', 'L'],
      ['BracketLeft', '/', '?'],
      ['BracketRight', '=', '+'],
      ['Backslash', '\\', '|'],
    ]),
    row(0.75, [
      ['KeyA', 'a', 'A'],
      ['KeyS', 'o', 'O'],
      ['KeyD', 'e', 'E'],
      ['KeyF', 'u', 'U'],
      ['KeyG', 'i', 'I'],
      ['KeyH', 'd', 'D'],
      ['KeyJ', 'h', 'H'],
      ['KeyK', 't', 'T'],
      ['KeyL', 'n', 'N'],
      ['Semicolon', 's', 'S'],
      ['Quote', '-', '_'],
    ]),
    row(1.25, [
      ['KeyZ', ';', ':'],
      ['KeyX', 'q', 'Q'],
      ['KeyC', 'j', 'J'],
      ['KeyV', 'k', 'K'],
      ['KeyB', 'x', 'X'],
      ['KeyN', 'b', 'B'],
      ['KeyM', 'm', 'M'],
      ['Comma', 'w', 'W'],
      ['Period', 'v', 'V'],
      ['Slash', 'z', 'Z'],
    ]),
  ],
};

export const EXTRA_LATIN_LAYOUTS: PhysicalLayout[] = [COLEMAK, DVORAK];
