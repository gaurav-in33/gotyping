import { useState } from 'preact/hooks';
import type { Metrics } from '../../core/engine/metrics';
import { isRecordable } from '../../core/engine/metrics';
import { LineChart } from '../../ui/components/Chart';

export interface ResultProps {
  metrics: Metrics;
  modeLabel: string;
  isPersonalBest: boolean;
  failed: string | null;
  onRestart: () => void;
  onNext: () => void;
  /** When set, the result banner shows an explicit pass/fail against these targets. */
  targetWpm?: number | null;
  targetAccuracy?: number | null;
}

/** Pass/fail against the configured (or lesson) targets — null target = no requirement. */
export function evaluatePass(
  wpm: number,
  accuracy: number,
  targetWpm?: number | null,
  targetAccuracy?: number | null,
): { hasTarget: boolean; passed: boolean } {
  const hasTarget = (targetWpm ?? null) !== null || (targetAccuracy ?? null) !== null;
  if (!hasTarget) return { hasTarget: false, passed: true };
  const wpmOk = targetWpm == null || wpm >= targetWpm;
  const accOk = targetAccuracy == null || accuracy >= targetAccuracy;
  return { hasTarget: true, passed: wpmOk && accOk };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function Result({
  metrics: m,
  modeLabel,
  isPersonalBest,
  failed,
  onRestart,
  onNext,
  targetWpm,
  targetAccuracy,
}: ResultProps) {
  const [copied, setCopied] = useState(false);
  const recordable = isRecordable(m);
  const { hasTarget, passed } = evaluatePass(m.wpm, m.accuracy, targetWpm, targetAccuracy);

  const copy = async (): Promise<void> => {
    const text =
      `GoTyping — ${modeLabel}\n` +
      `${m.wpm} wpm · ${m.accuracy}% accuracy · ${m.consistency}% consistency\n` +
      `raw ${m.rawWpm} wpm · ${m.cpm} cpm · ${m.errors} errors · ${Math.round(m.timeMs / 1000)}s`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section class="result" aria-label="Test result">
      {failed ? (
        <p class="toast toast--error" role="status" style={{ position: 'static', transform: 'none' }}>
          {failed}
        </p>
      ) : null}

      {!failed && hasTarget ? (
        <p
          class={`result__pass result__pass--${passed ? 'ok' : 'no'}`}
          role="status"
        >
          {passed ? 'Target met — pass' : 'Below target — try again'}
          {targetWpm != null ? ` · target ${targetWpm} wpm` : ''}
          {targetAccuracy != null ? ` · target ${targetAccuracy}% accuracy` : ''}
        </p>
      ) : null}

      <div class="result__hero">
        <dl class="result__big result__big--accent">
          <dt>wpm</dt>
          <dd>{m.wpm}</dd>
        </dl>
        <dl class="result__big">
          <dt>accuracy</dt>
          <dd>{m.accuracy}%</dd>
        </dl>
        <dl class="result__sub">
          <Stat label="raw" value={m.rawWpm} />
          <Stat label="consistency" value={`${m.consistency}%`} />
          <Stat label="errors" value={m.errors} />
        </dl>
        {isPersonalBest ? <span class="badge">New best</span> : null}
      </div>

      <LineChart
        ariaLabel={`Raw words per minute over ${m.perSecond.length} seconds`}
        xLabel="seconds"
        series={[{ points: m.perSecond, color: 'var(--chart1)', label: 'raw wpm' }]}
      />

      <div class="type__actions">
        <button class="btn btn--primary" type="button" onClick={onNext}>
          Next test
        </button>
        <button class="btn" type="button" onClick={onRestart}>
          Repeat
        </button>
        <button class="btn btn--ghost" type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy result'}
        </button>
      </div>

      <details class="disclosure">
        <summary>Details</summary>
        <dl class="result__details">
          <Stat label="cpm" value={m.cpm} />
          <Stat label="time" value={`${Math.round(m.timeMs / 100) / 10}s`} />
          <Stat label="keystrokes" value={m.keystrokes} />
          <Stat label="correct keys" value={m.correctKeystrokes} />
          <Stat label="correct chars" value={m.correctChars} />
          <Stat label="uncorrected" value={m.uncorrectedErrors} />
          <Stat label="skipped chars" value={m.skippedChars} />
          <Stat label="correct words" value={m.correctWords} />
          <Stat label="incorrect words" value={m.incorrectWords} />
          <Stat label="skipped words" value={m.skippedWords} />
        </dl>
      </details>

      {!recordable ? (
        <p class="result__note">
          Too short to save — tests under 2 seconds or 5 keystrokes are shown but not
          added to your records.
        </p>
      ) : null}
    </section>
  );
}
