/**
 * Typing session state machine (docs/04-TYPING-ENGINE.md).
 *
 * Pure logic: no DOM, no timers of its own. The UI drives it by calling
 * handleChar / handleBackspace / tick and reads an immutable-ish snapshot.
 *
 * Hot-path contract: handleChar and handleBackspace are O(1) amortized and
 * allocation-light. Per-unit state lives in a Uint8Array; counters are plain
 * numbers. Nothing here touches storage.
 */
import { Emitter, type EngineListener, type FailReason } from './events';
import {
  computeMetrics,
  UNIT_CORRECT,
  UNIT_PENDING,
  UNIT_SKIPPED,
  UNIT_WRONG,
  type Metrics,
} from './metrics';

export type BackspaceMode = 'allow' | 'word' | 'off';
export type SessionStatus = 'idle' | 'running' | 'paused' | 'complete' | 'failed';

export interface SessionConfig {
  /** Wrong unit does not advance the caret; the unit stays pending. */
  stopOnError: boolean;
  backspace: BackspaceMode;
  /** Space in the middle of a word skips the rest of that word. */
  skipWord: boolean;
  /** Master / sudden death: fail on the first mistake. */
  failOnMistake: boolean;
  /** Expert: fail if a word is completed with an uncorrected error. */
  failOnWordError: boolean;
  /** Time mode duration in ms. 0 = not time limited. */
  durationMs: number;
  /** Words / Quote / Lesson end on the last unit. */
  endOnLastUnit: boolean;
  /** Zen: free typing, no target text, never auto-completes. */
  zen: boolean;
}

export const defaultSessionConfig: SessionConfig = {
  stopOnError: false,
  backspace: 'allow',
  skipWord: true,
  failOnMistake: false,
  failOnWordError: false,
  durationMs: 0,
  endOnLastUnit: true,
  zen: false,
};

/** One row of the per-keystroke capture buffer (folded into aggregates later). */
export interface Capture {
  expected: string | null;
  typed: string;
  latencyMs: number;
  ok: boolean;
}

interface SkipBlock {
  start: number;
  end: number; // exclusive: last skipped unit + 1
  spaceIdx: number; // index of the separator space that was consumed, or -1
}

/** Split text into code-point units after NFC normalization (docs/04). */
export function toUnits(text: string): string[] {
  return Array.from(text.normalize('NFC'));
}

export class Session {
  readonly events = new Emitter();

  private units: string[] = [];
  private states: Uint8Array = new Uint8Array(0);
  private pos = 0;

  private keystrokes = 0;
  private mistakes = 0;

  private status: SessionStatus = 'idle';
  private failReason: FailReason | null = null;

  /** Active ms accumulated before the current running stretch. */
  private bankedMs = 0;
  private runningSince: number | null = null;
  private lastKeyT: number | null = null;

  private perSecond: number[] = [];
  private sampledSeconds = 0;
  private keystrokesAtLastSample = 0;

  private lastSkip: SkipBlock | null = null;
  private capture: Capture[] = [];

  private lastTickEmit = 0;

  constructor(
    text: string,
    public config: SessionConfig = defaultSessionConfig,
    /** Time mode: supply more text when the caret nears the end. */
    private extend?: (approxUnits: number) => string,
  ) {
    this.setText(text);
  }

  // ---------------------------------------------------------------- text

  setText(text: string): void {
    this.units = this.config.zen ? [] : toUnits(text);
    this.states = new Uint8Array(this.units.length);
    this.pos = 0;
  }

  /** Append more units without disturbing progress (time mode). */
  appendText(text: string): void {
    const more = toUnits(text);
    if (more.length === 0) return;
    const next = new Uint8Array(this.states.length + more.length);
    next.set(this.states, 0);
    this.states = next;
    for (let i = 0; i < more.length; i++) this.units.push(more[i]!);
  }

  // ------------------------------------------------------------- queries

  getUnits(): readonly string[] {
    return this.units;
  }
  getStates(): Uint8Array {
    return this.states;
  }
  getPos(): number {
    return this.pos;
  }
  getStatus(): SessionStatus {
    return this.status;
  }
  getFailReason(): FailReason | null {
    return this.failReason;
  }
  getCapture(): readonly Capture[] {
    return this.capture;
  }
  getKeystrokes(): number {
    return this.keystrokes;
  }
  getMistakes(): number {
    return this.mistakes;
  }

  activeMs(now?: number): number {
    if (this.runningSince !== null && now !== undefined) {
      return this.bankedMs + Math.max(0, now - this.runningSince);
    }
    return this.bankedMs;
  }

  /** Remaining ms in a time-limited test (Infinity when untimed). */
  remainingMs(now: number): number {
    if (this.config.durationMs <= 0) return Infinity;
    return Math.max(0, this.config.durationMs - this.activeMs(now));
  }

