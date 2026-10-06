import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Metrics } from '../../core/engine/metrics';
import { buildText } from '../../core/text/generators';
import { loadLanguage, type LanguagePack } from '../../content';
import { TypingBox } from '../type/TypingBox';
import { layoutById } from '../../core/layouts/hindi';
import { QWERTY } from '../../core/layouts/qwerty';
import './tools.css';

const DURATIONS = [
  { id: 300, label: '5 min' },
  { id: 600, label: '10 min' },
  { id: 900, label: '15 min' },
];

/** Buffer so the passage is never exhausted before time runs out. */
function bufferWordsFor(seconds: number): number {
  return Math.max(120, Math.round((seconds / 60) * 220));
}

/**
 * Government-exam-style practice (docs/01 Hindi/Indian typing). Clearly
 * labelled as practice modeled on common formats, not an official exam.
 * Reuses TypingBox (the one typing-engine embedding) and Metrics' existing
 * wpm/rawWpm split for the net/gross-speed convention these exams use.
 */
export function ExamPractice() {
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [seconds, setSeconds] = useState(600);
  const [pack, setPack] = useState<LanguagePack | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [result, setResult] = useState<Metrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadLanguage(lang).then((p) => {
      if (!cancelled) setPack(p);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);

  const text = useMemo(() => {
    if (!pack) return '';
    return buildText({
      style: 'paragraph',
      words: pack.words,
      count: bufferWordsFor(seconds),
      seed: `${lang}-${seconds}-${resetToken}`,
    });
  }, [pack, seconds, lang, resetToken]);

  const layout = lang === 'hi' ? layoutById('inscript') : QWERTY;

  const start = (): void => {
    setResult(null);
    setResetToken((n) => n + 1);
  };

  // Standard exam convention: net speed = correct words typed, after
  // subtracting a penalty of errors from the gross (raw keystroke) speed.
  // We show both GoTyping metrics plainly rather than inventing a single
  // "pass" number, since real exam error-deduction rules vary by board.
  return (
    <div class="tools">
      <div class="panel calc">
        <h3>Exam-style timed passage</h3>
        <p class="hint">
          <strong>Practice only — not an official exam.</strong> Modeled on common government
          typing-test formats (timed passage, gross vs. net speed, errors counted). Actual exam
          rules vary by board/department; always check the official notification.
        </p>
        <div class="calc__row">
          <div class="segmented" role="radiogroup" aria-label="Language">
            {(['en', 'hi'] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l === 'en' ? 'English' : 'Hindi'}
              </button>
            ))}
          </div>
          <div class="segmented" role="radiogroup" aria-label="Duration">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                aria-pressed={seconds === d.id}
                onClick={() => setSeconds(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button class="btn btn--sm btn--primary" type="button" onClick={start} disabled={!pack}>
            {resetToken === 0 ? 'Start' : 'Restart'}
          </button>
        </div>
      </div>

      {resetToken > 0 && text ? (
        <div class="panel">
          <TypingBox
            key={resetToken}
            text={text}
            resetToken={resetToken}
            layout={layout}
            durationMs={seconds * 1000}
            onComplete={(m) => setResult(m)}
          />
        </div>
      ) : null}

      {result ? (
        <div class="panel calc" role="status">
          <h3>Result</h3>
          <div class="calc__grid">
            <span>
              <strong>{result.rawWpm}</strong> gross WPM
            </span>
            <span>
              <strong>{result.wpm}</strong> net WPM
            </span>
            <span>
              <strong>{result.accuracy}%</strong> accuracy
            </span>
            <span>
              <strong>{result.errors}</strong> errors (corrected + live)
            </span>
            <span>
              <strong>{result.uncorrectedErrors}</strong> uncorrected errors
            </span>
          </div>
          <p class="hint">
            Gross speed counts every keystroke typed; net speed only counts correct characters —
            the same split most exam boards use, though the exact error-deduction formula differs
            by board. See their official notification for the real pass criteria.
          </p>
        </div>
      ) : null}
    </div>
  );
}
