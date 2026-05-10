import React, { useState } from 'react';
import { StressResult } from '../lib/supabase';
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
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Activity,
  Brain,
  Smile,
  Frown,
  Meh,
  Filter,
  AlertTriangle,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface HistoryViewProps {
  results: StressResult[];
}

type FilterLevel = 'all' | 'low' | 'medium' | 'high';
type SortDir = 'asc' | 'desc';

// ── constants ──────────────────────────────────────────────────────────────

const SCORE_LOW  = 35;
const SCORE_HIGH = 65;

const LEVEL_STYLES: Record<string, string> = {
  low: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  high: 'text-rose-700 bg-rose-50 border-rose-200',
};

const LEVEL_BAR: Record<string, string> = {
  low: 'bg-emerald-400',
  medium: 'bg-amber-400',
  high: 'bg-rose-400',
};


const EMOTION_ICONS: Record<string, React.ReactNode> = {
  happy:    <Smile className="w-4 h-4" />,
  sad:      <Frown className="w-4 h-4" />,
  angry:    <Frown className="w-4 h-4" />,
  fear:     <Meh className="w-4 h-4" />,
  surprise: <Meh className="w-4 h-4" />,
  neutral:  <Meh className="w-4 h-4" />,
  disgust:  <Meh className="w-4 h-4" />,
};

// ── helpers ────────────────────────────────────────────────────────────────

const scoreColor = (score: number): string => {
  if (score < SCORE_LOW)  return '#34d399';
  if (score < SCORE_HIGH) return '#fbbf24';
  return '#f87171';
};

const getStressLevelKey = (level: string): 'low' | 'medium' | 'high' => {
  const l = level.toLowerCase();
  if (l.includes('low'))  return 'low';
  if (l.includes('high')) return 'high';
  return 'medium';
};

const emotionIcon = (emotion: string) =>
  EMOTION_ICONS[emotion.toLowerCase()] ?? <Brain className="w-4 h-4" />;

/** Mar 16, 2026, 03:12 PM */
const fmt = (dateString: string, withSeconds = false): string => {
  const d = new Date(dateString);
  const base = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit', minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: true,
  };
  return `${base}, ${d.toLocaleTimeString('en-US', timeOpts)}`;
};

/** Mar 16 */
const fmtShortDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── chart types & helpers ──────────────────────────────────────────────────

interface ChartPoint {
  id:          string;
  xLabel:      string;
  displayDate: string;
  score:       number;
  emotion:     string;
  delta:       number | null;
}

const buildChartData = (sorted: StressResult[]): ChartPoint[] => {
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
      displayDate: fmt(r.created_at),
      score:       r.stress_score,
      emotion:     r.predicted_emotion,
      delta:       i === 0 ? null : r.stress_score - arr[i - 1].stress_score,
    };
  });
};

// ── dedup timestamps for the table display ────────────────────────────────

const deduplicateTimestamps = (rows: StressResult[]): Map<string, string> => {
  const displayMap = new Map<string, string>();
  const baseCount = new Map<string, number>();
  const baseIndex = new Map<string, number>();

  for (const r of rows) {
    const base = fmt(r.created_at);
    baseCount.set(base, (baseCount.get(base) ?? 0) + 1);
  }

  for (const r of rows) {
    const base = fmt(r.created_at);
    if ((baseCount.get(base) ?? 0) > 1) {
      const hasSeconds = /:\d{2}:\d{2}/.test(r.created_at);
      if (hasSeconds) {
        displayMap.set(r.id, fmt(r.created_at, true));
      } else {
        const idx = (baseIndex.get(base) ?? 0) + 1;
        baseIndex.set(base, idx);
        displayMap.set(r.id, `${base} (${idx})`);
      }
    } else {
      displayMap.set(r.id, base);
    }
  }
  return displayMap;
};

// ── chart sub-components ───────────────────────────────────────────────────

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

// ── stat card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  children: React.ReactNode;
}

const StatCard = ({ icon, iconBg, label, children }: StatCardProps) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  </div>
);

// ── main component ─────────────────────────────────────────────────────────

