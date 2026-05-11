import React, { useEffect, useRef } from 'react';
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
  Activity,
  Bell,
  Brain,
  Lightbulb,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { getEmotionCueConfig } from '../lib/emotionCueConfig';

interface DashboardViewProps {
  results: StressResult[];
  profile: any;
  onNavigateAnalyze: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const scoreColor = (score: number): string => {
  if (score < 20) return '#4ade80';
  if (score < 35) return '#2dd4bf';
  if (score < 55) return '#fbbf24';
  if (score < 75) return '#fb923c';
  return '#f87171';
};

const getStressInfo = (level: string) => {
  const l = level.toLowerCase();
  if (l === 'normal')   return { colorCls: 'green',  badge: 'bg-green-100 text-green-700 border-green-200',   message: "You're doing great!" };
  if (l === 'mild')     return { colorCls: 'teal',   badge: 'bg-teal-100 text-teal-700 border-teal-200',     message: 'Staying balanced' };
  if (l === 'moderate') return { colorCls: 'amber',  badge: 'bg-amber-100 text-amber-700 border-amber-200',  message: 'Stay mindful' };
  if (l === 'high')     return { colorCls: 'orange', badge: 'bg-orange-100 text-orange-700 border-orange-200', message: 'Take a breather' };
  return                       { colorCls: 'red',    badge: 'bg-red-100 text-red-700 border-red-200',         message: 'Take care of yourself' };
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
  if (score < 20) return { text: 'Normal Average',   cls: 'bg-green-50 text-green-700 border-green-200' };
  if (score < 35) return { text: 'Mild Average',     cls: 'bg-teal-50 text-teal-700 border-teal-200' };
  if (score < 55) return { text: 'Moderate Average', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (score < 75) return { text: 'High Average',     cls: 'bg-orange-50 text-orange-700 border-orange-200' };
  return                 { text: 'Severe Average',   cls: 'bg-red-50 text-red-700 border-red-200' };
};

const formatAbsDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

const getRecommendations = (level: string) => {
  const lv = level.toLowerCase();
  if (lv === 'severe') return [
    { icon: '🧘', text: 'Try 5 minutes of deep breathing', emphasis: true },
    { icon: '🚶', text: 'Take a short walk outdoors' },
    { icon: '💬', text: 'Talk to someone you trust' },
    { icon: '📵', text: 'Step away from screens for a bit' },
  ];
  if (lv === 'high') return [
    { icon: '🧘', text: 'Practice slow, deep breathing', emphasis: true },
    { icon: '💧', text: 'Drink water and take a short break' },
    { icon: '🎵', text: 'Listen to calming music' },
    { icon: '📵', text: 'Limit screen time for a while' },
  ];
  if (lv === 'moderate') return [
    { icon: '☕', text: 'Take a mindful break', emphasis: true },
    { icon: '🎵', text: 'Listen to calming music' },
    { icon: '📝', text: 'Journal your thoughts' },
    { icon: '🌿', text: 'Practice gratitude' },
  ];
  if (lv === 'mild') return [
    { icon: '🌱', text: 'Keep a gentle daily routine', emphasis: true },
    { icon: '😊', text: 'Connect with loved ones' },
    { icon: '🚶', text: 'Take a short walk' },
    { icon: '🎯', text: 'Set small, positive intentions' },
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
  if (results.length >= 2 && results[0].stress_score < results[1].stress_score)
    return 'Stress levels have improved compared to your previous reading. Great progress!';
  if (results.length >= 2 && results[0].stress_score > results[1].stress_score)
    return 'Recent readings show elevated stress relative to your previous session — take it easy.';
  if (variance < 50) return 'Stress appears stable over recent analyses with low variability — a positive sign.';

  if (top === 'fear')     return `${getEmotionCueConfig(top).label} emotion has appeared most frequently. Try some breathing exercises to ease the tension.`;
  if (top === 'angry')    return `${getEmotionCueConfig(top).label} emotion has appeared most frequently. Taking short breaks may help you reset.`;
  if (top === 'disgust')  return `${getEmotionCueConfig(top).label} emotion has appeared most frequently. Consider what situations are triggering this feeling.`;
  if (top === 'sad')      return `${getEmotionCueConfig(top).label} emotion has appeared most frequently. Reaching out or journalling may help.`;
  if (top === 'surprise') return `${getEmotionCueConfig(top).label} emotion has appeared most frequently. Try to identify what is causing unexpected reactions.`;
  if (top === 'happy')    return `${getEmotionCueConfig(top).label} emotion has been your most frequent state — keep nurturing what is working well for you.`;
  if (top === 'neutral')  return 'Your emotional state has been largely neutral — a sign of stability, though regular check-ins are still worthwhile.';

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

// ── chart helpers ─────────────────────────────────────────────────────────────

const fmtShortDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtFull = (dateString: string): string => {
  const d = new Date(dateString);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
};

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
      displayDate: fmtFull(r.created_at),
      score:       r.stress_score,
      emotion:     r.predicted_emotion,
      delta:       i === 0 ? null : r.stress_score - arr[i - 1].stress_score,
    };
  });
};

// ── chart sub-components ──────────────────────────────────────────────────────

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

// ── animated fill bar ─────────────────────────────────────────────────────────

