/**
 * Advanced / Fun modes (docs/01 §7), nested under Type > More modes.
 * Each mode reuses an existing engine/content capability rather than
 * duplicating it — see the comment on every switch in TypeScreen.tsx.
 * Morse-style challenge is intentionally omitted: there is no clean way to
 * fit a tap-based code input into the existing keystroke engine without a
 * second input model, so per docs/01 it is left out rather than bolted on.
 */
export type FunModeId =
  | 'none'
  | 'ghost'
  | 'memory'
  | 'blind'
  | 'randomCap'
  | 'difficult'
  | 'master'
  | 'burst'
  | 'endurance'
  | 'code';

export interface FunModeInfo {
  id: FunModeId;
  label: string;
  hint: string;
}

export const FUN_MODES: FunModeInfo[] = [
  { id: 'none', label: 'Off', hint: '' },
  { id: 'ghost', label: 'Ghost race', hint: 'Races your own best run on this text style, replayed from its stored timeline.' },
  { id: 'memory', label: 'Memory', hint: 'Shows the text briefly, then hides it — type from memory.' },
  { id: 'blind', label: 'Blind', hint: 'No correct/incorrect coloring while you type.' },
  { id: 'randomCap', label: 'Random capitalization', hint: 'ScrAmbles CapitaLs so you cannot rely on rhythm alone.' },
  { id: 'difficult', label: 'Difficult words', hint: 'Weighted toward words you personally mistype or slow down on.' },
  { id: 'master', label: 'Sudden death', hint: 'One mistake ends the test immediately.' },
  { id: 'burst', label: 'Speed burst', hint: 'Switches to a short 10s time test — go all out.' },
  { id: 'endurance', label: 'Endurance', hint: 'Switches to a long 10-minute time test.' },
  { id: 'code', label: 'Code', hint: 'Type real-looking JavaScript or Python snippets instead of prose — pick the language below.' },
];

export function funModeInfo(id: FunModeId): FunModeInfo {
  return FUN_MODES.find((m) => m.id === id) ?? FUN_MODES[0]!;
}
