import React, { useState } from 'react';
import { StressResult } from '../lib/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  SlidersHorizontal,
  AlertTriangle,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface HistoryViewProps {
  results: StressResult[];
}

type FilterLevel = 'all' | 'normal' | 'mild' | 'moderate' | 'high' | 'severe';
type SortDir = 'asc' | 'desc';
type DateRange = 'today' | 'week' | 'month' | '3months' | 'all';

// ── constants ──────────────────────────────────────────────────────────────

const LEVEL_STYLES: Record<string, string> = {
  normal:   'text-green-700 bg-green-100 border-green-200',
  mild:     'text-teal-700 bg-teal-100 border-teal-200',
  moderate: 'text-amber-700 bg-amber-100 border-amber-200',
  high:     'text-orange-700 bg-orange-100 border-orange-200',
  severe:   'text-red-700 bg-red-100 border-red-200',
};

const LEVEL_BAR: Record<string, string> = {
  normal:   'bg-green-400',
  mild:     'bg-teal-400',
  moderate: 'bg-amber-400',
  high:     'bg-orange-400',
  severe:   'bg-red-400',
};

const LEVEL_DOT: Record<string, string> = {
  all:      'bg-slate-400',
  normal:   'bg-green-400',
  mild:     'bg-teal-400',
  moderate: 'bg-amber-400',
  high:     'bg-orange-400',
  severe:   'bg-red-400',
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

const DATE_RANGE_PRESETS: { key: DateRange; label: string }[] = [
  { key: 'today',   label: 'Today' },
  { key: 'week',    label: 'This Week' },
  { key: 'month',   label: 'This Month' },
  { key: '3months', label: 'Last 3 Months' },
  { key: 'all',     label: 'All Time' },
];

// ── helpers ────────────────────────────────────────────────────────────────

const getDateRangeStart = (range: DateRange): Date | null => {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === 'week') {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (range === '3months') {
    const d = new Date(now);
    d.setMonth(now.getMonth() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
};

const scoreColor = (score: number): string => {
  if (score < 20) return '#4ade80';
  if (score < 35) return '#2dd4bf';
  if (score < 55) return '#fbbf24';
  if (score < 75) return '#fb923c';
  return '#f87171';
};

const getStressLevelKey = (level: string): 'normal' | 'mild' | 'moderate' | 'high' | 'severe' => {
  const l = level.toLowerCase();
  if (l === 'normal')   return 'normal';
  if (l === 'mild')     return 'mild';
  if (l === 'moderate') return 'moderate';
  if (l === 'high')     return 'high';
  return 'severe';
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

const PAGE_SIZE = 10;

export function HistoryView({ results }: HistoryViewProps) {
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);

  // ── base sorted list (oldest → newest) ──────────────────────────────────
  const sortedAll = [...results].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // ── apply date range — drives EVERYTHING ────────────────────────────────
  const rangeStart = getDateRangeStart(dateRange);
  const rangeFiltered = rangeStart
    ? sortedAll.filter((r) => new Date(r.created_at) >= rangeStart)
    : sortedAll;

  // ── stats (based on rangeFiltered) ──────────────────────────────────────
  const totalAnalyses = rangeFiltered.length;
  const avgScore =
    totalAnalyses > 0
      ? rangeFiltered.reduce((s, r) => s + r.stress_score, 0) / totalAnalyses
      : 0;
  const highestScore =
    totalAnalyses > 0 ? Math.max(...rangeFiltered.map((r) => r.stress_score)) : 0;
  const emotionFreq = rangeFiltered.reduce<Record<string, number>>((acc, r) => {
    acc[r.predicted_emotion] = (acc[r.predicted_emotion] ?? 0) + 1;
    return acc;
  }, {});
  const [mostFrequentEmotion, topEmotionCount] =
    totalAnalyses > 0
      ? Object.entries(emotionFreq).sort(([, a], [, b]) => b - a)[0] ?? ['—', 0]
      : ['—', 0];

  const avgLabel =
    avgScore >= 75 ? { text: 'Severe',   cls: 'text-red-600 bg-red-50 border-red-200' } :
    avgScore >= 55 ? { text: 'High',     cls: 'text-orange-600 bg-orange-50 border-orange-200' } :
    avgScore >= 35 ? { text: 'Moderate', cls: 'text-amber-600 bg-amber-50 border-amber-200' } :
    avgScore >= 20 ? { text: 'Mild',     cls: 'text-teal-600 bg-teal-50 border-teal-200' } :
                     { text: 'Normal',   cls: 'text-green-600 bg-green-50 border-green-200' };

  // ── chart — latest 10 within range ──────────────────────────────────────
  const chartData = buildChartData(rangeFiltered.slice(-10));

  // ── table rows — level-filtered + sorted ────────────────────────────────
  const allFilteredRows = rangeFiltered
    .filter((r) => filter === 'all' || getStressLevelKey(r.stress_level) === filter)
    .sort((a, b) =>
      sortDir === 'asc'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  const totalRows  = allFilteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const tableRows  = allFilteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstIdx   = totalRows === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastIdx    = Math.min(safePage * PAGE_SIZE, totalRows);

  const handleFilterChange    = (f: FilterLevel) => { setFilter(f); setPage(1); };
  const handleDateRangeChange = (r: DateRange)    => { setDateRange(r); setPage(1); };
  const handleSortToggle      = () => { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); setPage(1); };

  const timestampLabels = deduplicateTimestamps(tableRows);

  const FILTERS: { key: FilterLevel; label: string; activeStyle: string; dot: string }[] = [
    { key: 'all',      label: 'All',      activeStyle: 'bg-slate-700 text-white border-slate-700',      dot: 'bg-slate-400' },
    { key: 'normal',   label: 'Normal',   activeStyle: 'bg-green-600 text-white border-green-600',      dot: 'bg-green-400' },
    { key: 'mild',     label: 'Mild',     activeStyle: 'bg-teal-600 text-white border-teal-600',        dot: 'bg-teal-400' },
    { key: 'moderate', label: 'Moderate', activeStyle: 'bg-amber-500 text-white border-amber-500',      dot: 'bg-amber-400' },
    { key: 'high',     label: 'High',     activeStyle: 'bg-orange-500 text-white border-orange-500',    dot: 'bg-orange-400' },
    { key: 'severe',   label: 'Severe',   activeStyle: 'bg-red-600 text-white border-red-600',          dot: 'bg-red-400' },
  ];

  if (results.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-500 mb-1.5">Reports</p>
          <h2 className="text-2xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">Analysis History</span>
          </h2>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 flex items-center justify-center mx-auto mb-5">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No History Yet</h3>
          <p className="text-slate-500 text-sm max-w-xs mx-auto">Your analysis history will appear here once you start analyzing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold leading-tight mb-1">
              <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">Analysis History</span>
            </h1>
          </div>
        </div>

        {/* ── Date range selector ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
            <Calendar className="w-3 h-3" />
            Period
          </span>
          {DATE_RANGE_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleDateRangeChange(key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                dateRange === key
                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm shadow-cyan-100'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Activity className="w-5 h-5 text-cyan-600" />} iconBg="bg-cyan-50" label="Total Analyses">
          <p className="text-2xl font-bold text-slate-800 leading-tight">{totalAnalyses}</p>
        </StatCard>

        <StatCard icon={<TrendingUp className="w-5 h-5 text-teal-600" />} iconBg="bg-teal-50" label="Avg Stress Score">
          <p className="text-2xl font-bold text-slate-800 leading-tight">
            {totalAnalyses > 0 ? avgScore.toFixed(1) : '—'}<span className="text-sm font-normal text-slate-400">{totalAnalyses > 0 ? ' / 100' : ''}</span>
          </p>
          {totalAnalyses > 0 && (
            <span className={`inline-flex items-center gap-1.5 mt-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${avgLabel.cls}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
              {avgLabel.text}
            </span>
          )}
        </StatCard>

        <StatCard icon={<AlertTriangle className="w-5 h-5 text-rose-500" />} iconBg="bg-rose-50" label="Highest Score">
          <p className="text-2xl font-bold text-slate-800 leading-tight">{totalAnalyses > 0 ? highestScore.toFixed(1) : '—'}</p>
        </StatCard>

        <StatCard icon={<Brain className="w-5 h-5 text-sky-500" />} iconBg="bg-sky-50" label="Top Emotion">
          <p className="text-2xl font-bold text-slate-800 leading-tight capitalize">{mostFrequentEmotion}</p>
          {totalAnalyses > 0 && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
              {topEmotionCount}/{totalAnalyses} scans
            </span>
          )}
        </StatCard>
      </div>

      {/* ── Stress Trend chart ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-teal-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Stress Trend</h3>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold text-slate-500">
              {chartData.length > 0 ? `Last ${chartData.length} readings` : 'No data'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-5">
          {([
            { key: 'normal',   label: 'Normal',   color: 'bg-green-400',  text: 'text-green-700',  ring: 'ring-green-200',  bg: 'bg-green-50' },
            { key: 'mild',     label: 'Mild',     color: 'bg-teal-400',   text: 'text-teal-700',   ring: 'ring-teal-200',   bg: 'bg-teal-50' },
            { key: 'moderate', label: 'Moderate', color: 'bg-amber-400',  text: 'text-amber-700',  ring: 'ring-amber-200',  bg: 'bg-amber-50' },
            { key: 'high',     label: 'High',     color: 'bg-orange-400', text: 'text-orange-700', ring: 'ring-orange-200', bg: 'bg-orange-50' },
            { key: 'severe',   label: 'Severe',   color: 'bg-red-400',    text: 'text-red-700',    ring: 'ring-red-200',    bg: 'bg-red-50' },
          ] as const).map(({ key, label, color, text, ring, bg }) => (
            <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${bg} ${text} ring-1 ${ring}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>

        {chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
            No data for selected period
          </div>
        ) : (
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
                ticks={[0, 20, 35, 55, 75, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }} />
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
        )}
      </div>

      {/* ── All Analyses table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Table toolbar */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">All Analyses</h3>
                <p className="text-[11px] text-slate-400">{totalRows} record{totalRows !== 1 ? 's' : ''}</p>
              </div>
            </div>

            <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-2">
                <SlidersHorizontal className="w-3 h-3" />
                Filter
              </span>
              {FILTERS.map(({ key, label, activeStyle, dot }) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                    filter === key
                      ? `${activeStyle} shadow-sm`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${filter === key ? 'bg-white/70' : dot}`} />
                  {label}
                  {filter === key && totalRows > 0 && (
                    <span className="ml-0.5 bg-white/20 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none">
                      {totalRows}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left py-3 px-5">
                  <button
                    onClick={handleSortToggle}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors group"
                  >
                    <Clock className="w-3 h-3 group-hover:text-slate-500 transition-colors" />
                    Date & Time
                    <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded bg-slate-200 group-hover:bg-slate-300 transition-colors">
                      {sortDir === 'asc'
                        ? <ChevronUp className="w-2.5 h-2.5" />
                        : sortDir === 'desc'
                        ? <ChevronDown className="w-2.5 h-2.5" />
                        : <ChevronsUpDown className="w-2.5 h-2.5" />}
                    </span>
                  </button>
                </th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Stress Score</th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Level</th>
                <th className="text-left py-3 px-5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Emotion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <SlidersHorizontal className="w-5 h-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No records match these filters</p>
                      <button
                        onClick={() => { handleFilterChange('all'); handleDateRangeChange('all'); }}
                        className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 underline underline-offset-2"
                      >
                        Clear all filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                tableRows.map((result) => {
                  const levelKey = getStressLevelKey(result.stress_level);
                  return (
                    <tr key={result.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition-colors">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            {timestampLabels.get(result.id) ?? fmt(result.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-sm font-bold w-8 shrink-0 tabular-nums"
                            style={{ color: scoreColor(result.stress_score) }}
                          >
                            {result.stress_score.toFixed(0)}
                          </span>
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${LEVEL_BAR[levelKey]}`}
                              style={{ width: `${result.stress_score}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">/ 100</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${LEVEL_STYLES[levelKey]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${LEVEL_DOT[levelKey]}`} />
                          {result.stress_level}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
                          {emotionIcon(result.predicted_emotion)}
                          {result.predicted_emotion}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalRows > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <span className="text-xs text-slate-400 font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              {firstIdx}–{lastIdx} <span className="text-slate-300 mx-1">/</span> {totalRows} {totalRows === 1 ? 'analysis' : 'analyses'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === '…' ? (
                    <span key={`ellipsis-${i}`} className="w-8 text-center text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                        safePage === p
                          ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-200'
                          : 'border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
