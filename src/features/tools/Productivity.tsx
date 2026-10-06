import { useEffect, useRef, useState } from 'preact/hooks';
import { navigate } from '../../router';
import './tools.css';

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

/** A plain countdown: no audio (docs/09 "no Sound category"), just a visible phase change. */
function useCountdown(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const tick = (now: number): void => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setRemaining((r) => {
        const next = r - dt;
        if (next <= 0) {
          setRunning(false);
          setDone(true);
          return 0;
        }
        return next;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running]);

  const reset = (seconds: number): void => {
    setRunning(false);
    setDone(false);
    setRemaining(seconds);
  };

  return { remaining, running, done, setRunning, reset };
}

function Pomodoro() {
  const [workMin, setWorkMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [phase, setPhase] = useState<'work' | 'break'>('work');
  const cd = useCountdown(workMin * 60);

  useEffect(() => {
    if (!cd.done) return;
    const nextPhase = phase === 'work' ? 'break' : 'work';
    setPhase(nextPhase);
    cd.reset((nextPhase === 'work' ? workMin : breakMin) * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cd.done]);

  return (
    <div class="panel calc">
      <h3>Pomodoro</h3>
      <div class="calc__row">
        <label class="calc__field">
          <span>Work (min)</span>
          <input
            type="number"
            min={1}
            max={120}
            value={workMin}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value) || 25;
              setWorkMin(v);
              if (phase === 'work' && !cd.running) cd.reset(v * 60);
            }}
          />
        </label>
        <label class="calc__field">
          <span>Break (min)</span>
          <input
            type="number"
            min={1}
            max={60}
            value={breakMin}
            onInput={(e) => setBreakMin(Number((e.target as HTMLInputElement).value) || 5)}
          />
        </label>
      </div>
      <div class="pomo" data-phase={phase}>
        <span class="pomo__phase">{phase === 'work' ? 'Focus' : 'Break'}</span>
        <span class="pomo__clock">{fmt(cd.remaining)}</span>
      </div>
      <div class="calc__row">
        <button class="btn btn--sm btn--primary" type="button" onClick={() => cd.setRunning((r) => !r)}>
          {cd.running ? 'Pause' : 'Start'}
        </button>
        <button
          class="btn btn--sm"
          type="button"
          onClick={() => {
            setPhase('work');
            cd.reset(workMin * 60);
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function SessionTimer() {
  const [minutes, setMinutes] = useState(10);
  const cd = useCountdown(minutes * 60);

  return (
    <div class="panel calc">
      <h3>Typing session timer</h3>
      <p class="hint">A plain countdown to time any typing session, independent of Type's own timer.</p>
      <div class="calc__row">
        <label class="calc__field">
          <span>Minutes</span>
          <input
            type="number"
            min={1}
            max={180}
            value={minutes}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value) || 10;
              setMinutes(v);
              if (!cd.running) cd.reset(v * 60);
            }}
          />
        </label>
      </div>
      <div class="pomo" data-phase={cd.done ? 'break' : 'work'}>
        <span class="pomo__clock">{fmt(cd.remaining)}</span>
      </div>
      <div class="calc__row">
        <button class="btn btn--sm btn--primary" type="button" onClick={() => cd.setRunning((r) => !r)}>
          {cd.running ? 'Pause' : 'Start'}
        </button>
        <button class="btn btn--sm" type="button" onClick={() => cd.reset(minutes * 60)}>
          Reset
        </button>
      </div>
    </div>
  );
}

function GoalTimer() {
  const [minutes, setMinutes] = useState(5);
  const cd = useCountdown(minutes * 60);

  return (
    <div class="panel calc">
      <h3>Practice goal timer</h3>
      <p class="hint">
        Set a short goal window, then jump into Practice — Settings → Practice → Session length
        controls the default there.
      </p>
      <div class="calc__row">
        <label class="calc__field">
          <span>Minutes</span>
          <input
            type="number"
            min={1}
            max={60}
            value={minutes}
            onInput={(e) => {
              const v = Number((e.target as HTMLInputElement).value) || 5;
              setMinutes(v);
              if (!cd.running) cd.reset(v * 60);
            }}
          />
        </label>
        <button class="btn btn--sm" type="button" onClick={() => navigate('/practice')}>
          Open Practice →
        </button>
      </div>
      <div class="pomo" data-phase={cd.done ? 'break' : 'work'}>
        <span class="pomo__clock">{fmt(cd.remaining)}</span>
      </div>
      <div class="calc__row">
        <button class="btn btn--sm btn--primary" type="button" onClick={() => cd.setRunning((r) => !r)}>
          {cd.running ? 'Pause' : 'Start'}
        </button>
        <button class="btn btn--sm" type="button" onClick={() => cd.reset(minutes * 60)}>
          Reset
        </button>
      </div>
    </div>
  );
}

export function Productivity() {
  return (
    <div class="tools">
      <Pomodoro />
      <SessionTimer />
      <GoalTimer />
    </div>
  );
}
