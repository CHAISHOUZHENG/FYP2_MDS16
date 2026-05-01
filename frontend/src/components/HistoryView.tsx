import { StressResult } from '../lib/supabase';
import { BarChart3, Calendar } from 'lucide-react';

interface HistoryViewProps {
  results: StressResult[];
}

export function HistoryView({ results }: HistoryViewProps) {
  const getStressColor = (level: string) => {
    const lowerLevel = level.toLowerCase();
    if (lowerLevel.includes('low')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (lowerLevel.includes('medium') || lowerLevel.includes('moderate')) return 'text-amber-600 bg-amber-50 border-amber-200';
    if (lowerLevel.includes('high')) return 'text-rose-600 bg-rose-50 border-rose-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Analysis History</h2>
          <p className="text-slate-600">View all your past stress analyses and trends</p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 border border-slate-200 text-center">
          <BarChart3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">No History Yet</h3>
          <p className="text-slate-600">Your analysis history will appear here once you start analyzing</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                All Analyses ({results.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date & Time</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Emotion</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Stress Score</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Stress Level</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-4 text-sm text-slate-600">{formatDate(result.created_at)}</td>
                      <td className="py-4 px-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                          {result.predicted_emotion}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-slate-800">
                        {result.stress_score.toFixed(1)}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${getStressColor(result.stress_level)}`}>
                          {result.stress_level}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600">
                        {((result.probabilities[result.predicted_emotion] || 0) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.slice(0, 6).map((result) => (
              <div key={result.id} className="bg-white rounded-xl shadow-sm p-5 border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">{formatDateShort(result.created_at)}</span>
                  <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-semibold border ${getStressColor(result.stress_level)}`}>
                    {result.stress_level}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="text-3xl font-bold text-slate-800 mb-1">
                    {result.stress_score.toFixed(1)}
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full"
                      style={{ width: `${result.stress_score}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 capitalize">
                    <span className="font-medium">Emotion:</span> {result.predicted_emotion}
                  </span>
                  <span className="text-xs text-slate-500">
                    {((result.probabilities[result.predicted_emotion] || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
