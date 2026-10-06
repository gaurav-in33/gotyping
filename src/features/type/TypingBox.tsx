/**
 * Minimal, reusable embedding of the typing engine — the same Session,
 * LayoutResolver and TextRenderer that power Type, with a small fixed-text
 * surface instead of the full ConfigBar. Learn and Practice both use this so
 * the engine has exactly one implementation (AGENT.md "one implementation
 * per feature"); only the chrome above/below differs per feature.
 */
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { Capture } from '../../core/engine/session';
import { Session, defaultSessionConfig, type BackspaceMode } from '../../core/engine/session';
import type { Metrics } from '../../core/engine/metrics';
import { LayoutResolver, unitsFromInsertedText } from '../../core/layouts/resolver';
import { QWERTY } from '../../core/layouts/qwerty';
import type { PhysicalLayout } from '../../core/layouts/qwerty';
import { TextRenderer } from './TextRenderer';
import { LiveStats, type LiveValues } from './LiveStats';
import { useSettings } from '../../ui/useSettings';

const now = (): number => performance.now();

const EMPTY_LIVE: LiveValues = {
  wpm: 0,
  accuracy: 100,
  errors: 0,
  time: 0,
  countdown: false,
  progress: 0,
  words: 0,
};

export interface TypingBoxProps {
  text: string;
  /** Bump to force a fresh session with the same or new text. */
  resetToken: number | string;
  layout?: PhysicalLayout;
  stopOnError?: boolean;
  backspace?: BackspaceMode;
  durationMs?: number;
  onComplete: (metrics: Metrics, capture: readonly Capture[]) => void;
  onFail?: (reason: string) => void;
  showLiveStats?: boolean;
}

export function TypingBox({
  text,
  resetToken,
  layout,
  stopOnError = false,
  backspace = 'allow',
  durationMs = 0,
  onComplete,
  onFail,
  showLiveStats = true,
}: TypingBoxProps) {
  const [settings] = useSettings();
  const [phase, setPhase] = useState<'ready' | 'typing' | 'done'>('ready');
  const [live, setLive] = useState<LiveValues>(EMPTY_LIVE);
  const [focused, setFocused] = useState(false);

  const textRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<TextRenderer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const resolverRef = useRef<LayoutResolver>(new LayoutResolver(layout ?? QWERTY));

  useEffect(() => {
    resolverRef.current.setLayout(layout ?? QWERTY);
  }, [layout]);

  const attachText = useCallback((el: HTMLDivElement | null) => {
    textRef.current = el;
    if (rendererRef.current) {
      rendererRef.current.destroy();
      rendererRef.current = null;
    }
    if (!el) return;
    const r = new TextRenderer();
    r.mount(el, { visibleLines: 3 });
    rendererRef.current = r;
    const sess = sessionRef.current;
    if (sess) {
      r.setText(sess.getUnits());
      r.refresh(sess.getStates(), sess.getPos());
    }
  }, []);

  // (Re)build a session whenever the text/config/resetToken changes.
  useEffect(() => {
    const sess = new Session(text, {
      ...defaultSessionConfig,
      stopOnError,
      backspace,
      durationMs,
      endOnLastUnit: durationMs === 0,
    });
    sessionRef.current = sess;
    const r = rendererRef.current;
    if (r) {
      r.setText(sess.getUnits());
      r.refresh(sess.getStates(), 0);
    }
    setPhase('ready');
    setLive({ ...EMPTY_LIVE, time: durationMs > 0 ? durationMs / 1000 : 0, countdown: durationMs > 0 });

    return sess.on((e) => {
      if (e.type === 'start') setPhase('typing');
      else if (e.type === 'tick' || e.type === 'complete') {
        const m = sess.metrics(now());
        const total = sess.getUnits().length;
        setLive({
          wpm: m.wpm,
          accuracy: m.accuracy,
          errors: m.errors,
          time: durationMs > 0 ? Math.ceil(sess.remainingMs(now()) / 1000) : sess.activeMs(now()) / 1000,
          countdown: durationMs > 0,
          progress: total > 0 ? Math.min(1, sess.getPos() / total) : 0,
          words: m.correctWords + m.incorrectWords,
        });
        if (e.type === 'complete') {
          setPhase('done');
          onComplete(m, sess.getCapture());
        }
      } else if (e.type === 'fail') {
        setPhase('done');
        onFail?.(e.reason);
        onComplete(sess.metrics(now()), sess.getCapture());
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, resetToken, stopOnError, backspace, durationMs]);

  // Ticking clock for time-limited boxes.
  useEffect(() => {
    if (phase !== 'typing' || durationMs <= 0) return;
    const id = setInterval(() => sessionRef.current?.tick(now()), 100);
    return () => clearInterval(id);
  }, [phase, durationMs]);

  const feed = useCallback((unit: string) => {
    const sess = sessionRef.current;
    const r = rendererRef.current;
    if (!sess || sess.getStatus() === 'complete' || sess.getStatus() === 'failed') return;
    sess.handleChar(unit, now());
    if (r) r.update(sess.getStates(), sess.getPos());
  }, []);

  const back = useCallback(() => {
    const sess = sessionRef.current;
    const r = rendererRef.current;
    if (!sess) return;
    sess.handleBackspace(now());
    if (r) r.update(sess.getStates(), sess.getPos());
  }, []);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (phase === 'done') return;
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
        return;
      }
      const out = resolverRef.current.resolve(e);
      if (out.kind === 'char') {
        e.preventDefault();
        feed(out.unit);
      } else if (out.kind === 'backspace') {
        e.preventDefault();
        back();
      } else if (out.kind === 'enter') {
        e.preventDefault();
        feed('\n');
      }
    },
    [feed, back, phase],
  );

  const onBeforeInput = useCallback(
    (e: InputEvent) => {
      if (phase === 'done') return;
      const type = e.inputType;
      if (type === 'insertText' && typeof e.data === 'string') {
        e.preventDefault();
        for (const u of unitsFromInsertedText(e.data)) feed(u);
      } else if (type === 'deleteContentBackward') {
        e.preventDefault();
        back();
      }
    },
    [feed, back, phase],
  );

  useEffect(() => {
    const el = textRef.current;
    if (!el || !rendererRef.current) return;
    const id = requestAnimationFrame(() => rendererRef.current?.measure());
    const ro = new ResizeObserver(() => rendererRef.current?.measure());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [text]);

  const focusInput = (): void => inputRef.current?.focus();

  return (
    <div class="type">
      {showLiveStats ? <LiveStats v={live} settings={settings} /> : null}
      <div
        class="text"
        ref={attachText}
        data-caret={settings.display.smoothCaret ? 'smooth' : settings.display.caretStyle}
        onClick={focusInput}
        style={{ '--visible-lines': 3 } as unknown as string}
      >
        {!focused ? (
          <div class="text__overlay">
            <span>Click here or press a key to start typing</span>
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        class="type__input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        aria-label="Typing input"
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput as unknown as (e: Event) => void}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}


