import { useRef, useState } from 'preact/hooks';
import {
  convertCase,
  cleanText,
  formatText,
  fixPunctuationSpacing,
  type CaseMode,
} from '../../core/tools/textTools';
import { buildText } from '../../core/text/generators';
import { navigate } from '../../router';
import { settingsStore } from '../../store/settings';
import './tools.css';

const CASE_OPTIONS: Array<{ id: CaseMode; label: string }> = [
  { id: 'upper', label: 'UPPER' },
  { id: 'lower', label: 'lower' },
  { id: 'title', label: 'Title Case' },
  { id: 'sentence', label: 'Sentence case' },
  { id: 'camel', label: 'camelCase' },
  { id: 'snake', label: 'snake_case' },
  { id: 'kebab', label: 'kebab-case' },
];

/**
 * Text tools (docs/01 "Text tools"). All pure client-side string
 * transforms — a pasted or imported .txt file never leaves this tab
 * (no upload, no network call).
 */
export function TextTools() {
  const [text, setText] = useState('');
  const [wrapAt, setWrapAt] = useState(80);
  const [tabSize, setTabSize] = useState(2);
  const [genCount, setGenCount] = useState(50);
  const fileRef = useRef<HTMLInputElement>(null);

  const apply = (fn: (t: string) => string): void => setText((t) => fn(t));

  const onImport = (file: File): void => {
    if (!file.name.toLowerCase().endsWith('.txt') && file.type !== 'text/plain') {
      // Still allow it — just a friendly nudge, not a hard block.
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard permission denied — the textarea is still selectable. */
    }
  };

  return (
    <div class="tools">
      <div class="panel calc">
        <h3>Custom text generator</h3>
        <p class="hint">
          Generates a block of practice words you can copy anywhere. To actually type it with
          live stats, use Type's own Custom mode instead — this is for taking text elsewhere.
        </p>
        <div class="calc__row">
          <label class="calc__field">
            <span>Word count</span>
            <input
              type="number"
              min={5}
              max={1000}
              value={genCount}
              onInput={(e) => setGenCount(Number((e.target as HTMLInputElement).value) || 50)}
            />
          </label>
          <button
            class="btn btn--sm"
            type="button"
            onClick={() =>
              setText(
                buildText({
                  style: 'words',
                  words: COMMON_WORDS,
                  count: genCount,
                  seed: Date.now(),
                  punctuation: true,
                  capitalization: true,
                }),
              )
            }
          >
            Generate
          </button>
          <button
            class="btn btn--sm"
            type="button"
            onClick={() => {
              settingsStore.update((d) => void (d.typing.defaultMode = 'custom'));
              navigate('/');
            }}
          >
            Open Type's Custom mode →
          </button>
        </div>
      </div>

      <div class="panel calc">
        <h3>Working text</h3>
        <textarea
          class="calc__textarea"
          rows={8}
          placeholder="Paste text, import a .txt file, or generate one above…"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        />
        <div class="calc__row">
          <label class="btn btn--sm">
            Import .txt
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              class="sr-only"
              onChange={(e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) onImport(f);
              }}
            />
          </label>
          <button class="btn btn--sm" type="button" onClick={copy}>
            Copy
          </button>
          <button class="btn btn--sm" type="button" onClick={() => setText('')}>
            Clear
          </button>
        </div>
        <p class="hint">Stays in this tab only — nothing here is ever uploaded anywhere.</p>
      </div>

      <div class="panel calc">
        <h3>Case converter</h3>
        <div class="calc__row">
          {CASE_OPTIONS.map((o) => (
            <button
              key={o.id}
              class="btn btn--sm"
              type="button"
              onClick={() => apply((t) => convertCase(t, o.id))}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div class="panel calc">
        <h3>Text cleaner &amp; formatter</h3>
        <div class="calc__row">
          <button class="btn btn--sm" type="button" onClick={() => apply(cleanText)}>
            Clean whitespace
          </button>
          <button class="btn btn--sm" type="button" onClick={() => apply(fixPunctuationSpacing)}>
            Fix punctuation spacing
          </button>
        </div>
        <div class="calc__row">
          <label class="calc__field">
            <span>Wrap at column</span>
            <input
              type="number"
              min={0}
              value={wrapAt}
              onInput={(e) => setWrapAt(Number((e.target as HTMLInputElement).value) || 0)}
            />
          </label>
          <label class="calc__field">
            <span>Tab size</span>
            <input
              type="number"
              min={0}
              max={8}
              value={tabSize}
              onInput={(e) => setTabSize(Number((e.target as HTMLInputElement).value) || 0)}
            />
          </label>
          <button
            class="btn btn--sm"
            type="button"
            onClick={() => apply((t) => formatText(t, { wrapAt, tabSize }))}
            style={{ alignSelf: 'flex-end' }}
          >
            Apply formatting
          </button>
        </div>
      </div>
    </div>
  );
}

// A small built-in pool so the generator works without picking a language
// pack first; Type's own Custom mode is still the real typing surface.
const COMMON_WORDS = [
  'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'keyboard', 'practice',
  'speed', 'accuracy', 'rhythm', 'focus', 'words', 'typing', 'test', 'finger', 'home', 'row',
  'learn', 'build', 'habit', 'daily', 'streak', 'level', 'goal', 'timer', 'session', 'text',
];