function StressMeter({ score }: { score: number }) {
  const fillRef = useRef<HTMLDivElement>(null);
  const fillColor = scoreColor(score);

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

  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          ref={fillRef}
          className="absolute top-0 left-0 h-full rounded-full shadow-sm"
          style={{ width: '0%', backgroundColor: fillColor }}
        />
      </div>
      <div className="flex justify-between mt-2.5 px-0.5">
        {[
          { label: 'Normal',   dot: 'bg-green-400' },
          { label: 'Mild',     dot: 'bg-teal-400' },
          { label: 'Moderate', dot: 'bg-amber-400' },
          { label: 'High',     dot: 'bg-orange-400' },
          { label: 'Severe',   dot: 'bg-red-400' },
        ].map(({ label, dot }) => (
          <span key={label} className="inline-flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <span className="text-[10px] text-slate-400 font-medium">{label}</span>
          </span>
        ))}
      </div>
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

export function DashboardView({ results, profile, onNavigateAnalyze }: DashboardViewProps) {
  const latestResult    = results[0] ?? null;
  const averageStress   = results.length ? results.reduce((s, r) => s + r.stress_score, 0) / results.length : 0;
  const stressInfo      = latestResult ? getStressInfo(latestResult.stress_level) : null;
  const avgLabel        = avgStressLabel(averageStress);
  const dominantEmotion = topEmotion(results);
  const eMeta           = emotionMeta(dominantEmotion);
  const aiInsight       = getAIInsight(results);
  const trendInsight    = getTrendInsight(results);

  const displayName = profile?.full_name
    ? profile.full_name
    : profile?.email
    ? profile.email.split('@')[0]
    : 'there';

  const recentTrendDir = results.length >= 2
    ? results[0].stress_score - results[1].stress_score
    : 0;

  const chartData = buildChartData([...results].slice(0, 10).reverse());

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
        <h2 className="text-[28px] font-bold tracking-tight leading-tight">
          <span className="text-slate-800">Welcome back, </span>
          <span className="bg-gradient-to-r from-cyan-500 to-teal-500 bg-clip-text text-transparent">{displayName}</span>
        </h2>
      </div>

      {/* ── Main 3-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ════ LEFT: 2/3 width ════ */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Daily Check-in Reminder */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-3xl p-6 animate-slideUp" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-800">Daily Check-in</h3>
                    {(() => {
                      const hoursAgo = (Date.now() - new Date(latestResult.created_at).getTime()) / 36e5;
                      return hoursAgo <= 24
                        ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200">Done today</span>
                        : <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Due today</span>;
                    })()}
                  </div>
                  <p className="text-sm text-slate-700"><span className="font-semibold">Last scan:</span> {formatAbsDate(latestResult.created_at)}</p>
                </div>
              </div>
              <button
                onClick={onNavigateAnalyze}
                className="flex-shrink-0 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:shadow-lg hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 whitespace-nowrap"
              >
                Scan Now →
              </button>
            </div>
          </div>

          {/* Current Stress Level */}
          <Card delay={80} className="p-7">
            <div className="flex items-start justify-between mb-5">
              <div>
                <CardLabel>Current Stress Level</CardLabel>
                <p className={`text-sm font-semibold ${
                  stressInfo?.colorCls === 'green'  ? 'text-green-600'
                  : stressInfo?.colorCls === 'teal'   ? 'text-teal-600'
                  : stressInfo?.colorCls === 'amber'  ? 'text-amber-600'
                  : stressInfo?.colorCls === 'orange' ? 'text-orange-600'
                  : 'text-red-600'
                }`}>{stressInfo?.message}</p>
              </div>
            </div>

            <div className="flex items-center gap-8 mb-7">
              <div className="flex-shrink-0">
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="text-[72px] font-extrabold leading-none bg-gradient-to-br from-teal-500 to-cyan-600 bg-clip-text text-transparent">
                    {latestResult.stress_score.toFixed(0)}
                  </span>
                  <span className="text-xl text-slate-300 font-light mb-1.5">/ 100</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border ${stressInfo?.badge}`}>
                    {latestResult.stress_level} Stress
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <StressMeter score={latestResult.stress_score} />
              </div>
            </div>
          </Card>

          {/* Stress Trend Chart */}
          {results.length > 1 && (
            <Card delay={160} className="p-7">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardLabel>Stress Trend</CardLabel>
                  <h3 className="text-base font-bold text-slate-700">
                    Last {chartData.length} Readings
                  </h3>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={210}>
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
                    ticks={[0, 25, 50, 75, 100]}
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
                <CardLabel>Wellness Tips</CardLabel>
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
                  <p className={`text-base font-bold capitalize leading-tight ${eMeta.color}`}>
                    {getEmotionCueConfig(dominantEmotion).label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">most frequent</p>
                </div>
              </div>
            </div>

            {/* Average Stress */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 p-4">
              <CardLabel>Stress Average</CardLabel>
              <div className="flex items-end gap-1.5 mt-2 mb-2">
                <span className="text-3xl font-extrabold text-slate-800 leading-none">{averageStress.toFixed(0)}</span>
                <span className="text-sm text-slate-400 mb-0.5">/ 100</span>
              </div>
              <span className={`inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-full border ${avgLabel.cls}`}>
                {avgLabel.text}
              </span>
            </div>
              </div>
            </div>
          </div>
        </div>
  );
}
