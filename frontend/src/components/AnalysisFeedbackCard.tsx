import React, { useEffect, useState } from 'react';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface AnalysisFeedbackCardProps {
  emoji: string;
  title: string;
  message: string;
  tip: string;
  onRetry: () => void;
  onBack?: () => void;
}

export function AnalysisFeedbackCard({
  emoji,
  title,
  message,
  tip,
  onRetry,
  onBack,
}: AnalysisFeedbackCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`max-w-md mx-auto transition-all duration-600 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
    >
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 px-8 pt-10 pb-6 text-center border-b border-slate-100">
          <div
            className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-md text-4xl mb-5 transition-all duration-500 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
            style={{ transitionDelay: '150ms' }}
          >
            {emoji}
          </div>

          <h2
            className={`text-xl font-bold text-slate-800 mb-2 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: '250ms' }}
          >
            {title}
          </h2>

          <p
            className={`text-slate-500 text-sm leading-relaxed transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: '330ms' }}
          >
            {message}
          </p>
        </div>

        <div
          className={`px-8 py-5 border-b border-slate-100 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: '420ms' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-cyan-600 text-xs font-bold">!</span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{tip}</p>
          </div>
        </div>

        <div
          className={`px-8 py-6 space-y-3 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
          style={{ transitionDelay: '500ms' }}
        >
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:shadow-lg hover:shadow-cyan-100 hover:scale-[1.02] active:scale-[0.99] transition-all duration-250"
          >
            <RefreshCw className="w-4 h-4" />
            Try Another Photo
          </button>

          {onBack && (
            <button
              onClick={onBack}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-medium text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
        Your privacy is protected. Photos are never stored.
      </p>
    </div>
  );
}
