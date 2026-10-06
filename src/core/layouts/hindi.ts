/**
 * Hindi layouts: InScript and Remington (Gail).
 *
 * docs/06 rules 1 & 2: do not invent key tables; verify every key against an
 * authoritative source and cite it in docs/layout-sources.md; mark `verified`
 * per key (not just per layout) so a layout can ship partially confirmed.
 *
 * InScript here is cross-checked against the Windows KBDINDEV.DLL driver
 * (the literal "InScript" implementation shipped on every Windows PC — see
 * kbdlayout.info/KBDINDEV and learn.microsoft.com/globalization/keyboards)
 * and the X11 keyboard-config "in(deva)" driver used on Linux. Where both
 * agree, the key is `verified: true`. Fourteen keys are flagged `false`:
 * the ten digit keys (genuine base-character disagreement between the two
 * OS drivers — see docs/layout-sources.md), the Period key's shift value
 * (official drivers vs. community exam charts disagree), and KeyZ,
 * Backslash and KeyN, which the owner's prior session reported as disputed.
 * The whole layout still shows a Beta badge until a human confirms every
 * key on real hardware with the Keyboard tester (docs/06 rule 5).
 *
 * Remington (Gail) ships with only its digit row populated: no authoritative
 * source (government chart or OS driver) could be found this session, so
 * per the owner's instruction it stays in Beta rather than being omitted or
 * guessing the rest of the table.
 */
import type { KeyCap, LayoutRow, PhysicalLayout } from './qwerty';
import { QWERTY } from './qwerty';
import inscriptData from '../../content/inscript-verified.json';
import remingtonData from '../../content/remington-beta.json';

interface SourceKey {
  normal: string;
  shift: string;
  verified: boolean;
  note?: string;
}

interface SourceFile {
  status: string;
  layout: string;
  keys: Record<string, SourceKey>;
}

const inscriptSource = inscriptData as SourceFile;
const remingtonSource = remingtonData as SourceFile;

function buildFromSource(
  id: string,
  name: string,
  source: SourceFile,
  layoutNote: string,
): PhysicalLayout {
  const rows: LayoutRow[] = QWERTY.rows.map((r) => ({
    offset: r.offset,
    keys: r.keys.map((k): KeyCap => {
      const mapped = source.keys[k.code];
      if (!mapped) return { code: k.code, normal: '', shift: '' };
      const cap: KeyCap = { code: k.code, normal: mapped.normal, shift: mapped.shift, verified: mapped.verified };
      if (mapped.note) cap.note = mapped.note;
      return cap;
    }),
  }));

  return {
    id,
    name,
    script: 'devanagari',
    rows,
    verified: false,
    note: layoutNote,
  };
}

export const INSCRIPT: PhysicalLayout = buildFromSource(
  'inscript',
  'Hindi — InScript',
  inscriptSource,
  'Beta. Cross-checked against the Windows KBDINDEV.DLL and X11 in(deva) drivers ' +
    '(docs/layout-sources.md). 14 keys are individually flagged — press every key in ' +
    'Tools > Keyboard tester before relying on this for exam practice.',
);

export const REMINGTON: PhysicalLayout = buildFromSource(
  'remington',
  'Hindi — Remington (Gail)',
  remingtonSource,
  'Beta — mostly unmapped. No authoritative chart or OS driver for Remington (Gail) could ' +
    'be verified this session; only the digit row is populated. See docs/layout-sources.md.',
);

/** Physical key codes that have *some* mapping in the given layout. */
export function coveredCodes(layout: PhysicalLayout): string[] {
  return layout.rows.flatMap((r) => r.keys.filter((k) => k.normal).map((k) => k.code));
}

/** Keys flagged unverified in the given layout (for the Keyboard tester / Settings hint). */
export function unverifiedCodes(layout: PhysicalLayout): string[] {
  return layout.rows.flatMap((r) => r.keys.filter((k) => k.normal && k.verified === false).map((k) => k.code));
}

export const INSCRIPT_COVERED_CODES: readonly string[] = coveredCodes(INSCRIPT);
export const INSCRIPT_DISPUTED_CODES: readonly string[] = unverifiedCodes(INSCRIPT);

/** Human-readable verification status, shown in Settings next to the Beta badge. */
export const INSCRIPT_STATUS: string = String(inscriptSource.status);
export const REMINGTON_STATUS: string = String(remingtonSource.status);

/**
 * Below this many mapped physical keys a Devanagari layout cannot carry a
 * real typing session (it would silently fall back to Latin letters on
 * every unmapped key). Used to keep Remington selectable in Settings/Tools
 * without wiring it into live Type/Learn sessions until it has real data.
 */
export const MIN_FUNCTIONAL_KEYS = 20;

export function isFunctional(layout: PhysicalLayout): boolean {
  return layout.script === 'devanagari' && coveredCodes(layout).length >= MIN_FUNCTIONAL_KEYS;
}

export const LATIN_LAYOUTS: PhysicalLayout[] = [QWERTY];
export const HINDI_LAYOUTS: PhysicalLayout[] = [INSCRIPT, REMINGTON];

export function layoutById(id: string): PhysicalLayout {
  if (id === 'remington') return REMINGTON;
  if (id === 'inscript') return INSCRIPT;
  return QWERTY;
}
