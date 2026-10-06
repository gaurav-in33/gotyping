/**
 * Every physical layout GoTyping knows about, in one place, so the Keyboard
 * tester, on-screen keyboard and finger guide all resolve a settings id the
 * same way instead of each keeping their own list (AGENT.md "one
 * implementation per feature").
 */
import { QWERTY, type PhysicalLayout } from './qwerty';
import { EXTRA_LATIN_LAYOUTS } from './alt-latin';
import { HINDI_LAYOUTS } from './hindi';

export const ALL_LAYOUTS: PhysicalLayout[] = [QWERTY, ...EXTRA_LATIN_LAYOUTS, ...HINDI_LAYOUTS];

/** Resolves any known layout id (Latin or Devanagari); falls back to QWERTY. */
export function layoutByAnyId(id: string): PhysicalLayout {
  return ALL_LAYOUTS.find((l) => l.id === id) ?? QWERTY;
}
