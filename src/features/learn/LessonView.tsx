import { useEffect, useMemo, useState } from 'preact/hooks';
import type { Metrics } from '../../core/engine/metrics';
import { isRecordable } from '../../core/engine/metrics';
import type { Capture } from '../../core/engine/session';
import { loadCurriculum, lessonById, nextLesson, type Course, type Lesson } from '../../core/curriculum';
import { buildLessonText } from '../../core/text/lessons';
import { loadLanguage, type LanguagePack } from '../../content';
import { isFunctional, layoutById } from '../../core/layouts/hindi';
import { layoutByAnyId } from '../../core/layouts/registry';
import { useSettings } from '../../ui/useSettings';
import { TypingBox } from '../type/TypingBox';
import { Result } from '../type/Result';
import { FingerGuide } from './FingerGuide';
import { navigate } from '../../router';
import { historyRepo, makeTestRecord } from '../../store/history';
import { foldTest } from '../../store/aggregates';
import { idb, STORES } from '../../store/db';
import { emptyAggregates, type Aggregates, type TestRecord } from '../../store/types';
import { lessonProgressRepo, passes } from '../../store/lessons';
import { EASY_WORD_SHARE } from '../../store/settings';
import { progressRepo } from '../../store/progress';
import { xpForLesson } from '../../core/progress/xp';

export function LessonView({ lessonId }: { lessonId: string }) {
  const [settings] = useSettings();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [pack, setPack] = useState<LanguagePack | null>(null);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ m: Metrics; passed: boolean } | null>(null);
  const [seed, setSeed] = useState(() => Date.now());

  useEffect(() => {
    void loadCurriculum().then(setCourses);
  }, []);

  const found = courses ? lessonById(courses, lessonId) : undefined;
  const lesson: Lesson | undefined = found?.lesson;
  const course: Course | undefined = found?.course;

  useEffect(() => {
    if (!course) return;
    let alive = true;
    void loadLanguage(course.lang === 'hi' ? 'hi' : course.lang === 'hinglish' ? 'hinglish' : 'en').then((p) => {
      if (alive) setPack(p);
    });
    return () => {
      alive = false;
    };
  }, [course?.lang]);

  useEffect(() => {
    if (lesson?.type !== 'adaptive' || !idb.available()) return;
    void idb.get<Aggregates>(STORES.aggregates, 'global').then((a) => setAggregates(a ?? emptyAggregates()));
  }, [lesson?.type]);

  const hindiLayout = useMemo(() => layoutById(settings.keyboard.hindiLayout), [settings.keyboard.hindiLayout]);
  const useHindi = course?.lang === 'hi' && isFunctional(hindiLayout);

  const generated = useMemo(() => {
    if (!lesson || !pack) return null;
    return buildLessonText(lesson, {
      words: pack.words,
      seed: `${lessonId}-${seed}`,
      aggregates: aggregates ?? undefined,
      easyShare: EASY_WORD_SHARE[settings.practice.difficulty],
    });
  }, [lesson, pack, lessonId, seed, aggregates, settings.practice.difficulty]);

  if (!courses) return <p class="loading">Loading…</p>;
  if (!found || !lesson || !course) {
    return (
      <div class="empty-state">
        <p>That lesson does not exist.</p>
        <button class="btn" type="button" onClick={() => navigate('/learn')}>
          Back to Learn
        </button>
      </div>
    );
  }
  if (!pack || !generated) return <p class="loading">Loading lesson…</p>;

  const onComplete = (m: Metrics, capture: readonly Capture[]): void => {
    const passed = passes(m.wpm, m.accuracy, lesson.targetWpm, lesson.targetAccuracy);
    setResult({ m, passed });
    if (settings.practice.progression !== 'off') void progressRepo.addXp(xpForLesson(passed));

    void lessonProgressRepo.record(lesson.id, m.wpm, m.accuracy, passed);

    if (!isRecordable(m) || !idb.available()) return;
    void (async () => {
      try {
        const record: TestRecord = makeTestRecord({
          metrics: m,
          mode: 'lesson',
          lang: course.lang === 'hinglish' ? 'hinglish' : course.lang === 'hi' ? 'hi' : 'en',
          layout: useHindi ? settings.keyboard.hindiLayout : settings.keyboard.physicalLayout,
          duration: 0,
          config: {
            style: lesson.type,
            punctuation: false,
            numbers: false,
            capitalization: false,
            stopOnError: false,
            backspace: 'allow',
          },
          lessonId: lesson.id,
        });
        await historyRepo.add(record, settings.data.historyCap);
        const stored = await idb.get<Aggregates>(STORES.aggregates, 'global');
        const agg = stored ?? emptyAggregates();
        foldTest(agg, record, capture);
        await idb.put(STORES.aggregates, agg, 'global');
      } catch {
        /* storage problems must never break the lesson */
      }
    })();
  };

  if (result) {
    const next = nextLesson(courses, lesson.id);
    return (
      <div class="learn">
        <Result
          metrics={result.m}
          modeLabel={`Learn · ${lesson.title}`}
          isPersonalBest={false}
          failed={null}
          targetWpm={lesson.targetWpm}
          targetAccuracy={lesson.targetAccuracy}
          onRestart={() => {
            setResult(null);
            setSeed(Date.now());
          }}
          onNext={() => {
            if (next) navigate(`/learn/${next.id}`);
            else navigate('/learn');
          }}
        />
        {!next ? <p class="hint">That was the last lesson in {course.name} — nicely done.</p> : null}
      </div>
    );
  }

  const keySet =
    lesson.type === 'keys' || lesson.type === 'intro'
      ? Array.from(new Set((lesson.keys || 'asdfghjkl;').toLowerCase().split('')))
      : [];

  return (
    <div class="learn">
      <div class="lesson-head">
        <div>
          <p class="hint">{course.name}</p>
          <h1>{lesson.title}</h1>
          <p class="lesson-head__objective">{lesson.objective}</p>
        </div>
        <button class="btn btn--ghost btn--sm" type="button" onClick={() => navigate('/learn')}>
          Back to course
        </button>
      </div>

      {generated.usedFallback && lesson.type === 'adaptive' ? (
        <p class="panel empty-state" role="status">
          Not enough typing history yet to target your weak spots — showing a general drill
          instead. Finish a few more tests and this lesson will adapt.
        </p>
      ) : null}

      {course.lang === 'hi' && !useHindi ? (
        <p class="panel empty-state" role="status">
          {hindiLayout.name} is Beta and not wired into Learn yet. Switch to InScript in
          Settings to practice Hindi lessons.
        </p>
      ) : (
        <>
          {settings.keyboard.fingerGuide ? (
            <FingerGuide
              keys={keySet}
              layout={useHindi ? hindiLayout : layoutByAnyId(settings.keyboard.physicalLayout)}
            />
          ) : null}
          <TypingBox
            text={generated.text}
            resetToken={attempt}
            layout={useHindi ? hindiLayout : layoutByAnyId(settings.keyboard.physicalLayout)}
            onComplete={onComplete}
          />
          <div class="type__actions">
            <button
              class="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                setAttempt((a) => a + 1);
                setSeed(Date.now());
              }}
            >
              Restart
            </button>
            {(lesson.targetWpm || lesson.targetAccuracy) ? (
              <span class="hint">
                Target: {lesson.targetWpm ? `${lesson.targetWpm} wpm` : ''}
                {lesson.targetWpm && lesson.targetAccuracy ? ' · ' : ''}
                {lesson.targetAccuracy ? `${lesson.targetAccuracy}% accuracy` : ''}
              </span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
