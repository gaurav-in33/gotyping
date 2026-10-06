import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Session, defaultSessionConfig } from '../../core/engine/session';
import type { Metrics } from '../../core/engine/metrics';
import { isRecordable } from '../../core/engine/metrics';
import { buildText } from '../../core/text/generators';
import { KeyboardInputReader } from '../../core/input/keyboard-reader';
import { QWERTY } from '../../core/layouts/qwerty';
import { isFunctional, layoutById } from '../../core/layouts/hindi';
import { loadLanguage, type LanguagePack } from '../../content';
import { useSettings } from '../../ui/useSettings';
import { historyRepo, makeTestRecord, personalBest } from '../../store/history';
import { foldTest } from '../../store/aggregates';
import { idb, STORES } from '../../store/db';
import { progressRepo } from '../../store/progress';
import { xpForTest } from '../../core/progress/xp';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import { TextRenderer } from './TextRenderer';
import { ConfigBar, summarize, type TestConfig } from './ConfigBar';
import { LiveStats, type LiveValues } from './LiveStats';
import { Result } from './Result';
import { KeyboardGuide } from './KeyboardGuide';
import { layoutByAnyId } from '../../core/layouts/registry';
import type { FunModeId } from '../../core/fun/modes';
import { randomizeCase } from '../../core/fun/textFx';
import { generateCode, type CodeLang } from '../../core/text/code';
import { planPracticeText } from '../../core/adaptive/planner';
import { profileById } from '../../core/adaptive/profiles';
import {
  cumulativeMsFromCaptures,
  ghostKey,
  ghostRepo,
  ghostProgressAt,
  isBetterGhost,
  type GhostRecord,
} from '../../core/fun/ghost';
import './type.css';

