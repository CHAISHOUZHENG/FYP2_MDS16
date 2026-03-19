import React from 'react';
import { StressResult } from '../lib/supabase';
import {
  TrendingUp,
  Activity,
  Heart,
  Smile,
  Lightbulb,
  Calendar,
  Sparkles,
  TrendingDown
} from 'lucide-react';

interface DashboardViewProps {
  results: StressResult[];
  profile: any;
}

export function DashboardView({ results, profile }: DashboardViewProps) {
  const latestResult = results.length > 0 ? results[0] : null;

  const averageStress = results.length > 0
    ? (results.reduce((sum, r) => sum + r.stress_score, 0) / results.length)
    : 0;

  const getStressLevel = (score: number) => {
    if (score < 30) return { level: 'Low', color: 'emerald', message: 'You\'re doing great!' };
    if (score < 60) return { level: 'Moderate', color: 'amber', message: 'Stay mindful' };
    return { level: 'High', color: 'rose', message: 'Take care of yourself' };
  };

  const stressInfo = latestResult ? getStressLevel(latestResult.stress_score) : null;

  const getEmotionEmoji = (emotion: string) => {
    const lower = emotion.toLowerCase();
    if (lower.includes('happy') || lower.includes('joy')) return '😊';
    if (lower.includes('sad')) return '😢';
    if (lower.includes('angry') || lower.includes('anger')) return '😠';
    if (lower.includes('fear')) return '😰';
    if (lower.includes('surprise')) return '😮';
    if (lower.includes('neutral')) return '😐';
    return '🙂';
  };

  const getEmotionColor = (emotion: string) => {
    const lower = emotion.toLowerCase();
    if (lower.includes('happy') || lower.includes('joy')) return 'from-emerald-400 to-green-500';
    if (lower.includes('sad')) return 'from-blue-400 to-indigo-500';
    if (lower.includes('angry') || lower.includes('anger')) return 'from-rose-400 to-red-500';
    if (lower.includes('fear')) return 'from-violet-400 to-purple-500';
    if (lower.includes('surprise')) return 'from-amber-400 to-orange-500';
    if (lower.includes('neutral')) return 'from-slate-400 to-gray-500';
    return 'from-cyan-400 to-teal-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRecommendations = (stressLevel: string) => {
    const level = stressLevel.toLowerCase();

    if (level.includes('high')) {
      return [
        { icon: '🧘', text: 'Try 5 minutes of deep breathing', emphasis: true },
        { icon: '🚶', text: 'Take a short walk outdoors' },
        { icon: '💬', text: 'Talk to someone you trust' },
        { icon: '📵', text: 'Step away from screens for a bit' }
      ];
    } else if (level.includes('moderate')) {
      return [
        { icon: '☕', text: 'Take a mindful break', emphasis: true },
        { icon: '🎵', text: 'Listen to calming music' },
        { icon: '📝', text: 'Journal your thoughts' },
        { icon: '🌿', text: 'Practice gratitude' }
      ];
    } else {
      return [
        { icon: '✨', text: 'Keep up your wellness routine', emphasis: true },
        { icon: '💪', text: 'Stay physically active' },
        { icon: '😊', text: 'Connect with loved ones' },
        { icon: '🎯', text: 'Set positive intentions' }
      ];
    }
  };

  const recentTrend = results.length >= 2
    ? results[0].stress_score - results[1].stress_score
    : 0;

  if (!latestResult) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-cyan-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-3">Start Your Wellness Journey</h3>
          <p className="text-slate-600 leading-relaxed">
            Analyze your stress levels to receive personalized insights and recommendations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="animate-slideDown">
        <h2 className="text-3xl font-bold text-slate-800 mb-1">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h2>
        <p className="text-slate-500 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Last check: {formatDate(latestResult.created_at)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100 animate-slideUp" style={{ animationDelay: '100ms' }}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-700 mb-1">Current Stress Level</h3>
                <p className={`text-sm text-${stressInfo?.color}-600 font-medium`}>{stressInfo?.message}</p>
              </div>
              {recentTrend !== 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${recentTrend < 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {recentTrend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  <span className="text-xs font-semibold">{Math.abs(recentTrend).toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="flex items-end gap-8 mb-6">
              <div>
                <div className="text-7xl font-bold bg-gradient-to-br from-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
                  {latestResult.stress_score.toFixed(0)}
                </div>
                <div className={`inline-flex px-4 py-2 rounded-xl font-semibold text-sm bg-${stressInfo?.color}-100 text-${stressInfo?.color}-700 border border-${stressInfo?.color}-200`}>
                  {stressInfo?.level} Stress
                </div>
              </div>

              <div className="flex-1 pb-4">
                <div className="relative">
                  <div className="w-full h-3 bg-gradient-to-r from-emerald-100 via-amber-100 to-rose-100 rounded-full" />
                  <div
                    className="absolute top-0 h-3 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-700"
                    style={{ width: `${latestResult.stress_score}%` }}
                  />
                  <div
                    className="absolute -top-1 w-5 h-5 bg-white border-2 border-cyan-600 rounded-full shadow-lg transition-all duration-700"
                    style={{ left: `calc(${latestResult.stress_score}% - 10px)` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
                  <span>Calm</span>
                  <span>Elevated</span>
                  <span>High</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-700">Emotion Analysis</h4>
                <span className="text-2xl">{getEmotionEmoji(latestResult.predicted_emotion)}</span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(latestResult.probabilities)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 4)
                  .map(([emotion, value]) => {
                    const percentage = (value as number) * 100;
                    return (
                      <div key={emotion}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="font-medium text-slate-700 capitalize">{emotion}</span>
                          <span className="text-slate-500 font-semibold">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getEmotionColor(emotion)} rounded-full transition-all duration-700`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {results.length > 1 && (
            <div className="bg-white rounded-3xl shadow-lg p-8 border border-slate-100 animate-slideUp" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-700">7-Day Trend</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Activity className="w-4 h-4" />
                  <span>{results.slice(0, 7).length} readings</span>
                </div>
              </div>
              <div className="flex items-end justify-between h-40 gap-1.5">
                {results.slice(0, 7).reverse().map((result, index) => {
                  const height = (result.stress_score / 100) * 100;
                  const info = getStressLevel(result.stress_score);
                  return (
                    <div key={result.id} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full">
                        <div
                          className={`w-full bg-gradient-to-t from-${info.color}-400 to-${info.color}-500 rounded-t-lg transition-all hover:opacity-80 cursor-pointer`}
                          style={{ height: `${height}px`, minHeight: '12px' }}
                        >
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                            <div className="font-bold">{result.stress_score.toFixed(0)}</div>
                            <div className="text-slate-300 text-xs">{info.level}</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 text-center">
                        {formatDate(result.created_at)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl shadow-lg p-6 border border-teal-100 animate-slideUp" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg font-semibold text-slate-800">For You</h3>
            </div>
            <div className="space-y-3">
              {getRecommendations(latestResult.stress_level).map((rec, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3.5 rounded-xl transition-all ${
                    rec.emphasis
                      ? 'bg-white shadow-md border border-teal-200'
                      : 'bg-white/60 hover:bg-white border border-transparent hover:border-teal-100'
                  }`}
                >
                  <span className="text-2xl">{rec.icon}</span>
                  <p className={`text-sm leading-relaxed flex-1 ${rec.emphasis ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                    {rec.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 animate-slideUp" style={{ animationDelay: '400ms' }}>
            <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <p className="text-xs font-medium text-slate-600">Sessions</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">{results.length}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-5 border border-slate-100 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-rose-500" />
                <p className="text-xs font-medium text-slate-600">Well-being</p>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {(100 - averageStress).toFixed(0)}
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-3xl shadow-lg p-6 text-white animate-slideUp" style={{ animationDelay: '500ms' }}>
            <Sparkles className="w-8 h-8 mb-3 opacity-90" />
            <h4 className="font-bold text-lg mb-2">Keep Growing</h4>
            <p className="text-sm text-cyan-50 leading-relaxed mb-4">
              Regular check-ins help you understand your patterns and build resilience.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-100">
              <TrendingUp className="w-4 h-4" />
              <span>Average: {averageStress.toFixed(0)} stress level</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
