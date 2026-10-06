/**
 * Hindi layouts.
 *
 * IMPORTANT (docs/06 rule 1 & 2): the only key table we currently have is
 * `data/inscript-legacy.json`, which the old project wrote FROM MEMORY and
 * never verified. We therefore ship it as `verified: false`, surface a visible
 * Beta badge wherever it is selectable, and record the status in
 * `docs/layout-sources.md`. No key table is invented here.
 *
 * Remington (Gail) is intentionally NOT shipped yet: we have no trustworthy
 * source for it in the repo, and guessing one would violate docs/06.
 */
import type { KeyCap, LayoutRow, PhysicalLayout } from './qwerty';
import { QWERTY } from './qwerty';
import legacy from '../../content/inscript-legacy.json';

interface LegacyKey {
  normal: string;
  shift: string;
}

const legacyKeys = legacy.keys as Record<string, LegacyKey>;

/**
 * Build the Devanagari layout by overlaying the legacy map onto the QWERTY
 * geometry, so the on-screen keyboard keeps a familiar shape.
 */
function buildInscript(): PhysicalLayout {
  const rows: LayoutRow[] = QWERTY.rows.map((r) => ({
    offset: r.offset,
    keys: r.keys.map((k): KeyCap => {
      const mapped = legacyKeys[k.code];
      if (!mapped) return { code: k.code, normal: '', shift: '' };
      return { code: k.code, normal: mapped.normal, shift: mapped.shift };
    }),
  }));

  return {
    id: 'inscript',
    name: 'Hindi — InScript',
    script: 'devanagari',
    rows,
    verified: false,
    note:
      'Beta. Key table comes from an unverified legacy map (see docs/layout-sources.md). ' +
      'Verify against an official InScript chart before relying on it.',
  };
}

export const INSCRIPT: PhysicalLayout = buildInscript();

/** Keys present in the legacy table — everything else is blank on screen. */
export const INSCRIPT_COVERED_CODES: readonly string[] = Object.keys(legacyKeys);

/** Human-readable verification status, shown in Settings next to the Beta badge. */
export const INSCRIPT_STATUS: string = String(legacy.status);

export const LATIN_LAYOUTS: PhysicalLayout[] = [QWERTY];
export const HINDI_LAYOUTS: PhysicalLayout[] = [INSCRIPT];

export function layoutById(id: string): PhysicalLayout {
  if (id === 'inscript') return INSCRIPT;
  return QWERTY;
}
