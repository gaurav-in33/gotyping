import type { Settings } from '../../store/settings';

export interface LiveValues {
  wpm: number;
  accuracy: number;
  errors: number;
  /** Seconds remaining (time mode) or elapsed (everything else). */
  time: number;
  countdown: boolean;
  progress: number;
  /** Words completed (correct + incorrect) so far. */
  words: number;
}

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function LiveStats({ v, settings }: { v: LiveValues; settings: Settings }) {
  const show = settings.display.liveStats;
  const anyText = show.wpm || show.accuracy || show.errors || show.timer || show.words;

  return (
    <div class="livestats" aria-live="off">
      {show.timer ? (
        <div class="livestats__item">
          <span class="livestats__value livestats__value--accent">{fmtTime(v.time)}</span>
        </div>
      ) : null}

      {show.wpm ? (
        <div class="livestats__item">
          <span class="livestats__value">{Math.round(v.wpm)}</span>
          <span>wpm</span>
        </div>
      ) : null}

      {show.accuracy ? (
        <div class="livestats__item">
          <span class="livestats__value">{Math.round(v.accuracy)}%</span>
          <span>acc</span>
        </div>
      ) : null}

      {show.errors ? (
        <div class="livestats__item">
          <span class="livestats__value">{v.errors}</span>
          <span>errors</span>
        </div>
      ) : null}

      {show.words ? (
        <div class="livestats__item">
          <span class="livestats__value">{v.words}</span>
          <span>words</span>
        </div>
      ) : null}

      {show.progress ? (
        <div
          class="progressbar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(v.progress * 100)}
          aria-label="Test progress"
        >
          <div class="progressbar__fill" style={{ width: `${v.progress * 100}%` }} />
        </div>
      ) : null}

      {!anyText && !show.progress ? <span class="sr-only">Live stats are hidden</span> : null}
    </div>
  );
}
