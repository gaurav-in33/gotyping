import { useEffect, useMemo, useState } from 'preact/hooks';
import { KeyboardDiagram } from '../../ui/components/KeyboardDiagram';
import { QWERTY, type KeyCap } from '../../core/layouts/qwerty';
import { HINDI_LAYOUTS, layoutById } from '../../core/layouts/hindi';
import './tools.css';

const LAYOUTS = [QWERTY, ...HINDI_LAYOUTS];

export default function KeyboardTester() {
  const [layoutId, setLayoutId] = useState(QWERTY.id);
  const [pressed, setPressed] = useState<string | null>(null);
  const [shiftDown, setShiftDown] = useState(false);
  const [lastTyped, setLastTyped] = useState<KeyCap | null>(null);

  const layout = useMemo(() => layoutById(layoutId), [layoutId]);
  const list = LAYOUTS;

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
      <div class="page-head">
        <h1>Tools</h1>
        <p>Keyboard tester — press any key to see what it produces on each layout.</p>
      </div>

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
