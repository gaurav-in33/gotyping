/**
 * Reusable on-screen keyboard, driven by a PhysicalLayout's row geometry.
 * Used by Tools → Keyboard tester (verification status, live key presses)
 * and by Stats → Keys heatmap (per-key error rate / latency color scale) —
 * one component, two callers, per AGENT.md "one implementation per feature".
 */
import type { KeyCap, PhysicalLayout } from '../../core/layouts/qwerty';
import './keyboard-diagram.css';

export interface KeyboardDiagramProps {
  layout: PhysicalLayout;
  /** Background color for a key; omit for the default panel color. */
  colorFor?: (key: KeyCap) => string | undefined;
  /** Small text under the main glyph (e.g. a heatmap percentage). */
  subLabelFor?: (key: KeyCap) => string | undefined;
  /** Extra class, e.g. to mark a key pressed or unverified. */
  classFor?: (key: KeyCap) => string | undefined;
  onKeyClick?: (key: KeyCap) => void;
  ariaLabel: string;
}

const KEY_UNIT = 40;

export function KeyboardDiagram({
  layout,
  colorFor,
  subLabelFor,
  classFor,
  onKeyClick,
  ariaLabel,
}: KeyboardDiagramProps) {
  return (
    <div class="kbd-diagram" role="group" aria-label={ariaLabel}>
      {layout.rows.map((row, ri) => (
        <div class="kbd-diagram__row" key={ri} style={{ paddingLeft: `${row.offset * KEY_UNIT}px` }}>
          {row.keys.map((k) => {
            const bg = colorFor?.(k);
            const extra = classFor?.(k) ?? '';
            const sub = subLabelFor?.(k);
            return (
              <button
                key={k.code}
                type="button"
                class={`kbd-diagram__key${extra ? ` ${extra}` : ''}`}
                style={bg ? { background: bg } : undefined}
                title={`${k.code}: ${k.normal || '—'} / ${k.shift || '—'}${k.note ? ` — ${k.note}` : ''}`}
                data-code={k.code}
                onClick={() => onKeyClick?.(k)}
              >
                <span class="kbd-diagram__glyph">{k.normal || '·'}</span>
                {sub ? <span class="kbd-diagram__sub">{sub}</span> : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
