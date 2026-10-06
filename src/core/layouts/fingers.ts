/**
 * Finger assignment by physical key (KeyboardEvent.code), standard touch
 * typing. Used by the finger guide, the heatmap and per-finger stats.
 */

export type Finger =
  | 'l-pinky'
  | 'l-ring'
  | 'l-middle'
  | 'l-index'
  | 'thumb'
  | 'r-index'
  | 'r-middle'
  | 'r-ring'
  | 'r-pinky';

export type Hand = 'left' | 'right' | 'both';

export const FINGER_LABEL: Record<Finger, string> = {
  'l-pinky': 'Left pinky',
  'l-ring': 'Left ring',
  'l-middle': 'Left middle',
  'l-index': 'Left index',
  thumb: 'Thumb',
  'r-index': 'Right index',
  'r-middle': 'Right middle',
  'r-ring': 'Right ring',
  'r-pinky': 'Right pinky',
};

export function handOf(f: Finger): Hand {
  if (f === 'thumb') return 'both';
  return f.startsWith('l-') ? 'left' : 'right';
}

const byFinger: Record<Finger, string[]> = {
  'l-pinky': ['Backquote', 'Digit1', 'KeyQ', 'KeyA', 'KeyZ', 'Tab', 'CapsLock', 'ShiftLeft'],
  'l-ring': ['Digit2', 'KeyW', 'KeyS', 'KeyX'],
  'l-middle': ['Digit3', 'KeyE', 'KeyD', 'KeyC'],
  'l-index': ['Digit4', 'Digit5', 'KeyR', 'KeyT', 'KeyF', 'KeyG', 'KeyV', 'KeyB'],
  thumb: ['Space'],
  'r-index': ['Digit6', 'Digit7', 'KeyY', 'KeyU', 'KeyH', 'KeyJ', 'KeyN', 'KeyM'],
  'r-middle': ['Digit8', 'KeyI', 'KeyK', 'Comma'],
  'r-ring': ['Digit9', 'KeyO', 'KeyL', 'Period'],
  'r-pinky': [
    'Digit0',
    'Minus',
    'Equal',
    'KeyP',
    'BracketLeft',
    'BracketRight',
    'Backslash',
    'Semicolon',
    'Quote',
    'Enter',
    'Slash',
    'ShiftRight',
    'Backspace',
  ],
};

export const FINGER_BY_CODE: Readonly<Record<string, Finger>> = (() => {
  const map: Record<string, Finger> = {};
  for (const finger of Object.keys(byFinger) as Finger[]) {
    for (const code of byFinger[finger]) map[code] = finger;
  }
  return map;
})();

export function fingerForCode(code: string): Finger | null {
  return FINGER_BY_CODE[code] ?? null;
}

/** Home-row anchors, for the finger guide. */
export const HOME_ROW: Readonly<Record<Finger, string>> = {
  'l-pinky': 'KeyA',
  'l-ring': 'KeyS',
  'l-middle': 'KeyD',
  'l-index': 'KeyF',
  thumb: 'Space',
  'r-index': 'KeyJ',
  'r-middle': 'KeyK',
  'r-ring': 'KeyL',
  'r-pinky': 'Semicolon',
};
