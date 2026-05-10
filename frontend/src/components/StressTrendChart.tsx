import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { StressResult } from '../lib/supabase';

// ── constants ──────────────────────────────────────────────────────────────

export const SCORE_LOW  = 35;
export const SCORE_HIGH = 65;

// ── helpers ────────────────────────────────────────────────────────────────

export const scoreColor = (score: number): string => {
  if (score < SCORE_LOW)  return '#34d399'; // emerald-400
  if (score < SCORE_HIGH) return '#fbbf24'; // amber-400
  return '#f87171';                          // rose-400
};

const LEVEL_DOT_BG: Record<string, string> = {
  low:    'bg-emerald-400',
  medium: 'bg-amber-400',
  high:   'bg-rose-400',
};

/** Mar 16 */
const fmtShortDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Mar 16, 2026, 03:12 PM */
const fmtFull = (dateString: string): string => {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

// ── chart data types ───────────────────────────────────────────────────────

export interface ChartPoint {
  id:          string;
  xLabel:      string;
  displayDate: string;
  score:       number;
  emotion:     string;
  delta:       number | null;
}

/**
 * Build ChartPoint[] from a StressResult[] that is already in the desired
 * display order (oldest → newest).
 */
export const buildChartData = (sorted: StressResult[]): ChartPoint[] => {
  const labelCount = new Map<string, number>();
  const labelIndex = new Map<string, number>();

  for (const r of sorted) {
    const k = fmtShortDate(r.created_at);
    labelCount.set(k, (labelCount.get(k) ?? 0) + 1);
  }

  return sorted.map((r, i, arr) => {
    const base = fmtShortDate(r.created_at);
    let xLabel: string;
    if ((labelCount.get(base) ?? 0) > 1) {
      const n = (labelIndex.get(base) ?? 0) + 1;
      labelIndex.set(base, n);
      xLabel = n === 1 ? base : `${base} (${n})`;
    } else {
      xLabel = base;
    }
    return {
      id:          r.id,
      xLabel,
      displayDate: fmtFull(r.created_at),
      score:       r.stress_score,
      emotion:     r.predicted_emotion,
      delta:       i === 0 ? null : r.stress_score - arr[i - 1].stress_score,
    };
  });
};

// ── custom tooltip ────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ChartPoint;
  const delta = d.delta;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs min-w-[200px]">
      <p className="font-bold text-slate-700 mb-1">{d.displayDate}</p>
      <p className="text-slate-500 capitalize mb-1">
        Emotion: <span className="font-semibold text-slate-700">{d.emotion}</span>
      </p>
      <p className="text-slate-500 mb-1">
        Score:{' '}
        <span className="font-bold" style={{ color: scoreColor(d.score) }}>
          {d.score.toFixed(1)}
        </span>
        <span className="text-slate-400"> / 100</span>
      </p>
      {delta !== null && (
        <p className={`font-medium mt-1 ${delta > 0 ? 'text-rose-500' : delta < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
          {delta > 0
            ? `↑ ${delta.toFixed(1)} pts from previous`
            : delta < 0
            ? `↓ ${Math.abs(delta).toFixed(1)} pts from previous`
            : 'Same as previous'}
        </p>
      )}
    </div>
  );
};

// ── custom dot ────────────────────────────────────────────────────────────

const ColoredDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={scoreColor(payload.score)}
      stroke="#fff"
      strokeWidth={2}
      style={{ filter: `drop-shadow(0 0 3px ${scoreColor(payload.score)}80)` }}
    />
  );
};

// ── component ─────────────────────────────────────────────────────────────

interface StressTrendChartProps {
  /** Pre-sorted ChartPoint array (oldest → newest). Use buildChartData() to create it. */
  data: ChartPoint[];
  /** Chart height in px. Defaults to 280. */
  height?: number;
  /** Whether to show the colour-coded legend. Defaults to true. */
  showLegend?: boolean;
}

export function StressTrendChart({ data, height = 280, showLegend = true }: StressTrendChartProps) {
  return (
    <div>
      {showLegend && (
        <div className="flex items-center gap-4 flex-wrap mb-4">
          {(['low', 'medium', 'high'] as const).map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-slate-500 capitalize font-medium">
              <span className={`w-2 h-2 rounded-full ${LEVEL_DOT_BG[k]}`} />
              {k}
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="xLabel"
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={6}
            interval={0}
            height={30}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 35, 65, 100]}
            tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }} />
          <ReferenceLine
            y={SCORE_LOW}
            stroke="#34d399"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Low / Medium', position: 'insideTopLeft', fontSize: 11, fill: '#34d399', dx: 4, dy: -4 }}
          />
          <ReferenceLine
            y={SCORE_HIGH}
            stroke="#f87171"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: 'Medium / High', position: 'insideTopLeft', fontSize: 11, fill: '#f87171', dx: 4, dy: -4 }}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke="#94a3b8"
            strokeWidth={2}
            dot={<ColoredDot />}
            activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
