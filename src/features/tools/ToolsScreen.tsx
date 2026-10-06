import { useState } from 'preact/hooks';
import { KeyboardTesterPanel } from './KeyboardTester';
import { Calculators } from './Calculators';
import { TextTools } from './TextTools';
import { HindiTools } from './HindiTools';
import { ExamPractice } from './ExamPractice';
import { Productivity } from './Productivity';
import { PhoneKeyboardTest } from './PhoneKeyboardTest';
import './tools.css';

type Tab = 'calculators' | 'keyboard' | 'phone-keyboard' | 'text' | 'hindi' | 'exam' | 'productivity';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'calculators', label: 'Typing utilities' },
  { id: 'keyboard', label: 'Keyboard' },
  { id: 'phone-keyboard', label: 'Phone keyboard test' },
  { id: 'text', label: 'Text tools' },
  { id: 'hindi', label: 'Hindi / Indian' },
  { id: 'exam', label: 'Exam practice' },
  { id: 'productivity', label: 'Productivity' },
];

function initialTab(): Tab {
  if (typeof location === 'undefined') return 'calculators';
  const q = new URLSearchParams(location.search).get('tab');
  return (TABS.some((t) => t.id === q) ? q : 'calculators') as Tab;
}

/**
 * Tools: one section, clean categories, practical only (docs/01 §6).
 * Each tab is its own small file; this screen only owns the tab chrome so
 * no single file becomes a dumping ground (AGENT.md "one purpose per screen").
 */
export default function ToolsScreen() {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div class="tools-screen">
      <div class="page-head">
        <h1>Tools</h1>
        <p>Practical utilities — not a second typing test. Everything here runs on this device.</p>
      </div>

      <div class="segmented" role="tablist" aria-label="Tools category">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div class="tools__tabpanel" role="tabpanel">
        {tab === 'calculators' ? <Calculators /> : null}
        {tab === 'keyboard' ? (
          <div class="tools">
            <p class="hint">
              The key-by-key error heatmap lives in Stats → Keys, built from your own history — it
              is linked there rather than duplicated here.
            </p>
            <KeyboardTesterPanel />
          </div>
        ) : null}
        {tab === 'phone-keyboard' ? <PhoneKeyboardTest /> : null}
        {tab === 'text' ? <TextTools /> : null}
        {tab === 'hindi' ? <HindiTools /> : null}
        {tab === 'exam' ? <ExamPractice /> : null}
        {tab === 'productivity' ? <Productivity /> : null}
      </div>
    </div>
  );
}
