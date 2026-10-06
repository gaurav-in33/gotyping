import { useMemo, useState } from 'preact/hooks';
import { wpmFrom, cpmFrom, accuracyFrom, analyzeText } from '../../core/tools/calculators';
import { navigate } from '../../router';
import './tools.css';

function NumberField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  return (
    <label class="calc__field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onInput={(e) => onChange(Math.max(min, Number((e.target as HTMLInputElement).value) || 0))}
      />
    </label>
  );
}

/**
 * Manual typing calculators (docs/01 "Typing utilities"). "Typing speed
 * test" is deliberately just a link into Type, never a second
 * implementation — these panels are for numbers the user already has
 * (a paper test, another app, an exam slip).
 */
export function Calculators() {
  const [chars, setChars] = useState(250);
  const [seconds, setSeconds] = useState(60);
  const [correctKeys, setCorrectKeys] = useState(90);
  const [totalKeys, setTotalKeys] = useState(100);
  const [text, setText] = useState('');

  const wpm = useMemo(() => wpmFrom({ correctChars: chars, seconds }), [chars, seconds]);
  const cpm = useMemo(() => cpmFrom({ correctChars: chars, seconds }), [chars, seconds]);
  const accuracy = useMemo(
    () => accuracyFrom({ correctKeystrokes: correctKeys, totalKeystrokes: totalKeys }),
    [correctKeys, totalKeys],
  );
  const stats = useMemo(() => analyzeText(text), [text]);

  return (
    <div class="tools">
      <div class="panel calc">
        <h3>WPM / CPM calculator</h3>
        <p class="hint">
          Same formula GoTyping uses live: words = correct characters ÷ 5. Already took a test
          elsewhere? Plug the numbers in here.
        </p>
        <div class="calc__row">
          <NumberField label="Correct characters" value={chars} onChange={setChars} />
          <NumberField label="Seconds" value={seconds} onChange={setSeconds} min={1} />
        </div>
        <div class="calc__result">
          <span>
            <strong>{wpm}</strong> WPM
          </span>
          <span>
            <strong>{cpm}</strong> CPM
          </span>
        </div>
        <button class="btn btn--sm" type="button" onClick={() => navigate('/')}>
          Take a real typing test instead →
        </button>
      </div>

      <div class="panel calc">
        <h3>Accuracy calculator</h3>
        <div class="calc__row">
          <NumberField label="Correct keystrokes" value={correctKeys} onChange={setCorrectKeys} />
          <NumberField label="Total keystrokes" value={totalKeys} onChange={setTotalKeys} />
        </div>
        <div class="calc__result">
          <span>
            <strong>{accuracy}%</strong> accuracy
          </span>
        </div>
      </div>

      <div class="panel calc">
        <h3>Word / character counter &amp; text analyzer</h3>
        <textarea
          class="calc__textarea"
          rows={6}
          placeholder="Paste or type text to analyze…"
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        />
        <div class="calc__grid">
          <span>
            <strong>{stats.words}</strong> words
          </span>
          <span>
            <strong>{stats.characters}</strong> characters
          </span>
          <span>
            <strong>{stats.charactersNoSpaces}</strong> chars (no spaces)
          </span>
          <span>
            <strong>{stats.sentences}</strong> sentences
          </span>
          <span>
            <strong>{stats.lines}</strong> lines
          </span>
          <span>
            <strong>{stats.readingMinutes}</strong> min to read
          </span>
          <span>
            <strong>{stats.typingMinutes}</strong> min to type (~40 wpm)
          </span>
        </div>
      </div>
    </div>
  );
}
