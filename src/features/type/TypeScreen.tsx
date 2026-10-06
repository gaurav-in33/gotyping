import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Session, defaultSessionConfig } from '../../core/engine/session';
import type { Metrics } from '../../core/engine/metrics';
import { isRecordable } from '../../core/engine/metrics';
import { buildText } from '../../core/text/generators';
import { LayoutResolver, unitsFromInsertedText } from '../../core/layouts/resolver';
import { QWERTY } from '../../core/layouts/qwerty';
import { INSCRIPT } from '../../core/layouts/hindi';
import { loadLanguage, type LanguagePack } from '../../content';
import { useSettings } from '../../ui/useSettings';
import { historyRepo, makeTestRecord, personalBest } from '../../store/history';
import { foldTest } from '../../store/aggregates';
import { idb, STORES } from '../../store/db';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import { TextRenderer } from './TextRenderer';
import { ConfigBar, summarize, type TestConfig } from './ConfigBar';
import { LiveStats, type LiveValues } from './LiveStats';
import { Result } from './Result';
import './type.css';

const now = (): number => performance.now();

const EMPTY_LIVE: LiveValues = {
  wpm: 0,
  accuracy: 100,
  errors: 0,
  time: 0,
  countdown: false,
  progress: 0,
};

export default function TypeScreen() {
  const [settings, updateSettings] = useSettings();
  const lang = settings.language.current;

  const [config, setConfig] = useState<TestConfig>(() => ({
    mode: settings.typing.defaultMode === 'custom' ? 'custom' : settings.typing.defaultMode,
    seconds: settings.typing.defaultTime,
    wordCount: settings.typing.defaultWords,
    style: 'words',
    custom: '',
  }));

  const [pack, setPack] = useState<LanguagePack | null>(null);
  const [phase, setPhase] = useState<'ready' | 'typing' | 'done'>('ready');
  const [live, setLive] = useState<LiveValues>(EMPTY_LIVE);
  const [result, setResult] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [isPb, setIsPb] = useState(false);
  const [focused, setFocused] = useState(false);
  const [seed, setSeed] = useState(() => Date.now());

  const textRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<TextRenderer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const resolverRef = useRef<LayoutResolver>(new LayoutResolver(QWERTY));
  const unitCountRef = useRef(0);

  // ---------------------------------------------------------- content load
  useEffect(() => {
    let alive = true;
    void loadLanguage(lang).then((p) => {
      if (alive) setPack(p);
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  // Hindi resolves from the physical key; Latin trusts event.key.
  useEffect(() => {
    const useHindi = lang === 'hi' && settings.keyboard.hindiLayout === 'inscript';
    resolverRef.current.setLayout(useHindi ? INSCRIPT : QWERTY);
  }, [lang, settings.keyboard.hindiLayout]);

  // ------------------------------------------------------------ build text
  const makeText = useCallback(
    (p: LanguagePack, s: number): string => {
      if (config.mode === 'zen') return '';
      if (config.mode === 'custom') {
        return buildText({ style: 'custom', words: [], count: 0, seed: s, custom: config.custom });
      }
      if (config.mode === 'quote') {
        return buildText({ style: 'quote', words: [], count: 0, seed: s, quotes: p.quotes });
      }
      const count = config.mode === 'words' ? config.wordCount : 60;
      return buildText({
        style: config.style,
        words: p.words,
        count,
        seed: s,
        punctuation: settings.typing.punctuation,
        numbers: settings.typing.numbers,
        capitalization: settings.typing.capitalization,
      });
    },
    [config, settings.typing.punctuation, settings.typing.numbers, settings.typing.capitalization],
  );

  // --------------------------------------------------------- session setup
  const buildSession = useCallback(
    (p: LanguagePack, s: number): Session => {
      const isTime = config.mode === 'time';
      const isZen = config.mode === 'zen';
      const sess = new Session(
        makeText(p, s),
        {
          ...defaultSessionConfig,
          stopOnError: settings.typing.stopOnError,
          backspace: settings.typing.backspace,
          skipWord: settings.typing.skipWord,
          durationMs: isTime ? config.seconds * 1000 : 0,
          endOnLastUnit: !isTime && !isZen,
          zen: isZen,
        },
        isTime
          ? () =>
              ' ' +
              buildText({
                style: config.style,
                words: p.words,
                count: 40,
                seed: `${s}-ext-${Math.random()}`,
                punctuation: settings.typing.punctuation,
                numbers: settings.typing.numbers,
                capitalization: settings.typing.capitalization,
              })
          : undefined,
      );
      return sess;
    },
    [config, makeText, settings.typing],
  );

  const resetTest = useCallback(
    (nextSeed?: number) => {
      if (!pack) return;
      const s = nextSeed ?? seed;
      const sess = buildSession(pack, s);
      sessionRef.current = sess;
      unitCountRef.current = sess.getUnits().length;

      const r = rendererRef.current;
      if (r) {
        r.setOptions({ blind: false });
        r.setText(sess.getUnits());
        r.refresh(sess.getStates(), 0);
      }
      setPhase('ready');
      setResult(null);
      setFailed(null);
      setIsPb(false);
      setLive({
        ...EMPTY_LIVE,
        time: config.mode === 'time' ? config.seconds : 0,
        countdown: config.mode === 'time',
      });
    },
    [pack, seed, buildSession, config.mode, config.seconds],
  );

  /**
   * Callback ref, not a mount-once effect: the text element is absent while
   * the language pack loads and in the empty-custom state, so the renderer has
   * to (re)attach whenever the node actually appears, and re-sync whatever
   * session is already running.
   */
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
      unitCountRef.current = sess.getUnits().length;
    }
  }, []);

  // Rebuild when content, config or relevant settings change.
  useEffect(() => {
    resetTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack, config, seed, settings.typing.stopOnError, settings.typing.backspace, settings.typing.skipWord, settings.typing.punctuation, settings.typing.numbers, settings.typing.capitalization]);

  // Re-measure when the text box geometry can change (font, width, resize).
  useEffect(() => {
    const r = rendererRef.current;
    const el = textRef.current;
    if (!r || !el) return;
    // Fonts settle a frame later; measure after paint.
    const id = requestAnimationFrame(() => r.measure());
    const ro = new ResizeObserver(() => r.measure());
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [
    settings.display.fontSize,
    settings.display.font,
    settings.display.textWidth,
    settings.display.lineHeight,
    settings.display.letterSpacing,
    settings.display.textWeight,
    pack,
  ]);

  // ------------------------------------------------------------ completion
  const finish = useCallback(
    async (m: Metrics) => {
      setResult(m);
      setPhase('done');

      if (!isRecordable(m) || config.mode === 'zen') return;

      const sess = sessionRef.current;
      const record: TestRecord = makeTestRecord({
        metrics: m,
        mode: config.mode,
        lang,
        layout: lang === 'hi' ? settings.keyboard.hindiLayout : settings.keyboard.physicalLayout,
        duration: config.mode === 'time' ? config.seconds : 0,
        config: {
          style: config.style,
          punctuation: settings.typing.punctuation,
          numbers: settings.typing.numbers,
          capitalization: settings.typing.capitalization,
          stopOnError: settings.typing.stopOnError,
          backspace: settings.typing.backspace,
        },
      });

      if (!idb.available()) return;
      try {
        const previous = await historyRepo.all();
        const best = personalBest(previous, { lang, mode: config.mode, duration: record.duration });
        setIsPb(previous.length > 0 && (!best || m.wpm > best.wpm));

        await historyRepo.add(record, settings.data.historyCap);

        const stored = await idb.get<Aggregates>(STORES.aggregates, 'global');
        const agg = stored ?? emptyAggregates();
        foldTest(agg, record, sess ? sess.getCapture() : []);
        await idb.put(STORES.aggregates, agg, 'global');
      } catch {
        // Storage problems must never break the typing experience.
      }
    },
    [config, lang, settings.keyboard, settings.typing, settings.data.historyCap],
  );

  // --------------------------------------------------------------- ticking
  useEffect(() => {
    if (phase !== 'typing') return;
    const id = setInterval(() => {
      const sess = sessionRef.current;
      if (!sess) return;
      sess.tick(now());
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  // Subscribe to engine events for the current session.
  useEffect(() => {
    const sess = sessionRef.current;
    if (!sess) return;

    const pushLive = (): void => {
      const m = sess.metrics(now());
      const total = sess.getUnits().length;
      const progress =
        config.mode === 'time' && config.seconds > 0
          ? Math.min(1, sess.activeMs(now()) / (config.seconds * 1000))
          : total > 0
            ? Math.min(1, sess.getPos() / total)
            : 0;
      setLive({
        wpm: m.wpm,
        accuracy: m.accuracy,
        errors: m.errors,
        time:
          config.mode === 'time'
            ? Math.ceil(sess.remainingMs(now()) / 1000)
            : sess.activeMs(now()) / 1000,
        countdown: config.mode === 'time',
        progress,
      });
    };

    return sess.on((e) => {
      if (e.type === 'start') setPhase('typing');
      else if (e.type === 'tick') pushLive();
      else if (e.type === 'complete') {
        pushLive();
        void finish(e.metrics);
      } else if (e.type === 'fail') {
        setFailed(
          e.reason === 'master-mistake'
            ? 'Failed — Master mode ends on the first mistake.'
            : 'Failed — Expert mode ends when a word is finished with an error.',
        );
        setResult(sess.metrics(now()));
        setPhase('done');
      }
    });
  }, [phase, config.mode, config.seconds, finish, seed, pack]);

  // ----------------------------------------------------------------- input
  const feed = useCallback((unit: string) => {
    const sess = sessionRef.current;
    const r = rendererRef.current;
    if (!sess || sess.getStatus() === 'complete' || sess.getStatus() === 'failed') return;

    sess.handleChar(unit, now());

    // Time mode may have appended text — extend the DOM before painting.
    if (r) {
      const units = sess.getUnits();
      if (units.length > unitCountRef.current) {
        r.appendText(units, unitCountRef.current);
        unitCountRef.current = units.length;
      }
      r.update(sess.getStates(), sess.getPos());
    }
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
      if (e.key === 'Tab' && settings.typing.tabRestarts) {
        e.preventDefault();
        setSeed(Date.now());
        return;
      }
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
    [feed, back, phase, settings.typing.tabRestarts],
  );

  /** Soft keyboards do not emit usable keydown — handle beforeinput instead. */
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
      } else if (type === 'insertLineBreak' || type === 'insertParagraph') {
        e.preventDefault();
        feed('\n');
      }
    },
    [feed, back, phase],
  );

  // Make the on-screen hint true: any printable key focuses the input.
  useEffect(() => {
    if (phase === 'done') return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (Array.from(e.key).length !== 1) return;
      const active = document.activeElement;
      if (active === inputRef.current) return;
      const tag = active?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  // Pause a running timed test when the window loses focus.
  useEffect(() => {
    if (!settings.typing.pauseOnBlur) return;
    const onBlur = (): void => sessionRef.current?.pause(now());
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [settings.typing.pauseOnBlur]);

  // ----------------------------------------------------------------- render
  const modeLabel = useMemo(
    () => summarize(config, lang, settings),
    [config, lang, settings],
  );

  const focusInput = (): void => inputRef.current?.focus();

  if (!pack) {
    return <p class="loading">Loading language…</p>;
  }

  if (phase === 'done' && result) {
    return (
      <Result
        metrics={result}
        modeLabel={modeLabel}
        isPersonalBest={isPb}
        failed={failed}
        onRestart={() => resetTest()}
        onNext={() => setSeed(Date.now())}
      />
    );
  }

  const emptyCustom = config.mode === 'custom' && config.custom.trim() === '';

  return (
    <div class="type">
      <ConfigBar
        config={config}
        onConfig={setConfig}
        settings={settings}
        updateSettings={updateSettings}
        hidden={phase === 'typing' && settings.display.focusMode}
      />

      <LiveStats v={live} settings={settings} />

      {emptyCustom ? (
        <div class="panel empty-state">
          <p>Add your own text in the config panel above to start a custom test.</p>
        </div>
      ) : (
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
      )}

      <input
        ref={inputRef}
        class="type__input"
        type="text"
        inputMode="text"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        spellcheck={false}
        aria-label="Typing input"
        value=""
        onKeyDown={onKeyDown}
        onBeforeInput={onBeforeInput as unknown as (e: Event) => void}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <div class="type__actions">
        <button
          class="btn btn--ghost btn--sm"
          type="button"
          onClick={() => {
            setSeed(Date.now());
            focusInput();
          }}
        >
          Restart
        </button>
        <span class="hint">
          {settings.typing.tabRestarts ? 'Tab restarts · ' : ''}Esc leaves the input
        </span>
      </div>
    </div>
  );
}
