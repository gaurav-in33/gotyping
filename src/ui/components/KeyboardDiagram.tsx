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
  /** Optional pointer hook for display-first keyboard guides that preserve input focus. */
  onKeyPointerDown?: (event: PointerEvent, key: KeyCap) => void;
  ariaLabel: string;
}

export function KeyboardDiagram({
  layout,
  colorFor,
  subLabelFor,
  classFor,
  onKeyClick,
  onKeyPointerDown,
  ariaLabel,
}: KeyboardDiagramProps) {
  return (
    <div class="kbd-diagram" role="group" aria-label={ariaLabel}>
      {layout.rows.map((row, ri) => (
        <div
          class="kbd-diagram__row"
          key={ri}
          style={{ '--row-offset': String(row.offset) } as unknown as string}
        >
          {row.keys.map((k) => {
            const bg = colorFor?.(k);
            const extra = classFor?.(k) ?? '';
            const sub = subLabelFor?.(k);
            const content = (
              <>
                <span class="kbd-diagram__glyph">{k.normal || '·'}</span>
                {sub ? <span class="kbd-diagram__sub">{sub}</span> : null}
              </>
            );
            const cls = `kbd-diagram__key${extra ? ` ${extra}` : ''}`;
            const title = `${k.code}: ${k.normal || '—'} / ${k.shift || '—'}${k.note ? ` — ${k.note}` : ''}`;
            // Only render a real <button> when a click actually does
            // something (the on-screen typing keyboard). Stats' heatmap and
            // the Keyboard tester are read-only displays — giving those an
            // interactive, focusable <button> that does nothing on click is
            // a dead control, so render a plain non-interactive span there.
            return onKeyClick ? (
              <button
                key={k.code}
                type="button"
                class={cls}
                style={bg ? { background: bg } : undefined}
                title={title}
                data-code={k.code}
                onPointerDown={(e) => onKeyPointerDown?.(e, k)}
                onClick={() => onKeyClick(k)}
              >
                {content}
              </button>
            ) : (
              <span
                key={k.code}
                class={cls}
                style={bg ? { background: bg } : undefined}
                title={title}
                data-code={k.code}
              >
                {content}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
