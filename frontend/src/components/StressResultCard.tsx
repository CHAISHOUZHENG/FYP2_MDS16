import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Save, Wind, Coffee, Droplets, Moon, Music, Smile } from 'lucide-react';
import { getEmotionCueConfig } from '../lib/emotionCueConfig';

interface PredictionResult {
  predicted_emotion: string;
  stress_score: number;
  stress_level: string;
  top_2_predictions: Array<{ emotion: string; probability: string }>;
  probabilities: Record<string, number>;
  sugagestion: {
    title: string;
    advice: string[];
  };
}

interface StressResultCardProps {
  result: PredictionResult;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
}

interface StressTheme {
  gradient: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
  ringColor: string;
  emoji: string;
  label: string;
  humanMessage: string;
  supportMessage: string;
}

const getTheme = (level: string): StressTheme => {
  const lower = level.toLowerCase();
  if (lower.includes('high')) {
    return {
      gradient: 'from-rose-400 via-red-400 to-orange-400',
      cardBg: 'bg-gradient-to-br from-rose-50 to-orange-50',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-700',
      borderColor: 'border-rose-200',
      accentColor: 'text-rose-600',
      ringColor: 'ring-rose-200',
      emoji: 'face-with-diagonal-mouth',
      label: 'High',
      humanMessage: "You seem a bit tense right now. Let's slow things down together.",
      supportMessage: "Hey, it's okay to feel this way sometimes.\nTake a moment for yourself — you don't have to rush.",
    };
  }
  if (lower.includes('moderate') || lower.includes('medium')) {
    return {
      gradient: 'from-amber-400 via-orange-400 to-yellow-400',
      cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-700',
      borderColor: 'border-amber-200',
      accentColor: 'text-amber-600',
      ringColor: 'ring-amber-200',
      emoji: 'neutral',
      label: 'Moderate',
      humanMessage: "You're carrying a bit on your plate. That's normal.",
      supportMessage: "You're doing your best and that's enough.\nA small pause can help restore your balance.",
    };
  }
  return {
    gradient: 'from-teal-400 via-cyan-400 to-sky-400',
    cardBg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
    accentColor: 'text-teal-600',
    ringColor: 'ring-teal-200',
    emoji: 'relieved',
    label: 'Low',
    humanMessage: "You're in a calm, centered space. Keep it up.",
    supportMessage: "You're doing wonderfully.\nKeep nurturing this sense of peace — you deserve it.",
  };
};

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const getSuggestions = (level: string, adviceFromApi: string[]): Suggestion[] => {
  const lower = level.toLowerCase();

  if (lower.includes('high')) {
    return [
      {
        icon: <Wind className="w-5 h-5" />,
        title: 'Take a deep breath',
        description: 'Inhale slowly for 4 seconds, hold for 2, then exhale for 6. Repeat three times.',
      },
      {
        icon: <RefreshCw className="w-5 h-5" />,
        title: 'Take a short break',
        description: 'Step away from what you\'re doing for a few minutes and let your mind reset.',
      },
      {
        icon: <Droplets className="w-5 h-5" />,
        title: 'Refresh yourself',
        description: 'Splash cool water on your face or drink a glass of water. It helps more than you think.',
      },
      {
        icon: <Moon className="w-5 h-5" />,
        title: 'Slow down',
        description: 'You don\'t need to solve everything right now. One thing at a time.',
      },
    ];
  }

  if (lower.includes('moderate') || lower.includes('medium')) {
    return [
      {
        icon: <Coffee className="w-5 h-5" />,
        title: 'Take a mindful break',
        description: 'Step away from screens for 10 minutes. Make some tea and just breathe.',
      },
      {
        icon: <Music className="w-5 h-5" />,
        title: 'Listen to something calming',
        description: 'Put on gentle music or nature sounds. Let it quiet the noise in your head.',
      },
      {
        icon: <Wind className="w-5 h-5" />,
        title: 'Breathe with intention',
        description: 'Try box breathing — 4 seconds in, hold 4, out 4, hold 4. Repeat a few times.',
      },
      {
        icon: <Droplets className="w-5 h-5" />,
        title: 'Stay hydrated',
        description: 'Drink some water. Sometimes our body signals stress when it just needs hydration.',
      },
    ];
  }

  return [
    {
      icon: <Smile className="w-5 h-5" />,
      title: 'Keep this feeling going',
      description: 'You\'re in a great headspace. Note what helped you get here today.',
    },
    {
      icon: <Wind className="w-5 h-5" />,
      title: 'Breathe with gratitude',
      description: 'Take three deep breaths and silently name one thing you\'re grateful for.',
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: 'Stay active',
      description: 'Even a short walk or stretch can maintain this positive state through your day.',
    },
    {
      icon: <Moon className="w-5 h-5" />,
      title: 'Protect your energy',
      description: 'Set gentle boundaries today. Your calm mind is worth protecting.',
    },
  ];
};