  metrics(now?: number): Metrics {
    return computeMetrics({
      states: this.states,
      units: this.units,
      keystrokes: this.keystrokes,
      mistakes: this.mistakes,
      activeMs: this.activeMs(now),
      perSecond: this.perSecond,
    });
  }

  on(fn: EngineListener): () => void {
    return this.events.on(fn);
  }

  // --------------------------------------------------------------- clock

  private start(t: number): void {
    this.status = 'running';
    this.runningSince = t;
    this.lastKeyT = t;
    this.events.emit({ type: 'start', t });
  }

  pause(t: number): void {
    if (this.status !== 'running') return;
    this.bankedMs = this.activeMs(t);
    this.runningSince = null;
    this.status = 'paused';
    this.events.emit({ type: 'pause', t });
  }

  resume(t: number): void {
    if (this.status !== 'paused') return;
    this.runningSince = t;
    this.lastKeyT = t;
    this.status = 'running';
    this.events.emit({ type: 'resume', t });
  }

  /**
   * Called by the UI on a frame/interval. Emits `tick` at most 4 Hz,
   * samples the per-second series and ends a time-limited test.
   */
  tick(t: number): void {
    if (this.status !== 'running') return;
    const ms = this.activeMs(t);
    this.sampleTo(ms);
    if (this.config.durationMs > 0 && ms >= this.config.durationMs) {
      this.complete(t);
      return;
    }
    if (t - this.lastTickEmit >= 250) {
      this.lastTickEmit = t;
      this.events.emit({ type: 'tick', t });
    }
  }

  /** Fill the per-second raw-WPM series up to `ms` of active time. */
  private sampleTo(ms: number): void {
    const seconds = Math.floor(ms / 1000);
    while (this.sampledSeconds < seconds) {
      const delta = this.keystrokes - this.keystrokesAtLastSample;
      this.keystrokesAtLastSample = this.keystrokes;
      // chars in one second -> WPM: chars / 5 * 60
      this.perSecond.push(delta * 12);
      this.sampledSeconds++;
    }
  }

  // --------------------------------------------------------------- input

  /**
   * Handle one typed character unit. `t` is a monotonic timestamp (ms).
   */
  handleChar(ch: string, t: number): void {
    if (this.status === 'complete' || this.status === 'failed') return;
    if (this.status === 'idle') this.start(t);
    if (this.status === 'paused') this.resume(t);

    const latency = this.lastKeyT === null ? 0 : Math.max(0, t - this.lastKeyT);
    this.lastKeyT = t;
    this.sampleTo(this.activeMs(t));

    // Zen: free typing, nothing to compare against.
    if (this.config.zen) {
      this.keystrokes++;
      this.capture.push({ expected: null, typed: ch, latencyMs: latency, ok: true });
      this.events.emit({ type: 'keystroke', unit: ch, expected: null, ok: true, t });
      return;
    }

    this.ensureText();

    const expected = this.pos < this.units.length ? this.units[this.pos]! : null;

    // --- space handling: match, skip-word, or dead space at word start
    if (ch === ' ' && expected !== ' ') {
      const atWordStart = this.pos === 0 || this.units[this.pos - 1] === ' ';
      if (atWordStart || !this.config.skipWord) {
        // Does nothing, but still counts as a (mistaken) keystroke.
        this.keystrokes++;
        this.mistakes++;
        this.lastSkip = null;
        this.capture.push({ expected, typed: ch, latencyMs: latency, ok: false });
        this.events.emit({ type: 'keystroke', unit: ch, expected, ok: false, t });
        this.events.emit({ type: 'mistake', expected, typed: ch, t });
        if (this.config.failOnMistake) return this.fail('master-mistake', t);
        return;
      }
      return this.skipRestOfWord(latency, t);
    }

    this.keystrokes++;
    const ok = expected !== null && ch === expected;
    this.capture.push({ expected, typed: ch, latencyMs: latency, ok });
    this.events.emit({ type: 'keystroke', unit: ch, expected, ok, t });

    if (ok) {
      this.states[this.pos] = UNIT_CORRECT;
      this.pos++;
      this.lastSkip = null;
      // Expert: a word just finished — check it for uncorrected errors.
      if (this.config.failOnWordError && expected === ' ' && this.wordBeforeHasError()) {
        return this.fail('expert-word', t);
      }
      this.afterAdvance(t);
      return;
    }

    this.mistakes++;
    this.lastSkip = null;
    this.events.emit({ type: 'mistake', expected, typed: ch, t });

    if (this.config.failOnMistake) return this.fail('master-mistake', t);

    if (!this.config.stopOnError && expected !== null) {
      this.states[this.pos] = UNIT_WRONG;
      this.pos++;
      this.afterAdvance(t);
    }
    // stop-on-error: caret stays, unit stays pending.
  }

