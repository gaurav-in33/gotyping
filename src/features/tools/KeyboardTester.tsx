import { useEffect, useMemo, useState } from 'preact/hooks';
import { KeyboardDiagram } from '../../ui/components/KeyboardDiagram';
import { QWERTY, type KeyCap } from '../../core/layouts/qwerty';
import { ALL_LAYOUTS } from '../../core/layouts/registry';
import './tools.css';

/**
 * Keyboard tester / layout reference (docs/01 Tools > Keyboard tools, and
 * docs/06 rule 5's "layout test page"). One implementation, shared by the
 * general Keyboard tab and the Hindi tab (which just preselects a layout).
 */
export function KeyboardTesterPanel({ initialLayoutId }: { initialLayoutId?: string }) {
  const [layoutId, setLayoutId] = useState(initialLayoutId ?? QWERTY.id);
  const [pressed, setPressed] = useState<string | null>(null);
  const [shiftDown, setShiftDown] = useState(false);
  const [lastTyped, setLastTyped] = useState<KeyCap | null>(null);

  useEffect(() => {
    if (initialLayoutId) setLayoutId(initialLayoutId);
  }, [initialLayoutId]);

  const list = ALL_LAYOUTS;
  const layout = useMemo(() => list.find((l) => l.id === layoutId) ?? QWERTY, [layoutId]);

  useEffect(() => {
    const byCode = new Map<string, KeyCap>();
    for (const row of layout.rows) for (const k of row.keys) byCode.set(k.code, k);

    const onDown = (e: KeyboardEvent): void => {
      setShiftDown(e.shiftKey);
      setPressed(e.code);
      const cap = byCode.get(e.code);
      if (cap) setLastTyped(cap);
    };
    const onUp = (): void => setPressed(null);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [layout]);

  const mappedCount = layout.rows.flatMap((r) => r.keys).filter((k) => k.normal).length;
  const unverifiedCount = layout.rows
    .flatMap((r) => r.keys)
    .filter((k) => k.normal && k.verified === false).length;

  return (
    <div class="tools">
      <div class="field">
        <div class="field__text">
          <span class="field__label">Layout</span>
          <span class="field__hint">
            {layout.verified
              ? 'Every mapped key verified'
              : `${unverifiedCount} of ${mappedCount} mapped keys unverified`}
          </span>
        </div>
        <div class="field__control">
          <select
            class="btn btn--sm"
            aria-label="Layout"
            value={layoutId}
            onChange={(e) => setLayoutId((e.target as HTMLSelectElement).value)}
          >
            {list.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {!layout.verified ? <span class="badge badge--beta">Beta</span> : null}
        </div>
      </div>

      <div class="panel tools__readout" role="status">
        {lastTyped ? (
          <>
            <span class="tools__readout-key">{lastTyped.code}</span>
            <span class="tools__readout-arrow">→</span>
            <span class="tools__readout-glyph">
              {shiftDown ? lastTyped.shift || '—' : lastTyped.normal || '—'}
            </span>
            {lastTyped.verified === false ? (
              <span class="badge badge--beta">Unverified</span>
            ) : null}
            {lastTyped.note ? <span class="hint">{lastTyped.note}</span> : null}
          </>
        ) : (
          <span class="hint">Press any key…</span>
        )}
      </div>

      <KeyboardDiagram
        layout={layout}
        ariaLabel={`${layout.name} keyboard`}
        classFor={(k) => {
          const classes: string[] = [];
          if (k.code === pressed) classes.push('kbd-diagram__key--pressed');
          if (!k.normal) classes.push('kbd-diagram__key--unmapped');
          else if (k.verified === false) classes.push('kbd-diagram__key--unverified');
          return classes.join(' ');
        }}
        subLabelFor={(k) => (shiftDown ? k.shift : undefined)}
      />

      <p class="hint">
        Dashed border = unverified key (see docs/layout-sources.md). Faded = not mapped yet.
      </p>
    </div>
  );
}
