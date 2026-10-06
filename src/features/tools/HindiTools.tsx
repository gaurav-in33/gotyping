import { useState } from 'preact/hooks';
import { KeyboardTesterPanel } from './KeyboardTester';
import { INSCRIPT, REMINGTON } from '../../core/layouts/hindi';
import { navigate } from '../../router';
import { settingsStore } from '../../store/settings';
import './tools.css';

/**
 * Hindi / Indian typing tools (docs/01). Reuses the Keyboard tester panel
 * for the reference tables (one implementation, per AGENT.md) and links out
 * to Type/Learn for actual practice instead of re-implementing a typing
 * surface here. The KrutiDev↔Unicode converter is intentionally omitted —
 * see docs/layout-sources.md for why.
 */
export function HindiTools() {
  const [ref, setRef] = useState<'inscript' | 'remington'>('inscript');

  const goPractice = (lang: 'hi' | 'hinglish'): void => {
    settingsStore.update((d) => void (d.language.current = lang));
    navigate('/');
  };

  return (
    <div class="tools">
      <div class="panel calc">
        <h3>Hindi keyboard reference</h3>
        <div class="segmented" role="tablist" aria-label="Hindi layout reference">
          <button type="button" role="tab" aria-selected={ref === 'inscript'} onClick={() => setRef('inscript')}>
            InScript {INSCRIPT.verified ? '' : '(Beta)'}
          </button>
          <button type="button" role="tab" aria-selected={ref === 'remington'} onClick={() => setRef('remington')}>
            Remington (Gail) {REMINGTON.verified ? '' : '(Beta)'}
          </button>
        </div>
        <KeyboardTesterPanel initialLayoutId={ref} key={ref} />
      </div>

      <div class="panel calc">
        <h3>Unicode notes</h3>
        <ul class="privacy-list">
          <li>
            Devanagari text in GoTyping is plain Unicode (U+0900–U+097F) — the same encoding used
            by every modern OS, browser and font, including the Noto Sans Devanagari stack this
            app ships with.
          </li>
          <li>
            Conjuncts (जोड़ाक्षर) are typed as separate Unicode characters joined by a virama
            (्, U+094D); InScript and Remington both produce it from a dedicated key.
          </li>
          <li>
            Older Hindi content online often uses <strong>KrutiDev</strong>, a non-Unicode font
            encoding (glyphs placed at Latin code points) rather than true Devanagari Unicode —
            which is why pasting it elsewhere shows mojibake. GoTyping does not include a
            KrutiDev↔Unicode converter: no mapping found this session could be verified against
            an authoritative source, so nothing guessed has shipped (see
            docs/layout-sources.md).
          </li>
        </ul>
      </div>

      <div class="panel calc">
        <h3>Government-exam-style practice</h3>
        <p class="hint">
          <strong>Exam-style, not official.</strong> Timed passage typing with gross/net speed and
          standard error rules — modeled on common government typing-exam formats, but this is
          not any official exam and is not affiliated with one.
        </p>
        <button class="btn btn--sm" type="button" onClick={() => navigate('/tools?tab=exam')}>
          Open exam practice →
        </button>
      </div>

      <div class="panel calc">
        <h3>Practice in Hindi</h3>
        <p class="hint">Hindi practice itself lives in Type and Learn — this just switches you there.</p>
        <div class="calc__row">
          <button class="btn btn--sm" type="button" onClick={() => goPractice('hi')}>
            Type in Hindi →
          </button>
          <button class="btn btn--sm" type="button" onClick={() => goPractice('hinglish')}>
            Type in Hinglish →
          </button>
        </div>
      </div>
    </div>
  );
}