  /** Space typed mid-word: rest of the word is skipped, separator consumed. */
  private skipRestOfWord(latency: number, t: number): void {
    const from = this.pos;
    let i = this.pos;
    while (i < this.units.length && this.units[i] !== ' ') i++;
    const spaceIdx = i < this.units.length ? i : -1;

    for (let k = from; k < i; k++) this.states[k] = UNIT_SKIPPED;

    // The typed space counts as a correct keystroke and consumes the separator.
    this.keystrokes++;
    this.capture.push({ expected: ' ', typed: ' ', latencyMs: latency, ok: true });
    this.events.emit({ type: 'keystroke', unit: ' ', expected: ' ', ok: true, t });

    if (spaceIdx >= 0) {
      this.states[spaceIdx] = UNIT_CORRECT;
      this.pos = spaceIdx + 1;
    } else {
      this.pos = this.units.length;
    }
    this.lastSkip = { start: from, end: i, spaceIdx };
    this.events.emit({ type: 'skip', from, to: i, t });
    this.afterAdvance(t);
  }

  /** True when the word immediately before the caret contains a wrong unit. */
  private wordBeforeHasError(): boolean {
    let end = this.pos - 1; // the space we just typed
    let i = end - 1;
    while (i >= 0 && this.units[i] !== ' ') {
      if (this.states[i] === UNIT_WRONG) return true;
      i--;
    }
    return false;
  }

  private afterAdvance(t: number): void {
    this.ensureText();
    if (!this.config.zen && this.config.endOnLastUnit && this.config.durationMs <= 0) {
      if (this.pos >= this.units.length) this.complete(t);
    }
  }

  /** Time mode: keep a buffer of text ahead of the caret. */
  private ensureText(): void {
    if (!this.extend) return;
    if (this.config.durationMs <= 0 && this.config.endOnLastUnit) return;
    const remaining = this.units.length - this.pos;
    if (remaining < 120) this.appendText(this.extend(200));
  }

  handleBackspace(t: number): void {
    if (this.status === 'complete' || this.status === 'failed') return;
    if (this.config.backspace === 'off') return;
    if (this.pos === 0) return;

    // Undo a skip: restore the whole skipped block.
    const skip = this.lastSkip;
    if (skip && this.pos === (skip.spaceIdx >= 0 ? skip.spaceIdx + 1 : this.units.length)) {
      for (let k = skip.start; k < skip.end; k++) this.states[k] = UNIT_PENDING;
      if (skip.spaceIdx >= 0) this.states[skip.spaceIdx] = UNIT_PENDING;
      this.pos = skip.start;
      this.lastSkip = null;
      this.events.emit({ type: 'undo', from: skip.start, to: skip.end, t });
      return;
    }

    if (this.config.backspace === 'word') {
      // Cannot move before the start of the current word.
      let wordStart = this.pos;
      while (wordStart > 0 && this.units[wordStart - 1] !== ' ') wordStart--;
      if (this.pos <= wordStart) return;
    }

    this.pos--;
    this.states[this.pos] = UNIT_PENDING;
    this.lastSkip = null;
    // Backspace never reduces keystrokes or mistakes (docs/04).
  }

  // ------------------------------------------------------------ finishing

  complete(t: number): void {
    if (this.status === 'complete' || this.status === 'failed') return;
    this.bankedMs = this.activeMs(t);
    // For a time test the recorded time is the configured duration.
    if (this.config.durationMs > 0) this.bankedMs = Math.min(this.bankedMs, this.config.durationMs);
    this.runningSince = null;
    this.sampleTo(this.bankedMs);
    this.status = 'complete';
    this.events.emit({ type: 'complete', metrics: this.metrics(), t });
  }

  private fail(reason: FailReason, t: number): void {
    this.bankedMs = this.activeMs(t);
    this.runningSince = null;
    this.status = 'failed';
    this.failReason = reason;
    this.events.emit({ type: 'fail', reason, t });
  }

  /** Reset for a fresh attempt. Optionally with new text. */
  restart(text?: string): void {
    if (text !== undefined) this.setText(text);
    else this.states = new Uint8Array(this.units.length);
    this.pos = 0;
    this.keystrokes = 0;
    this.mistakes = 0;
    this.status = 'idle';
    this.failReason = null;
    this.bankedMs = 0;
    this.runningSince = null;
    this.lastKeyT = null;
    this.perSecond = [];
    this.sampledSeconds = 0;
    this.keystrokesAtLastSample = 0;
    this.lastSkip = null;
    this.capture = [];
    this.lastTickEmit = 0;
  }
}
