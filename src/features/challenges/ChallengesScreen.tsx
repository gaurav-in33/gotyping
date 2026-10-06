/**
 * Challenges: Daily, Weekly, Speed Ladder, and standing Accuracy /
 * No-Mistake / Endurance goals, plus XP, levels, streak and achievements.
 * Hidden entirely (nav + this screen's content) when
 * Settings > Practice > Progression is Off (docs/01 "never childish",
 * "Off removes the Challenges section and XP UI entirely").
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Metrics } from '../../core/engine/metrics';
import { buildText } from '../../core/text/generators';
import { loadLanguage, type LanguagePack } from '../../content';
import { useSettings } from '../../ui/useSettings';
import { TypingBox } from '../type/TypingBox';
import { historyRepo } from '../../store/history';
import { idb, STORES } from '../../store/db';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import { lessonProgressRepo } from '../../store/lessons';
import { loadCurriculum } from '../../core/curriculum';
import { progressRepo, buildSnapshot, type ProgressState } from '../../store/progress';
import { levelForXp } from '../../core/progress/levels';
import { xpForChallenge } from '../../core/progress/xp';
import { streakDays } from '../../store/stats';
import {
  dailyChallenge,
  weeklyChallenge,
  speedLadderChallenge,
  STANDING_CHALLENGES,
  evaluateChallenge,
  SPEED_LADDER_RUNGS,
  type ChallengeDef,
} from '../../core/progress/challenges';
import { ACHIEVEMENTS, isUnlocked } from '../../core/progress/achievements';
import './challenges.css';

type Tab = 'daily' | 'weekly' | 'ladder' | 'standing' | 'achievements';

function secondsFor(def: ChallengeDef): number {
  if (def.target.seconds) return def.target.seconds;
  if (def.target.minDurationMs) return Math.round(def.target.minDurationMs / 1000);
  return 30;
}

/** Generous word count so a timed attempt never runs out of text to type. */
function bufferWordsFor(seconds: number): number {
  return Math.max(60, Math.round((seconds / 60) * 180));
}

function ChallengeCard({
  def,
  pack,
  done,
  onCleared,
}: {
  def: ChallengeDef;
  pack: LanguagePack;
  done: boolean;
  onCleared: (def: ChallengeDef) => void;
}) {
  const [attempting, setAttempting] = useState(false);
  const [outcome, setOutcome] = useState<'pass' | 'fail' | null>(null);
  const [token, setToken] = useState(0);

  const isWordMode = def.target.mode === 'words' && !!def.target.wordCount;
  const seconds = isWordMode ? 0 : secondsFor(def);
  const text = useMemo(() => {
    const count = isWordMode ? def.target.wordCount! : bufferWordsFor(seconds || secondsFor(def));
    return buildText({ style: 'words', words: pack.words, count, seed: `${def.id}-${token}` });
  }, [def, pack, token, isWordMode, seconds]);

  const onComplete = (m: Metrics): void => {
    const passed = evaluateChallenge(def, {
      mode: isWordMode ? 'words' : 'time',
      wpm: m.wpm,
      accuracy: m.accuracy,
      errors: m.errors,
      timeMs: m.timeMs,
      duration: isWordMode ? 0 : seconds,
    });
    setOutcome(passed ? 'pass' : 'fail');
    if (passed) onCleared(def);
  };

  return (
    <div class="panel challenge-card">
      <div class="challenge-card__head">
        <h3>{def.title}</h3>
        {done ? <span class="badge badge--done">Cleared</span> : null}
      </div>
      <p class="hint">{def.description}</p>
      {attempting ? (
        <>
          <TypingBox
            text={text}
            resetToken={token}
            durationMs={isWordMode ? 0 : seconds * 1000}
            onComplete={onComplete}
          />
          {outcome ? (
            <div class={`challenge-card__outcome challenge-card__outcome--${outcome}`} role="status">
              {outcome === 'pass'
                ? `Cleared! +${xpForChallenge(def.tier)} XP.`
                : "Not this time — the target wasn't met. Try again."}
            </div>
          ) : null}
          <div class="challenge-card__actions">
            <button
              class="btn btn--sm"
              type="button"
              onClick={() => {
                setOutcome(null);
                setToken((t) => t + 1);
              }}
            >
              {outcome ? 'Try again' : 'Restart'}
            </button>
            <button class="btn btn--ghost btn--sm" type="button" onClick={() => setAttempting(false)}>
              Close
            </button>
          </div>
        </>
      ) : (
        <button class="btn btn--sm" type="button" onClick={() => setAttempting(true)}>
          {done ? 'Attempt again' : 'Attempt'}
        </button>
      )}
    </div>
  );
}