const ScoreRing = ({ score, theme }: { score: number; theme: StressTheme }) => {
  const [animated, setAnimated] = useState(false);
  const radius = 70;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * normalizedRadius;
  const progress = animated ? (score / 100) * circumference : 0;

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#e2e8f0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#ringGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="50%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold text-slate-800">{score.toFixed(0)}</span>
      </div>
    </div>
  );
};

export function StressResultCard({ result, isSaving, onSave, onReset }: StressResultCardProps) {
  const theme = getTheme(result.stress_level);
  const suggestions = getSuggestions(result.stress_level, result.suggestion?.advice ?? []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stressLevelEmoji = theme.label === 'High' ? '😟' : theme.label === 'Moderate' ? '😐' : '😌';

  return (
    <div
      className={`max-w-2xl mx-auto transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <div className="text-center mb-8">
        <div
          className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-lg mb-4 transition-all duration-500 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          style={{ transitionDelay: '200ms' }}
        >
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1
          className={`text-3xl font-bold text-slate-800 mb-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '300ms' }}
        >
          Analysis Complete
        </h1>
        <p
          className={`text-slate-500 text-base transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '400ms' }}
        >
          Here's your current stress level
        </p>
      </div>

      <div
        className={`relative rounded-3xl overflow-hidden shadow-2xl mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        style={{ transitionDelay: '500ms' }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-10`} />
        <div className={`absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-3xl`} />
        <div className={`absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br ${theme.gradient} opacity-10 blur-3xl`} />

        <div className={`relative ${theme.cardBg} border ${theme.borderColor} rounded-3xl p-8`}>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">
            Your Stress Score
          </p>

          <div className="flex flex-col items-center mb-6">
            <div
              className="animate-float"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <ScoreRing score={result.stress_score} theme={theme} />
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <span className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-semibold ${theme.badgeBg} ${theme.badgeText} ring-2 ${theme.ringColor}`}>
              <span className="text-xl">{stressLevelEmoji}</span>
              {theme.label} Stress
            </span>
          </div>

          <p className={`text-center text-base font-medium ${theme.accentColor} leading-relaxed`}>
            {theme.humanMessage}
          </p>
        </div>
      </div>

      {(() => {
        const cue = getEmotionCueConfig(result.predicted_emotion);
        return (
          <div
            className={`${cue.bgClass} border ${cue.borderClass} rounded-2xl px-6 py-5 mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            style={{ transitionDelay: '600ms' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              Emotional Snapshot
            </p>
            <div className="flex items-center gap-4">
              <div className="text-3xl leading-none select-none">{cue.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm font-bold ${cue.labelClass}`}>{cue.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cue.dotClass}`} />
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">{cue.description}</p>
              </div>
            </div>
          </div>
        );
      })()}

      <div
        className={`bg-slate-800 rounded-3xl p-7 mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        style={{ transitionDelay: '650ms' }}
      >
        <div className="flex items-start gap-4">
          <div className="text-2xl flex-shrink-0 mt-0.5">
            {theme.label === 'High' ? '💛' : theme.label === 'Moderate' ? '🌤️' : '✨'}
          </div>
          <div>
            {theme.supportMessage.split('\n').map((line, i) => (
              <p key={i} className={`text-sm leading-relaxed ${i === 0 ? 'text-slate-100 font-medium mb-2' : 'text-slate-400'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`mb-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        style={{ transitionDelay: '750ms' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">✨</span>
          <h2 className="text-lg font-bold text-slate-800">Suggestions to Help You Feel Better</h2>
        </div>

        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ transitionDelay: `${800 + i * 80}ms` }}
            >
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${theme.gradient} text-white shadow-sm`}>
                  {s.icon}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-0.5">{s.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`flex gap-3 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        style={{ transitionDelay: '1100ms' }}
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>

        <button
          onClick={onSave}
          disabled={isSaving}
          className={`flex-1 flex items-center justify-center gap-2.5 py-4 rounded-2xl font-semibold text-base bg-gradient-to-r ${theme.gradient} text-white hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-lg`}
        >
          {isSaving ? (
            <>
              <Activity className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Result
            </>
          )}
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
        Your results are saved privately and securely.
      </p>
    </div>
  );
}