export function HistoryView({ results }: HistoryViewProps) {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = [...results].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // stats
  const totalAnalyses = results.length;
  const avgScore =
    totalAnalyses > 0
      ? results.reduce((s, r) => s + r.stress_score, 0) / totalAnalyses
      : 0;
  const highestScore =
    totalAnalyses > 0 ? Math.max(...results.map((r) => r.stress_score)) : 0;
  const emotionFreq = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.predicted_emotion] = (acc[r.predicted_emotion] ?? 0) + 1;
    return acc;
  }, {});
  const [mostFrequentEmotion, topEmotionCount] =
    totalAnalyses > 0
      ? Object.entries(emotionFreq).sort(([, a], [, b]) => b - a)[0] ?? ['—', 0]
      : ['—', 0];

  const avgLabel =
    avgScore >= SCORE_HIGH ? { text: 'High average', cls: 'text-rose-600 bg-rose-50' } :
    avgScore >= SCORE_LOW  ? { text: 'Moderate average', cls: 'text-amber-600 bg-amber-50' } :
                             { text: 'Low average', cls: 'text-emerald-600 bg-emerald-50' };

  // chart points (oldest → newest)
  const chartData = buildChartData(sorted);

  // table rows — filtered + sorted
  const tableRows = sorted
    .filter((r) => filter === 'all' || getStressLevelKey(r.stress_level) === filter)
    .sort((a, b) =>
      sortDir === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const timestampLabels = deduplicateTimestamps(tableRows);

  const FILTERS: { key: FilterLevel; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'low', label: 'Low' },
    { key: 'medium', label: 'Medium' },
    { key: 'high', label: 'High' },
  ];

  if (totalAnalyses === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Analysis History</h2>
          <p className="text-slate-500 text-sm">Track your stress patterns over time</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-5">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No History Yet</h3>
          <p className="text-slate-500 text-sm">Your analysis history will appear here once you start analyzing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Page header ── */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Analysis History</h2>
        <p className="text-slate-500 text-sm">Track your stress patterns and emotional trends over time</p>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="w-5 h-5 text-cyan-600" />} iconBg="bg-cyan-50" label="Total Analyses">
          <p className="text-2xl font-bold text-slate-800 leading-tight">{totalAnalyses}</p>
          <p className="text-xs text-slate-400 mt-0.5">all time</p>
        </StatCard>

        <StatCard icon={<TrendingUp className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" label="Avg Stress Score">
          <p className="text-2xl font-bold text-slate-800 leading-tight">
            {avgScore.toFixed(1)}<span className="text-sm font-normal text-slate-400"> / 100</span>
          </p>
          <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${avgLabel.cls}`}>
            {avgLabel.text}
          </span>
        </StatCard>

        <StatCard icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} iconBg="bg-rose-50" label="Highest Score">
          <p className="text-2xl font-bold text-slate-800 leading-tight">{highestScore.toFixed(1)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Your peak stress level</p>
        </StatCard>

        <StatCard icon={<Brain className="w-5 h-5 text-violet-500" />} iconBg="bg-violet-50" label="Top Emotion">
          <p className="text-2xl font-bold text-slate-800 leading-tight capitalize">{mostFrequentEmotion}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            detected in {topEmotionCount} of {totalAnalyses} analyses
          </p>
        </StatCard>
      </div>

      {/* ── Stress Score Trend ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Stress Score Trend</h3>
            <p className="text-[11px] text-slate-400">oldest to newest</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
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
            <ReferenceLine y={SCORE_LOW} stroke="#34d399" strokeDasharray="4 3" strokeWidth={1.5} />
            <ReferenceLine y={SCORE_HIGH} stroke="#f87171" strokeDasharray="4 3" strokeWidth={1.5} />
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

      {/* ── All Analyses table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">All Analyses</h3>
              <p className="text-[11px] text-slate-400">{tableRows.length} record{tableRows.length !== 1 ? 's' : ''} shown</p>
            </div>
          </div>

          <div className="sm:ml-auto flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  filter === key
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-5">
                  <button
                    onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Date & Time
                    {sortDir === 'asc' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : sortDir === 'desc' ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Emotion</th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Stress Score</th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm text-slate-400">
                    No records match this filter.
                  </td>
                </tr>
              ) : (
                tableRows.map((result) => {
                  const levelKey = getStressLevelKey(result.stress_level);
                  return (
                    <tr key={result.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="text-sm text-slate-700 font-medium">
                          {timestampLabels.get(result.id) ?? fmt(result.created_at)}
                        </p>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
                          {emotionIcon(result.predicted_emotion)}
                          {result.predicted_emotion}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-slate-800 w-8 shrink-0">
                            {result.stress_score.toFixed(0)}
                          </span>
                          <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${LEVEL_BAR[levelKey]}`}
                              style={{ width: `${result.stress_score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${LEVEL_STYLES[levelKey]}`}>
                          {result.stress_level}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