const BURST_SECONDS = 10;
const ENDURANCE_SECONDS = 600;
const MEMORY_MIN_MS = 3000;
const MEMORY_MAX_MS = 15000;

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
  const [funMode, setFunMode] = useState<FunModeId>('none');
  const [codeLang, setCodeLang] = useState<CodeLang>('javascript');
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [memoryHidden, setMemoryHidden] = useState(false);
  const [ghostResult, setGhostResult] = useState<{ wpm: number; beat: boolean } | null>(null);
  const memoryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostRef = useRef<GhostRecord | null>(null);
  const [ghostLive, setGhostLive] = useState<{ you: number; ghost: number } | null>(null);
  const [nextChar, setNextChar] = useState<string | null>(null);

  const textRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rendererRef = useRef<TextRenderer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const readerRef = useRef<KeyboardInputReader | null>(null);
  if (!readerRef.current) {
    readerRef.current = new KeyboardInputReader(QWERTY, { onUnit: () => {}, onBackspace: () => {} });
  }
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

  // Loaded once for the "Difficult words" fun mode — reuses the same
  // aggregates Practice's adaptive planner already reads (one implementation).
  useEffect(() => {
    if (funMode !== 'difficult') return;
    let alive = true;
    void idb.get<Aggregates>(STORES.aggregates, 'global').then((a) => {
      if (alive) setAgg(a ?? emptyAggregates());
    });
    return () => {
      alive = false;
    };
  }, [funMode]);

  // Hindi resolves from the physical key; Latin trusts event.key.
  const hindiLayout = useMemo(() => layoutById(settings.keyboard.hindiLayout), [settings.keyboard.hindiLayout]);
  const hindiFunctional = isFunctional(hindiLayout);
  // On-screen keyboard / finger guide reference layout (docs/01 §9).
  const activeLayout = useMemo(
    () => (lang === 'hi' && hindiFunctional ? hindiLayout : layoutByAnyId(settings.keyboard.physicalLayout)),
    [lang, hindiFunctional, hindiLayout, settings.keyboard.physicalLayout],
  );
  useEffect(() => {
    const useHindi = lang === 'hi' && hindiFunctional;
    readerRef.current?.setLayout(useHindi ? hindiLayout : QWERTY);
  }, [lang, hindiLayout, hindiFunctional]);

  // ------------------------------------------------------------ build text
  const makeText = useCallback(
    (p: LanguagePack, s: number): string => {
      if (config.mode === 'zen') return '';
      if (config.mode === 'custom') {
        return buildText({ style: 'custom', words: [], count: 0, seed: s, custom: config.custom });
      }
      if (config.mode === 'quote') {
        const text = buildText({ style: 'quote', words: [], count: 0, seed: s, quotes: p.quotes });
        return funMode === 'randomCap' ? randomizeCase(text, s) : text;
      }
      const count = config.mode === 'words' ? config.wordCount : 60;

      // Code fun mode (docs/01 §7 "Code"): real-looking JavaScript/Python
      // snippets instead of prose, for Time and Words modes. Takes over from
      // the Style picker while active, the same way "Difficult words" does.
      if (funMode === 'code') {
        return generateCode({ lang: codeLang, seed: s, count });
      }

      // Difficult-word fun mode reuses Practice's adaptive planner (docs/05)
      // instead of a second weighting implementation — only meaningful for
      // the plain "Words" text style, and only once aggregates have loaded.
      let text: string;
      if (funMode === 'difficult' && config.style === 'words' && agg) {
        text = planPracticeText({
          pool: p.words,
          agg,
          profile: profileById('words'),
          count,
          seed: s,
          easyShare: 0.2,
        }).text;
      } else {
        text = buildText({
          style: config.style,
          words: p.words,
          count,
          seed: s,
          punctuation: settings.typing.punctuation,
          numbers: settings.typing.numbers,
          capitalization: settings.typing.capitalization,
        });
      }
      return funMode === 'randomCap' ? randomizeCase(text, s) : text;
    },
    [
      config,
      settings.typing.punctuation,
      settings.typing.numbers,
      settings.typing.capitalization,
      funMode,
      codeLang,
      agg,
    ],
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
          // Sudden death (docs/01 §7 "Master"): the engine already supports
          // this exactly, it just had no UI switch before.
          failOnMistake: funMode === 'master',
        },
        isTime
          ? () => {
              const text =
                funMode === 'code'
                  ? generateCode({ lang: codeLang, seed: `${s}-ext-${Math.random()}`, count: 40 })
                  : buildText({
                      style: config.style,
                      words: p.words,
                      count: 40,
                      seed: `${s}-ext-${Math.random()}`,
                      punctuation: settings.typing.punctuation,
                      numbers: settings.typing.numbers,
                      capitalization: settings.typing.capitalization,
                    });
              return ' ' + (funMode === 'randomCap' ? randomizeCase(text, Math.random()) : text);
            }
          : undefined,
      );
      return sess;
    },
    [config, makeText, settings.typing, funMode, codeLang],
  );

  const resetTest = useCallback(
    (nextSeed?: number) => {
      if (!pack) return;
      const s = nextSeed ?? seed;
      const sess = buildSession(pack, s);
      sessionRef.current = sess;
      unitCountRef.current = sess.getUnits().length;

      if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);
      setGhostLive(null);
      setGhostResult(null);
      if (funMode === 'ghost') {
        void ghostRepo
          .get(ghostKey(lang, config.mode, config.style))
          .then((g) => (ghostRef.current = g ?? null));
      } else {
        ghostRef.current = null;
      }

      const r = rendererRef.current;
      if (r) {
        r.setOptions({ blind: funMode === 'blind' });
        r.setText(sess.getUnits());
        r.refresh(sess.getStates(), 0);
      }

      if (funMode === 'memory') {
        setMemoryHidden(false);
        const unitCount = sess.getUnits().length;
        const previewMs = Math.min(
          MEMORY_MAX_MS,
          Math.max(MEMORY_MIN_MS, Math.round(unitCount * 60)),
        );
        memoryTimerRef.current = setTimeout(() => setMemoryHidden(true), previewMs);
      } else {
        setMemoryHidden(false);
      }

      setPhase('ready');
      setResult(null);
      setFailed(null);
      setIsPb(false);
      setNextChar(sess.getUnits()[0] ?? null);
      setLive({
        ...EMPTY_LIVE,
        time: config.mode === 'time' ? config.seconds : 0,
        countdown: config.mode === 'time',
      });
    },
    [pack, seed, buildSession, config.mode, config.seconds, config.style, funMode, lang],
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
  }, [pack, config, seed, funMode, codeLang, agg, settings.typing.stopOnError, settings.typing.backspace, settings.typing.skipWord, settings.typing.punctuation, settings.typing.numbers, settings.typing.capitalization]);

  // Auto restart (docs/01 §9 Typing settings, Settings > Typing > Advanced):
  // once a test finishes, quietly start a fresh one instead of waiting for
  // "Try again" / "Next". A brief pause lets the result actually be seen.
  useEffect(() => {
    if (phase !== 'done' || !settings.typing.autoRestart) return;
    const t = setTimeout(() => setSeed(Date.now()), 1500);
    return () => clearTimeout(t);
  }, [phase, settings.typing.autoRestart]);

  // Clear any pending Memory-mode reveal timer on unmount.
  useEffect(() => () => {
    if (memoryTimerRef.current) clearTimeout(memoryTimerRef.current);
  }, []);

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
        const aggregates = stored ?? emptyAggregates();
        foldTest(aggregates, record, sess ? sess.getCapture() : []);
        await idb.put(STORES.aggregates, aggregates, 'global');

        if (settings.practice.progression !== 'off') {
          await progressRepo.addXp(xpForTest({ wpm: m.wpm, accuracy: m.accuracy, timeMs: m.timeMs, consistency: m.consistency }));
        }

        if (funMode === 'ghost' && sess) {
          const key = ghostKey(lang, config.mode, config.style);
          const prev = await ghostRepo.get(key);
          setGhostResult(prev ? { wpm: prev.wpm, beat: m.wpm > prev.wpm } : null);
          const next: GhostRecord = {
            id: key,
            cumulativeMs: cumulativeMsFromCaptures(sess.getCapture()),
            wpm: m.wpm,
            accuracy: m.accuracy,
            at: Date.now(),
          };
          if (isBetterGhost(next, prev)) await ghostRepo.save(next);
        }
      } catch {
        // Storage problems must never break the typing experience.
      }
    },
    [config, lang, settings.keyboard, settings.typing, settings.data.historyCap, settings.practice.progression, funMode],
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
        words: m.correctWords + m.incorrectWords,
      });
      if (ghostRef.current) {
        setGhostLive({ you: sess.getPos(), ghost: ghostProgressAt(ghostRef.current, sess.activeMs(now())) });
      }
      setNextChar(sess.getUnits()[sess.getPos()] ?? null);
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
    setNextChar(sess.getUnits()[sess.getPos()] ?? null);
  }, []);

  const back = useCallback(() => {
    const sess = sessionRef.current;
    const r = rendererRef.current;
    if (!sess) return;
    sess.handleBackspace(now());
    if (r) r.update(sess.getStates(), sess.getPos());
    setNextChar(sess.getUnits()[sess.getPos()] ?? null);
  }, []);

  // This is the sole route for both hardware and phone input. The reader owns
  // Android's beforeinput/input fallback and its physical-key double-count
  // guard; Type only retains app-level Escape / optional Tab semantics.
  readerRef.current.setHandlers({ onUnit: feed, onBackspace: back, onEnter: () => feed('\n') });

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
      readerRef.current?.onKeyDown(e);
    },
    [phase, settings.typing.tabRestarts],
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

  const onFunMode = (id: FunModeId): void => {
    setFunMode(id);
    // Burst/Endurance are time tests at a fixed duration (docs/01 §7) — set
    // it once on selection; the user can still retune it afterward.
    if (id === 'burst') setConfig((c) => ({ ...c, mode: 'time', seconds: BURST_SECONDS }));
    else if (id === 'endurance') setConfig((c) => ({ ...c, mode: 'time', seconds: ENDURANCE_SECONDS }));
  };

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
        targetWpm={settings.practice.targetWpm}
        targetAccuracy={settings.practice.targetAccuracy}
        ghostResult={ghostResult}
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
        funMode={funMode}
        onFunMode={onFunMode}
        codeLang={codeLang}
        onCodeLang={setCodeLang}
      />

      {lang === 'hi' && !hindiFunctional ? (
        <p class="panel empty-state" role="status" style={{ padding: '10px 14px' }}>
          {hindiLayout.name} is Beta and not wired into typing yet — only its digit row is
          mapped. Switch to InScript in Settings, or try the on-screen reference in Tools →
          Keyboard tester.
        </p>
      ) : null}

      <LiveStats v={live} settings={settings} />

      {funMode === 'ghost' && ghostLive ? (
        <p class="hint" role="status" style={{ textAlign: 'center' }}>
          Ghost race — you: {ghostLive.you} · ghost: {ghostLive.ghost}{' '}
          {ghostLive.you >= ghostLive.ghost ? '(ahead)' : '(behind)'}
        </p>
      ) : funMode === 'ghost' && !ghostRef.current ? (
        <p class="hint" role="status" style={{ textAlign: 'center' }}>
          No stored ghost yet for this mode/style — this run becomes the one to beat.
        </p>
      ) : null}

      {emptyCustom ? (
        <div class="panel empty-state">
          <p>Add your own text in the config panel above to start a custom test.</p>
        </div>
      ) : (
        <div
          class={`text${memoryHidden ? ' text--memory-hidden' : ''}`}
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
          {memoryHidden ? (
            <div class="text__overlay" style={{ pointerEvents: 'none' }}>
              <span>Memory mode — keep typing, the text is hidden</span>
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
        onKeyDown={onKeyDown}
        onBeforeInput={(e) => readerRef.current?.onBeforeInput(e as unknown as InputEvent)}
        onInput={(e) => readerRef.current?.onInput(e as unknown as InputEvent)}
        onCompositionStart={(e) => readerRef.current?.onCompositionStart(e as unknown as CompositionEvent)}
        onCompositionUpdate={(e) => readerRef.current?.onCompositionUpdate(e as unknown as CompositionEvent)}
        onCompositionEnd={(e) => readerRef.current?.onCompositionEnd(e as unknown as CompositionEvent)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />

      <KeyboardGuide
        layout={lang === 'hi' ? hindiLayout : activeLayout}
        nextChar={nextChar}
        visible={settings.keyboard.guideVisible}
        onVisibleChange={(v) => updateSettings((d) => void (d.keyboard.guideVisible = v))}
        highlightNextKey={settings.keyboard.highlightNextKey}
        showKeyLabels={settings.keyboard.showKeyLabels}
        tapToType={settings.keyboard.tapGuideToType}
        onTap={settings.keyboard.tapGuideToType ? feed : undefined}
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
