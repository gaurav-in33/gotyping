import { useEffect, useState } from 'preact/hooks';
import { loadCurriculum, type Course } from '../../core/curriculum';
import { lessonProgressRepo, type LessonProgress } from '../../store/lessons';
import { navigate } from '../../router';

export function CourseHome() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [progress, setProgress] = useState<Map<string, LessonProgress>>(new Map());

  useEffect(() => {
    let alive = true;
    void Promise.all([loadCurriculum(), lessonProgressRepo.all()]).then(([c, p]) => {
      if (!alive) return;
      setCourses(c);
      setProgress(new Map(p.map((x) => [x.id, x])));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!courses) return <p class="loading">Loading courses…</p>;

  return (
    <div class="learn">
      <div class="page-head">
        <h1>Learn</h1>
        <p>
          Structured courses from first keys to full paragraphs, in English and Hindi. Every
          lesson is open — start anywhere, in any order. "Continue" just marks a suggestion.
        </p>
      </div>

      <div class="course-grid">
        {courses.map((course) => {
          const total = course.lessons.length;
          const done = course.lessons.filter((l) => progress.get(l.id)?.completed).length;
          const pct = Math.round((done / total) * 100);
          // Pure suggestion, never a gate: the first lesson in this course the
          // learner hasn't passed yet. Undefined once every lesson is done.
          const continueLesson = course.lessons.find((l) => !progress.get(l.id)?.completed);
          return (
            <section class="course-card panel" key={course.id} aria-label={course.name}>
              <div class="course-card__head">
                <h2>{course.name}</h2>
                <span class="hint">
                  {done}/{total}
                </span>
              </div>
              <div class="course-card__progress">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div class="lesson-grid">
                {course.lessons.map((lesson, i) => {
                  const p = progress.get(lesson.id);
                  const passed = !!p?.completed;
                  const isContinue = continueLesson?.id === lesson.id;
                  const title = passed
                    ? `${lesson.title} — best ${p.bestAccuracy}% accuracy, ${p.bestWpm} wpm`
                    : lesson.title;
                  return (
                    <a
                      key={lesson.id}
                      class={`lesson-tile${passed ? ' lesson-tile--done' : ''}${
                        isContinue ? ' lesson-tile--continue' : ''
                      }`}
                      href={`/learn/${lesson.id}`}
                      title={title}
                    >
                      {isContinue ? <span class="lesson-tile__badge">Continue</span> : null}
                      {passed ? (
                        <span class="lesson-tile__check" aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                      <span class="lesson-tile__num">{i + 1}</span>
                      <span class="lesson-tile__title">{lesson.title}</span>
                      <span class="lesson-tile__time">
                        {passed ? `${p.bestAccuracy}% best` : `${lesson.estMinutes} min`}
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p class="hint">
        Finished every lesson in a course? Head to{' '}
        <a
          href="/practice"
          onClick={(e) => {
            e.preventDefault();
            navigate('/practice');
          }}
        >
          Practice
        </a>{' '}
        for drills built from your own weak spots.
      </p>
    </div>
  );
}
