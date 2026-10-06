import { useEffect, useState } from 'preact/hooks';
import { loadCurriculum, type Course } from '../../core/curriculum';
import { lessonProgressRepo, type LessonProgress } from '../../store/lessons';
import { navigate } from '../../router';

function statusIcon(p: LessonProgress | undefined): string {
  if (p?.completed) return '✓';
  if (p && p.attempts > 0) return '•';
  return '';
}

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
        <p>Structured courses from first keys to full paragraphs, in English and Hindi.</p>
      </div>

      <div class="course-grid">
        {courses.map((course) => {
          const done = course.lessons.filter((l) => progress.get(l.id)?.completed).length;
          const pct = Math.round((done / course.lessons.length) * 100);
          return (
            <section class="course-card panel" key={course.id} aria-label={course.name}>
              <div class="course-card__head">
                <h2>{course.name}</h2>
                <span class="hint">
                  {done}/{course.lessons.length}
                </span>
              </div>
              <div class="course-card__progress">
                <span style={{ width: `${pct}%` }} />
              </div>
              <div class="lesson-list">
                {course.lessons.map((lesson, i) => {
                  const prevDone = i === 0 || progress.get(course.lessons[i - 1]!.id)?.completed;
                  const locked = !prevDone;
                  const p = progress.get(lesson.id);
                  return (
                    <a
                      key={lesson.id}
                      class="lesson-row"
                      href={`/learn/${lesson.id}`}
                      data-locked={locked ? 'true' : 'false'}
                      aria-disabled={locked}
                      onClick={(e) => {
                        if (locked) e.preventDefault();
                      }}
                    >
                      <span class="lesson-row__status">{locked ? '🔒' : statusIcon(p)}</span>
                      <span class="lesson-row__title">{lesson.title}</span>
                      <span class="lesson-row__meta">{lesson.estMinutes} min</span>
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
