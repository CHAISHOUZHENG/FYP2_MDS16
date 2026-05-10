import React, { useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { StressResult } from '../lib/supabase';
import {
  Activity,
  Brain,
  Calendar,
  Lightbulb,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface DashboardViewProps {
  results: StressResult[];
  profile: any;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const getStressInfo = (score: number) => {
  if (score < 35) return { level: 'Low', colorCls: 'emerald', dot: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', message: "You're doing great!" };
  if (score < 65) return { level: 'Medium', colorCls: 'amber', dot: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-200', message: 'Stay mindful' };
  return { level: 'High', colorCls: 'rose', dot: '#f43f5e', badge: 'bg-rose-50 text-rose-700 border-rose-200', message: 'Take care of yourself' };
};

const EMOTION_META: Record<string, { icon: string; color: string; bg: string }> = {
  happy:    { icon: '😊', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  sad:      { icon: '😢', color: 'text-blue-500',    bg: 'bg-blue-50 border-blue-200' },
  angry:    { icon: '😠', color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200' },
  fear:     { icon: '😰', color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200' },
  surprise: { icon: '😮', color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  disgust:  { icon: '😒', color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
  neutral:  { icon: '😐', color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200' },
};

const emotionMeta = (e: string) =>
  EMOTION_META[e.toLowerCase()] ?? { icon: '🙂', color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' };

const topEmotion = (results: StressResult[]) => {
  if (!results.length) return 'neutral';
  const freq = results.reduce<Record<string, number>>((a, r) => {
    a[r.predicted_emotion] = (a[r.predicted_emotion] ?? 0) + 1;
    return a;
  }, {});
  return Object.entries(freq).sort(([, a], [, b]) => b - a)[0][0];
};

const avgStressLabel = (score: number) => {
  if (score < 35) return { text: 'Low Average',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (score < 65) return { text: 'Moderate Average', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return             { text: 'High Average',         cls: 'bg-rose-50 text-rose-700 border-rose-200' };
};

const formatAbsDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const formatChartDate = (d: string) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getRecommendations = (level: string) => {
  const lv = level.toLowerCase();
  if (lv.includes('high')) return [
    { icon: '🧘', text: 'Try 5 minutes of deep breathing', emphasis: true },
    { icon: '🚶', text: 'Take a short walk outdoors' },
    { icon: '💬', text: 'Talk to someone you trust' },
    { icon: '📵', text: 'Step away from screens for a bit' },
  ];
  if (lv.includes('moderate') || lv.includes('medium')) return [
    { icon: '☕', text: 'Take a mindful break', emphasis: true },
    { icon: '🎵', text: 'Listen to calming music' },
    { icon: '📝', text: 'Journal your thoughts' },
    { icon: '🌿', text: 'Practice gratitude' },
  ];
  return [
    { icon: '✨', text: 'Keep up your wellness routine', emphasis: true },
    { icon: '💪', text: 'Stay physically active' },
    { icon: '😊', text: 'Connect with loved ones' },
    { icon: '🎯', text: 'Set positive intentions' },
  ];
};

const getAIInsight = (results: StressResult[]) => {
  if (!results.length) return 'Start your first scan to generate AI insights.';
  const recent = results.slice(0, 5);
  const avg = recent.reduce((s, r) => s + r.stress_score, 0) / recent.length;
  const variance = recent.reduce((s, r) => s + Math.pow(r.stress_score - avg, 2), 0) / recent.length;
  const top = topEmotion(results);
  if (avg >= 65) return 'Frequent high stress patterns detected across recent sessions. Consider prioritising rest and recovery.';
  if (avg < 35) return 'Your stress levels have been consistently low recently — keep up your healthy routines.';
  if (variance < 50) return 'Stress appears stable over recent analyses with low variability — a positive sign.';
  if (top === 'sad' || top === 'fear') return `${top.charAt(0).toUpperCase() + top.slice(1)} emotion has appeared most frequently. Reaching out or journalling may help.`;
  if (results.length >= 2 && results[0].stress_score < results[1].stress_score)
    return 'Stress levels have improved compared to your previous reading. Great progress!';
  if (results.length >= 2 && results[0].stress_score > results[1].stress_score)
    return 'Recent readings show elevated stress relative to your previous session — take it easy.';
  return 'Your emotional state appears relatively stable across recent analyses.';
};

const getTrendInsight = (results: StressResult[]) => {
  if (results.length < 2) return 'Not enough data yet to determine a trend.';
  const recent = results.slice(0, Math.min(5, results.length));
  const first = recent[recent.length - 1].stress_score;
  const last  = recent[0].stress_score;
  if (last < first - 5) return 'Stress levels appear to be improving over recent sessions.';
  if (last > first + 5) return 'Recent analyses show elevated stress — try some breathing exercises.';
  return 'Stress variability has been low — levels appear stable.';
};

// ── animated fill bar ─────────────────────────────────────────────────────────

function StressMeter({ score }: { score: number }) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fillRef.current;
    if (!el) return;
    el.style.width = '0%';
    const id = setTimeout(() => {
      el.style.transition = 'width 1.1s cubic-bezier(0.4, 0, 0.2, 1)';
      el.style.width = `${score}%`;
    }, 120);
    return () => clearTimeout(id);
  }, [score]);

  const info = getStressInfo(score);
  const gradients: Record<string, string> = {
    emerald: 'from-emerald-400 to-teal-500',
    amber:   'from-amber-400 to-orange-500',
    rose:    'from-rose-400 to-red-500',
  };

  return (
    <div className="w-full">
      {/* Segmented track */}
      <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          ref={fillRef}
          className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${gradients[info.colorCls]} shadow-sm`}
          style={{ width: '0%' }}
        />
      </div>
      {/* Segment labels */}
      <div className="grid grid-cols-3 mt-2 px-0.5">
        <span className="text-[11px] text-slate-400 font-medium">Low</span>
        <span className="text-[11px] text-slate-400 font-medium text-center">Medium</span>
        <span className="text-[11px] text-slate-400 font-medium text-right">High</span>
      </div>
    </div>
  );
}

// ── recharts custom dot ───────────────────────────────────────────────────────

function StressDot(props: any) {
  const { cx, cy, payload } = props;
  const info = getStressInfo(payload.score);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={info.dot}
      stroke="#fff"
      strokeWidth={2}
      style={{ filter: `drop-shadow(0 0 4px ${info.dot}80)` }}
    />
  );
}

// ── recharts custom tooltip ───────────────────────────────────────────────────

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const info = getStressInfo(d.score);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl px-4 py-3 text-sm min-w-[140px]">
      <p className="text-xs text-slate-400 mb-1">{d.label}</p>
      <p className="font-bold text-slate-800 text-lg leading-none">
        {d.score.toFixed(0)}<span className="text-slate-400 font-normal text-sm"> / 100</span>
      </p>
      <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${info.badge}`}>
        {info.level} Stress
      </span>
    </div>
  );
}

// ── card wrapper ──────────────────────────────────────────────────────────────

function Card({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 animate-slideUp ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">{children}</p>;
}

// ── main component ────────────────────────────────────────────────────────────

export function DashboardView({ results, profile }: DashboardViewProps) {
  const latestResult   = results[0] ?? null;
  const averageStress  = results.length ? results.reduce((s, r) => s + r.stress_score, 0) / results.length : 0;
  const stressInfo     = latestResult ? getStressInfo(latestResult.stress_score) : null;
  const avgLabel       = avgStressLabel(averageStress);
  const dominantEmotion = topEmotion(results);
  const eMeta          = emotionMeta(dominantEmotion);
  const aiInsight      = getAIInsight(results);
  const trendInsight   = getTrendInsight(results);

  const displayName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : profile?.email
    ? profile.email.split('@')[0]
    : 'there';

  const recentTrendDir = results.length >= 2
    ? results[0].stress_score - results[1].stress_score
    : 0;

  // Recharts data — chronological order (oldest → newest)
  const chartData = results
    .slice(0, 10)
    .reverse()
    .map((r) => ({
      label: formatChartDate(r.created_at),
      score: r.stress_score,
    }));

  if (!latestResult) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center max-w-md animate-slideDown">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-50 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow">
            <Activity className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Start Your Wellness Journey</h3>
          <p className="text-slate-500 leading-relaxed text-sm">
            Analyze your stress levels to receive personalized AI insights and recommendations.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* ── Header ── */}
      <div className="animate-slideDown">
        <h2 className="text-[28px] font-bold text-slate-800 tracking-tight mb-1">
          Welcome back, {displayName}
        </h2>
        <p className="text-slate-400 flex items-center gap-2 text-sm">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          Last check: {formatAbsDate(latestResult.created_at)}
        </p>
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ════ LEFT: 2/3 width ════ */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Current Stress Level */}
          <Card delay={80} className="p-7">
            <div className="flex items-start justify-between mb-5">
              <div>
                <CardLabel>Current Stress Level</CardLabel>
                <p className={`text-sm font-semibold ${
                  stressInfo?.colorCls === 'emerald' ? 'text-emerald-600'
                  : stressInfo?.colorCls === 'amber' ? 'text-amber-600'
                  : 'text-rose-600'
                }`}>{stressInfo?.message}</p>
              </div>
              {recentTrendDir !== 0 && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  recentTrendDir < 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {recentTrendDir < 0
                    ? <TrendingDown className="w-3 h-3" />
                    : <TrendingUp className="w-3 h-3" />}
                  {Math.abs(recentTrendDir).toFixed(1)} pts
                </div>
              )}
            </div>

            <div className="flex items-center gap-8 mb-7">
              {/* Score block */}
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-[72px] font-extrabold leading-none bg-gradient-to-br from-teal-500 to-cyan-600 bg-clip-text text-transparent">
                    {latestResult.stress_score.toFixed(0)}
                  </span>
                  <span className="text-xl text-slate-300 font-light mb-1.5">/ 100</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${stressInfo?.badge}`}>
                    {stressInfo?.level} Stress
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${eMeta.bg} ${eMeta.color}`}>
                    <span className="text-sm">{eMeta.icon}</span>
                    <span className="capitalize">{latestResult.predicted_emotion}</span>
                  </span>
                </div>
              </div>

              {/* Stress meter */}
              <div className="flex-1">
                <StressMeter score={latestResult.stress_score} />
              </div>
            </div>
          </Card>

          {/* Stress Trend Chart */}
          {results.length > 1 && (
            <Card delay={160} className="p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <CardLabel>Stress Trend</CardLabel>
                  <h3 className="text-base font-bold text-slate-700">
                    Last {chartData.length} Readings
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-medium">
                  <Activity className="w-3.5 h-3.5" />
                  {results.length} total
                </div>
              </div>

              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={6}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    ticks={[0, 35, 65, 100]}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1.5 }} />
                  <ReferenceLine y={35} stroke="#10b981" strokeDasharray="4 3" strokeOpacity={0.5}
                    label={{ value: 'Low', position: 'insideTopRight', fontSize: 10, fill: '#10b981', fontWeight: 600 }} />
                  <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.5}
                    label={{ value: 'Medium', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b', fontWeight: 600 }} />
                  <Line
                    type="monotoneX"
                    dataKey="score"
                    stroke="url(#lineGrad)"
                    strokeWidth={2.5}
                    dot={<StressDot />}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-teal-500" />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed italic">{trendInsight}</p>
              </div>
            </Card>
          )}
        </div>

        {/* ════ RIGHT: 1/3 width ════ */}
        <div className="flex flex-col gap-5">

          {/* AI Recommendations */}
          <Card delay={240} className="p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardLabel>Personalised</CardLabel>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">AI Recommendations</h3>
              </div>
            </div>
            <div className="space-y-2">
              {getRecommendations(latestResult.stress_level).map((rec, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 ${
                    rec.emphasis
                      ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 shadow-sm'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <span className="text-lg leading-none flex-shrink-0 mt-0.5">{rec.icon}</span>
                  <p className={`text-sm leading-snug flex-1 ${rec.emphasis ? 'font-semibold text-teal-800' : 'text-slate-600'}`}>
                    {rec.text}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Insight */}
          <Card delay={320} className="p-6 bg-gradient-to-br from-teal-50 via-cyan-50 to-white border-teal-100">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shadow-sm flex-shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <CardLabel>Generated</CardLabel>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">AI Insight</h3>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{aiInsight}</p>
            <div className="mt-4 pt-3 border-t border-teal-100 flex items-center gap-1.5 text-[11px] text-teal-500 font-medium">
              <Sparkles className="w-3 h-3" />
              Based on {results.length} session{results.length !== 1 ? 's' : ''}
            </div>
          </Card>

          {/* Analytics cards */}
          <div className="flex flex-col gap-3 animate-slideUp" style={{ animationDelay: '400ms' }}>

            {/* Top Emotion */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-4">
              <CardLabel>Top Emotion</CardLabel>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl leading-none">{eMeta.icon}</span>
                <div>
                  <p className={`text-base font-bold capitalize leading-tight ${eMeta.color}`}>{dominantEmotion}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">most frequent</p>
                </div>
              </div>
            </div>

            {/* Average Stress */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-4">
              <CardLabel>Average Stress</CardLabel>
              <div className="flex items-end gap-1.5 mt-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-800 leading-none">{averageStress.toFixed(0)}</span>
                <span className="text-sm text-slate-400 mb-0.5">/ 100</span>
              </div>
              <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full border ${avgLabel.cls}`}>
                {avgLabel.text}
              </span>
            </div>

            {/* Total Analyses */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-4">
              <CardLabel>Total Analyses</CardLabel>
              <div className="flex items-end gap-1.5 mt-2 mb-1">
                <span className="text-3xl font-extrabold text-slate-800 leading-none">{results.length}</span>
                <span className="text-sm text-slate-400 mb-0.5">session{results.length !== 1 ? 's' : ''}</span>
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-semibold ${
                recentTrendDir < 0 ? 'text-emerald-600' : recentTrendDir > 0 ? 'text-rose-500' : 'text-slate-400'
              }`}>
                {recentTrendDir < 0
                  ? <><TrendingDown className="w-3 h-3" /> Improving</>
                  : recentTrendDir > 0
                  ? <><TrendingUp className="w-3 h-3" /> Elevated</>
                  : <><Minus className="w-3 h-3" /> Stable</>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
