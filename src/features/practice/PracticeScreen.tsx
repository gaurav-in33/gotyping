import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Metrics } from '../../core/engine/metrics';
import { isRecordable } from '../../core/engine/metrics';
import type { Capture } from '../../core/engine/session';
import { PROFILES, profileById, recommendProfile } from '../../core/adaptive/profiles';
import { planPracticeText, type PlanResult } from '../../core/adaptive/planner';
import { MIN_SAMPLES } from '../../core/adaptive/scoring';
import { loadLanguage, type LanguagePack } from '../../content';
import { isFunctional, layoutById } from '../../core/layouts/hindi';
import { QWERTY } from '../../core/layouts/qwerty';
import { useSettings } from '../../ui/useSettings';
import { EASY_WORD_SHARE } from '../../store/settings';
import { TypingBox } from '../type/TypingBox';
import { Result } from '../type/Result';
import { historyRepo, makeTestRecord, personalBest } from '../../store/history';
import { foldTest } from '../../store/aggregates';
import { idb, STORES } from '../../store/db';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import './practice.css';

function totalSamples(agg: Aggregates): number {
  return Object.values(agg.keys).reduce((sum, c) => sum + c.count, 0);
}

export default function PracticeScreen() {
  const [settings] = useSettings();
  const lang = settings.language.current;

  const [pack, setPack] = useState<LanguagePack | null>(null);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Metrics | null>(null);
  const [isPb, setIsPb] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadLanguage(lang).then((p) => alive && setPack(p));
    return () => {
      alive = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!idb.available()) {
      setAggregates(emptyAggregates());
      return;
    }
    let alive = true;
    void idb.get<Aggregates>(STORES.aggregates, 'global').then((a) => {
      if (alive) setAggregates(a ?? emptyAggregates());
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const recommended = useMemo(() => (aggregates ? recommendProfile(aggregates) : null), [aggregates]);
  const activeProfile = profileById(profileId ?? recommended?.id ?? 'difficult-words');

  const lowData = aggregates ? totalSamples(aggregates) < MIN_SAMPLES * 5 : true;

  const hindiLayout = useMemo(() => layoutById(settings.keyboard.hindiLayout), [settings.keyboard.hindiLayout]);
  const useHindi = lang === 'hi' && isFunctional(hindiLayout);

  const sessionSeconds =
    activeProfile.fixedSeconds ??
    Math.round(settings.practice.sessionSeconds * (activeProfile.durationMultiplier ?? 1));

  const plan: PlanResult | null = useMemo(() => {
    if (!pack || !aggregates) return null;
    const count = Math.max(40, Math.round((sessionSeconds / 60) * 220));
    return planPracticeText({
      pool: pack.words,
      agg: aggregates,
      profile: activeProfile,
      count,
      seed: `${activeProfile.id}-${lang}-${attempt}`,
      easyShare: EASY_WORD_SHARE[settings.practice.difficulty],
    });
  }, [pack, aggregates, activeProfile, sessionSeconds, lang, attempt, settings.practice.difficulty]);

  const onComplete = (m: Metrics, capture: readonly Capture[]): void => {
    setResult(m);
    if (!isRecordable(m) || !idb.available()) return;
    void (async () => {
      try {
        const previous = await historyRepo.all();
        const best = personalBest(previous, { lang, mode: 'practice' });
        setIsPb(previous.length > 0 && (!best || m.wpm > best.wpm));

        const record: TestRecord = makeTestRecord({
          metrics: m,
          mode: 'practice',
          lang,
          layout: useHindi ? settings.keyboard.hindiLayout : settings.keyboard.physicalLayout,
          duration: sessionSeconds,
          config: {
            style: activeProfile.id,
            punctuation: false,
            numbers: false,
            capitalization: false,
            stopOnError: activeProfile.stopOnError ?? false,
            backspace: 'allow',
          },
        });
        await historyRepo.add(record, settings.data.historyCap);
        const stored = await idb.get<Aggregates>(STORES.aggregates, 'global');
        const agg = stored ?? emptyAggregates();
        foldTest(agg, record, capture);
        await idb.put(STORES.aggregates, agg, 'global');
      } catch {
        /* storage problems must never break practice */
      }
    })();
  };

  if (!pack || !aggregates) return <p class="loading">Loading practice…</p>;

  if (result) {
    return (
      <div class="practice">
        <Result
          metrics={result}
          modeLabel={`Practice · ${activeProfile.name}`}
          isPersonalBest={isPb}
          failed={null}
          targetWpm={settings.practice.targetWpm}
          targetAccuracy={settings.practice.targetAccuracy}
          onRestart={() => {
            setResult(null);
            setAttempt((a) => a + 1);
          }}
          onNext={() => {
            setResult(null);
            setAttempt((a) => a + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div class="practice">
      <div class="page-head">
        <h1>Practice</h1>
        <p>An adaptive drill built from your own typing history — nobody else's.</p>
      </div>

      {lowData ? (
        <p class="panel empty-state" role="status">
          Not enough history yet to target specific weak spots ({totalSamples(aggregates)} scored
          keystrokes so far) — this drill uses a general word mix. Finish a few more tests or
          lessons and Practice will start adapting to you.
        </p>
      ) : null}

      <div class="practice-pick" role="group" aria-label="Practice profile">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            type="button"
            class={`profile-card${recommended?.id === p.id ? ' profile-card--recommended' : ''}`}
            aria-pressed={activeProfile.id === p.id}
            onClick={() => setProfileId(p.id)}
          >
            <span class="profile-card__name">{p.name}</span>
            <span class="profile-card__desc">{p.description}</span>
          </button>
        ))}
      </div>

      {plan && !plan.usedFallback && plan.topNeeds.length > 0 ? (
        <div class="whats-new">
          <span class="hint">This drill targets:</span>
          {plan.topNeeds.map((n) => (
            <span class="need-chip" key={n.item}>
              {n.item === ' ' ? 'space' : n.item} · {Math.round(n.need * 100)}%
            </span>
          ))}
        </div>
      ) : null}

      {lang === 'hi' && !useHindi ? (
        <p class="panel empty-state" role="status">
          {hindiLayout.name} is Beta and not wired into Practice yet. Switch to InScript in
          Settings to practice Hindi.
        </p>
      ) : plan ? (
        <TypingBox
          text={plan.text}
          resetToken={`${activeProfile.id}-${attempt}`}
          layout={useHindi ? hindiLayout : QWERTY}
          durationMs={sessionSeconds * 1000}
          stopOnError={activeProfile.stopOnError ?? false}
          onComplete={onComplete}
        />
      ) : null}

      <p class="hint">
        Session length: {sessionSeconds}s (from Settings → Practice). Difficulty:{' '}
        {settings.practice.difficulty} ({Math.round(EASY_WORD_SHARE[settings.practice.difficulty] * 100)}%
        easy words).
      </p>
    </div>
  );
}
