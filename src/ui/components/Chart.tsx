/**
 * Hand-written SVG line chart (no chart library — AGENT.md).
 * Used for the result graph; Step 2 reuses it for progress over time.
 */
export interface Series {
  points: readonly number[];
  color: string;
  label: string;
  /** Draw as a dashed line (e.g. raw WPM). */
  dashed?: boolean;
}

export interface ChartProps {
  series: readonly Series[];
  /** X axis tick labels; defaults to 1..n */
  xLabel?: string;
  height?: number;
  ariaLabel: string;
}

const W = 600;

export function LineChart({ series, xLabel, height = 160, ariaLabel }: ChartProps) {
  const n = Math.max(...series.map((s) => s.points.length), 0);
  if (n < 2) {
    return (
      <p class="hint" role="img" aria-label={ariaLabel}>
        Not enough samples to draw a graph — a longer test will show one.
      </p>
    );
  }

  const H = height;
  const padL = 34;
  const padB = 20;
  const padT = 8;
  const padR = 6;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(1, ...series.flatMap((s) => s.points));
  const niceMax = Math.ceil(max / 20) * 20 || 20;

  const x = (i: number): number => padL + (i / (n - 1)) * innerW;
  const y = (v: number): number => padT + innerH - (v / niceMax) * innerH;

  const ticks = [0, niceMax / 2, niceMax];

  return (
    <svg
      class="chart"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(t)}
            y2={y(t)}
            stroke="var(--border)"
            stroke-width="1"
          />
          <text
            x={padL - 6}
            y={y(t) + 4}
            text-anchor="end"
            font-size="10"
            fill="var(--muted)"
          >
            {Math.round(t)}
          </text>
        </g>
      ))}

      {series.map((s) => {
        if (s.points.length < 2) return null;
        const d = s.points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
        return (
          <path
            key={s.label}
            d={d}
            fill="none"
            stroke={s.color}
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
            stroke-dasharray={s.dashed ? '4 4' : undefined}
          />
        );
      })}

      {xLabel ? (
        <text x={W / 2} y={H - 4} text-anchor="middle" font-size="10" fill="var(--muted)">
          {xLabel}
        </text>
      ) : null}
    </svg>
  );
}