export default function ChallengesScreen() {
  const [settings] = useSettings();
  const off = settings.practice.progression === 'off';
  const minimal = settings.practice.progression === 'minimal';

  const [tab, setTab] = useState<Tab>('daily');
  const [pack, setPack] = useState<LanguagePack | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [agg, setAgg] = useState<Aggregates | null>(null);
  const [tests, setTests] = useState<TestRecord[] | null>(null);
  const [lessonsTotal, setLessonsTotal] = useState(0);
  const [lessonsDone, setLessonsDone] = useState(0);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let alive = true;
    void loadLanguage('en').then((p) => alive && setPack(p));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      progressRepo.get(),
      idb.available() ? idb.get<Aggregates>(STORES.aggregates, 'global') : Promise.resolve(undefined),
      historyRepo.all(),
      lessonProgressRepo.all(),
      loadCurriculum(),
    ]).then(([p, a, t, lessons, courses]) => {
      if (!alive) return;
      setProgress(p);
      setAgg(a ?? emptyAggregates());
      setTests(t);
      setLessonsDone(lessons.filter((l) => l.completed).length);
      setLessonsTotal(courses.reduce((n, c) => n + c.lessons.length, 0));
    });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const currentStreak = agg ? streakDays(agg.days) : 0;
  const level = progress ? levelForXp(progress.totalXp) : levelForXp(0);

  const snapshot = useMemo(
    () =>
      buildSnapshot(
        tests ?? [],
        [],
        lessonsTotal,
        currentStreak,
        settings.theme.customThemes.length,
        progress?.totalXp ?? 0,
      ),
    [tests, lessonsTotal, currentStreak, settings.theme.customThemes.length, progress],
  );
  // Lessons-completed count comes from the repo directly (snapshot's lesson arg is empty above
  // to avoid loading every lesson record twice); patch it in.
  snapshot.lessonsCompleted = lessonsDone;

  const onCleared = async (def: ChallengeDef): Promise<void> => {
    await progressRepo.markChallengeComplete(def.id);
    await progressRepo.addXp(xpForChallenge(def.tier));
    if (def.kind === 'speed-ladder') {
      const idx = SPEED_LADDER_RUNGS.indexOf(def.target.minWpm ?? 0);
      if (idx >= 0) await progressRepo.setLadderRung(idx + 1);
    }
    setRefresh((n) => n + 1);
  };

  if (off) {
    return (
      <div class="challenges">
        <div class="page-head">
          <h1>Challenges</h1>
          <p>Progression is turned off.</p>
        </div>
        <div class="panel empty-state">
          <p>
            Challenges, XP and levels are hidden because Settings → Practice → Progression is
            set to Off. Turn it on to track streaks, clear daily goals and earn XP.
          </p>
          <a class="btn btn--sm" href="/settings">
            Open Settings
          </a>
        </div>
      </div>
    );
  }

  if (!pack || !progress || !tests) {
    return <p class="loading">Loading challenges…</p>;
  }

  const today = dailyChallenge(new Date());
  const week = weeklyChallenge(new Date());
  const ladder = speedLadderChallenge(progress.speedLadderRung);
  const done = (id: string): boolean => id in progress.completedChallenges;

  return (
    <div class="challenges">
      <div class="page-head">
        <h1>Challenges</h1>
        <p>Daily and weekly goals, a speed ladder, and standing challenges. English for now.</p>
      </div>

      {!minimal ? (
        <div class="panel challenges__hud">
          <div>
            <span class="challenges__hud-label">Level</span>
            <span class="challenges__hud-value">{level.level}</span>
          </div>
          <div class="challenges__xpbar" role="progressbar" aria-valuenow={level.xpIntoLevel} aria-valuemin={0} aria-valuemax={level.xpForLevel}>
            <div class="challenges__xpbar-fill" style={{ width: `${Math.min(100, (level.xpIntoLevel / level.xpForLevel) * 100)}%` }} />
          </div>
          <div>
            <span class="challenges__hud-label">XP</span>
            <span class="challenges__hud-value">
              {level.xpIntoLevel}/{level.xpForLevel}
            </span>
          </div>
          <div>
            <span class="challenges__hud-label">Streak</span>
            <span class="challenges__hud-value">{currentStreak}🔥</span>
          </div>
        </div>
      ) : null}

      <div class="segmented" role="tablist" aria-label="Challenge type">
        {(
          [
            ['daily', 'Daily'],
            ['weekly', 'Weekly'],
            ['ladder', 'Speed Ladder'],
            ['standing', 'Standing'],
            ['achievements', 'Achievements'],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'daily' ? (
        <ChallengeCard def={today} pack={pack} done={done(today.id)} onCleared={onCleared} />
      ) : null}
      {tab === 'weekly' ? (
        <ChallengeCard def={week} pack={pack} done={done(week.id)} onCleared={onCleared} />
      ) : null}
      {tab === 'ladder' ? (
        <>
          <p class="hint">
            Rung {progress.speedLadderRung + 1} of {SPEED_LADDER_RUNGS.length}. Clear one rung to unlock the next.
          </p>
          <ChallengeCard def={ladder} pack={pack} done={done(ladder.id)} onCleared={onCleared} />
        </>
      ) : null}
      {tab === 'standing' ? (
        <div class="challenges__grid">
          {STANDING_CHALLENGES.map((def) => (
            <ChallengeCard key={def.id} def={def} pack={pack} done={done(def.id)} onCleared={onCleared} />
          ))}
        </div>
      ) : null}
      {tab === 'achievements' ? (
        <div class="challenges__grid">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = isUnlocked(a.id, snapshot);
            return (
              <div class={`panel achievement${unlocked ? ' achievement--unlocked' : ''}`} key={a.id}>
                <div class="achievement__head">
                  <strong>{a.name}</strong>
                  {unlocked ? <span class="badge badge--done">Unlocked</span> : null}
                </div>
                <p class="hint">{a.description}</p>
                <span class="achievement__category">{a.category}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

