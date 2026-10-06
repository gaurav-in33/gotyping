/**
 * Raw-event viewer for reproducing Android Gboard / iOS soft-keyboard input.
 * It deliberately uses the same KeyboardInputReader as every typing screen.
 */
import { useRef, useState } from 'preact/hooks';
import { KeyboardInputReader, keyCodeOf, type ReaderOutput } from '../../core/input/keyboard-reader';
import { layoutById } from '../../core/layouts/hindi';
import { QWERTY } from '../../core/layouts/qwerty';
import type { PhysicalLayout } from '../../core/layouts/qwerty';
import './tools.css';

type RawRow = {
  id: number;
  type: string;
  key: string;
  code: string;
  data: string;
  inputType: string;
  isComposing: string;
  keyCode: string;
  final: string;
};

const MAX_ROWS = 80;

function value(v: unknown): string {
  return typeof v === 'string' ? v : '—';
}

function layoutFor(id: string): PhysicalLayout {
  if (id === 'qwerty') return QWERTY;
  return layoutById(id);
}

export function PhoneKeyboardTest() {
  const [layoutId, setLayoutId] = useState('inscript');
  const [rows, setRows] = useState<RawRow[]>([]);
  const [units, setUnits] = useState<string[]>([]);
  const readerRef = useRef<KeyboardInputReader | null>(null);
  if (!readerRef.current) {
    readerRef.current = new KeyboardInputReader(layoutFor('inscript'), {
      onUnit: (unit) => setUnits((all) => [...all, unit]),
      onBackspace: () => setUnits((all) => all.slice(0, -1)),
      onEnter: () => setUnits((all) => [...all, '↵']),
    });
  }
  readerRef.current.setLayout(layoutFor(layoutId));

  const addRow = (type: string, e: Event, output: ReaderOutput): void => {
    const input = e as InputEvent;
    const key = e as KeyboardEvent;
    const final = [
      ...output.units,
      ...(output.backspace ? ['⌫'] : []),
      ...(output.enter ? ['↵'] : []),
    ].join('') || '—';
    const row: RawRow = {
      id: Date.now() + Math.random(),
      type,
      key: value(key.key),
      code: value(key.code),
      data: value(input.data),
      inputType: value(input.inputType),
      isComposing: String(Boolean(input.isComposing)),
      keyCode: keyCodeOf(e) === null ? '—' : String(keyCodeOf(e)),
      final,
    };
    setRows((all) => [row, ...all].slice(0, MAX_ROWS));
  };

  return (
    <div class="tools phone-keyboard-test">
      <p class="hint">
        Use this on your real phone with English QWERTY selected. It records what the browser actually
        sends; no typing test text is involved. In Hindi/InScript, a raw <code>k</code> must end as <code>क</code>.
      </p>

      <label class="calc__field">
        Mapping layout
        <select
          class="btn btn--sm"
          aria-label="Phone keyboard mapping layout"
          value={layoutId}
          onChange={(e) => setLayoutId((e.target as HTMLSelectElement).value)}
        >
          <option value="inscript">Hindi — InScript</option>
          <option value="remington">Hindi — Remington (Beta)</option>
          <option value="qwerty">English QWERTY</option>
        </select>
      </label>

      <label class="calc__field">
        Phone keyboard test input
        <input
          class="tools__phone-input"
          type="text"
          inputMode="text"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          aria-label="Phone keyboard test input"
          placeholder="Tap here, then type on Gboard"
          onKeyDown={(e) => addRow('keydown', e as unknown as KeyboardEvent, readerRef.current!.onKeyDown(e as unknown as KeyboardEvent))}
          onBeforeInput={(e) =>
            addRow('beforeinput', e as unknown as InputEvent, readerRef.current!.onBeforeInput(e as unknown as InputEvent))
          }
          onInput={(e) => addRow('input', e as unknown as InputEvent, readerRef.current!.onInput(e as unknown as InputEvent))}
          onCompositionStart={(e) =>
            addRow('compositionstart', e as unknown as CompositionEvent, readerRef.current!.onCompositionStart(e as unknown as CompositionEvent))
          }
          onCompositionUpdate={(e) =>
            addRow('compositionupdate', e as unknown as CompositionEvent, readerRef.current!.onCompositionUpdate(e as unknown as CompositionEvent))
          }
          onCompositionEnd={(e) =>
            addRow('compositionend', e as unknown as CompositionEvent, readerRef.current!.onCompositionEnd(e as unknown as CompositionEvent))
          }
        />
      </label>

      <div class="panel tools__readout" role="status">
        <span class="hint">Final units</span>
        <output class="tools__phone-output">{units.join('') || '—'}</output>
        <button class="btn btn--ghost btn--sm" type="button" onClick={() => { setRows([]); setUnits([]); }}>
          Clear
        </button>
      </div>

      <div class="phone-keyboard-test__events" role="region" aria-label="Phone keyboard raw events" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>key</th>
              <th>code</th>
              <th>data</th>
              <th>inputType</th>
              <th>isComposing</th>
              <th>keyCode</th>
              <th>Final unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                <td>{row.type}</td>
                <td>{row.key}</td>
                <td>{row.code}</td>
                <td>{row.data}</td>
                <td>{row.inputType}</td>
                <td>{row.isComposing}</td>
                <td>{row.keyCode}</td>
                <td class="tools__phone-final">{row.final}</td>
              </tr>
            )) : (
              <tr><td colSpan={8} class="hint">No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
