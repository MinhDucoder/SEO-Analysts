import { classify } from '../lib/theme/classify';

const SIZES = {
  lg: { box: 96, radius: 40, stroke: 8, fontSize: 24 },
  sm: { box: 42, radius: 18, stroke: 4, fontSize: 13 },
} as const;

export type RingSize = keyof typeof SIZES;

interface ArcResult {
  circumference: number;
  offset: number;
}

/** Pure SVG arc math — testable without DOM. */
export function computeArc(score: number, radius: number): ArcResult {
  const clamped = Math.max(0, Math.min(100, score));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return { circumference, offset };
}

interface ScoreRingProps {
  score: number;
  size?: RingSize;
  label?: string;
}

export function ScoreRing({ score, size = 'lg', label }: ScoreRingProps) {
  const dims = SIZES[size];
  const { circumference, offset } = computeArc(score, dims.radius);
  const cls = classify(score);
  const color = `rgb(var(--color-class-${cls}))`;
  const cx = dims.box / 2;

  return (
    <div className={`score-ring score-ring-${size}`}>
      <svg width={dims.box} height={dims.box} viewBox={`0 0 ${dims.box} ${dims.box}`}>
        <circle
          cx={cx} cy={cx} r={dims.radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={dims.stroke}
        />
        <circle
          cx={cx} cy={cx} r={dims.radius}
          fill="none"
          stroke={color}
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
        <text
          x={cx} y={cx}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={dims.fontSize}
          fontWeight={700}
          fill="var(--color-fg)"
        >
          {Math.round(Math.max(0, Math.min(100, score)))}
        </text>
      </svg>
      {label && size === 'lg' && <span className="score-ring-label">{label}</span>}
    </div>
  );
}
