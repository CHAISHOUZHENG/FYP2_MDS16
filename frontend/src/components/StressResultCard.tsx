import React, { useEffect, useState } from 'react';
import {
  Activity,
  Camera,
  RefreshCw,
  Save,
  Wind,
  Droplets,
  Moon,
  Smile,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  HeartPulse,
  Info,
  Brain,
  AlertTriangle,
  BookOpen,
  Stethoscope,
} from 'lucide-react';
import { getEmotionCueConfig } from '../lib/emotionCueConfig';

interface CategoryItem {
  category: string;
  icon: string;
  tip: string;
}

interface PredictionResult {
  predicted_emotion: string;
  stress_score: number;
  stress_level: string;
  top_2_predictions: Array<{ emotion: string; probability: string }>;
  probabilities: Record<string, number>;
  suggestion: {
    title: string;
    advice: string[];
    summary?: string;
    urgency_note?: string | null;
    categories?: CategoryItem[];
    when_to_seek_help?: string;
  };
}

interface StressResultCardProps {
  result: PredictionResult;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  imageUrl?: string | null;
}

interface StressTheme {
  gradient: string;
  cardBg: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  accentColor: string;
  ringColor: string;
  label: string;
  humanMessage: string;
  supportMessage: string;
  iconBg: string;
}

const getTheme = (level: string): StressTheme => {
  const lower = level.toLowerCase();
  if (lower === 'severe') {
    return {
      gradient: 'from-red-500 via-rose-500 to-red-400',
      cardBg: 'bg-gradient-to-br from-red-50 to-rose-50',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-700',
      borderColor: 'border-red-200',
      accentColor: 'text-red-600',
      ringColor: 'ring-red-200',
      iconBg: 'from-red-500 to-rose-400',
      label: 'Severe',
      humanMessage: "Your stress is quite high right now. Please be gentle with yourself.",
      supportMessage: "It's okay to ask for help.\nTake things one small step at a time — you don't have to do this alone.",
    };
  }
  if (lower === 'high') {
    return {
      gradient: 'from-orange-400 via-red-400 to-orange-500',
      cardBg: 'bg-gradient-to-br from-orange-50 to-red-50',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-700',
      borderColor: 'border-orange-200',
      accentColor: 'text-orange-600',
      ringColor: 'ring-orange-200',
      iconBg: 'from-orange-400 to-red-400',
      label: 'High',
      humanMessage: "You seem a bit tense right now. Let's slow things down together.",
      supportMessage: "Hey, it's okay to feel this way sometimes.\nTake a moment for yourself — you don't have to rush.",
    };
  }
  if (lower === 'moderate') {
    return {
      gradient: 'from-amber-400 via-orange-400 to-yellow-400',
      cardBg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-700',
      borderColor: 'border-amber-200',
      accentColor: 'text-amber-600',
      ringColor: 'ring-amber-200',
      iconBg: 'from-amber-400 to-yellow-400',
      label: 'Moderate',
      humanMessage: "You're carrying a bit on your plate. That's normal.",
      supportMessage: "You're doing your best and that's enough.\nA small pause can help restore your balance.",
    };
  }
  if (lower === 'mild') {
    return {
      gradient: 'from-teal-400 via-cyan-400 to-sky-400',
      cardBg: 'bg-gradient-to-br from-teal-50 to-cyan-50',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-700',
      borderColor: 'border-teal-200',
      accentColor: 'text-teal-600',
      ringColor: 'ring-teal-200',
      iconBg: 'from-teal-400 to-sky-400',
      label: 'Mild',
      humanMessage: "A little tension is normal. You're managing well.",
      supportMessage: "Small self-care habits go a long way.\nYou're doing a great job keeping things in check.",
    };
  }
  /* normal */
  return {
    gradient: 'from-green-400 via-teal-400 to-emerald-400',
    cardBg: 'bg-gradient-to-br from-green-50 to-teal-50',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
    borderColor: 'border-green-200',
    accentColor: 'text-green-600',
    ringColor: 'ring-green-200',
    iconBg: 'from-green-400 to-teal-400',
    label: 'Normal',
    humanMessage: "You're in a calm, centered space. Keep it up.",
    supportMessage: "You're doing wonderfully.\nKeep nurturing this sense of peace — you deserve it.",
  };
};

const FALLBACK_ADVICE: Record<string, string[]> = {
  severe: [
    "Please reach out to someone you trust. You don't have to carry this alone.",
    "Inhale slowly for 4 counts, hold for 2, then exhale for 6. Repeat three times to activate your body's calming response.",
    'Step away from your current task entirely. Even a brief reset helps your nervous system recover.',
    "Remind yourself: you don't need to solve everything right now. Just focus on the next small step.",
  ],
  high: [
    "Inhale slowly for 4 counts, hold for 2, then exhale for 6. Repeat three times to activate your body's calming response.",
    'Step away from your current task for 5–10 minutes. Even a brief reset helps your nervous system recover.',
    'Splash cool water on your face or drink a glass of water. Physical grounding can ease mental tension.',
    "Remind yourself: you don't need to solve everything right now. Focus on just one thing at a time.",
  ],
  moderate: [
    'Step away from screens for 10 minutes. Make some herbal tea and allow your mind to settle.',
    'Put on gentle music or nature sounds. Soft audio environments reduce cortisol and promote calm.',
    'Try box breathing — 4 counts in, hold 4, out 4, hold 4. Repeat 4 cycles for a measurable calming effect.',
    'Drink a full glass of water. Mild dehydration is a known contributor to elevated stress perception.',
  ],
  mild: [
    "You're keeping stress in check. Maintain a short daily wind-down ritual to stay balanced.",
    'Take three slow, grateful breaths and name one thing that\'s going well in your life today.',
    'A short walk or light stretch can anchor your calm and carry it through the rest of the day.',
    'Set a gentle boundary today. Saying no to one non-essential task preserves your balance.',
  ],
  normal: [
    "You're in a positive state right now. Take a moment to note what contributed to this — and protect it.",
    'Take three slow, grateful breaths and name one thing that\'s going well in your life today.',
    'A short walk or light stretch can anchor this calm feeling and carry it through the rest of your day.',
    'Set a gentle boundary today. Saying no to one non-essential task preserves the balance you\'ve achieved.',
  ],
};

const STEP_ICONS = [
  <Sparkles className="w-5 h-5" />,
  <HeartPulse className="w-5 h-5" />,
  <Wind className="w-5 h-5" />,
  <Droplets className="w-5 h-5" />,
  <ShieldCheck className="w-5 h-5" />,
  <ClipboardCheck className="w-5 h-5" />,
  <Moon className="w-5 h-5" />,
  <Smile className="w-5 h-5" />,
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  wind: <Wind className="w-5 h-5" />,
  heart: <HeartPulse className="w-5 h-5" />,
  brain: <Brain className="w-5 h-5" />,
  moon: <Moon className="w-5 h-5" />,
  droplets: <Droplets className="w-5 h-5" />,
  shield: <ShieldCheck className="w-5 h-5" />,
  smile: <Smile className="w-5 h-5" />,
  activity: <Activity className="w-5 h-5" />,
};

// Soft palette per category position so cards feel distinct without being loud
const CARD_ACCENTS = [
  { bg: 'bg-sky-50', border: 'border-sky-100', label: 'text-sky-600', dot: 'bg-sky-400' },
  { bg: 'bg-teal-50', border: 'border-teal-100', label: 'text-teal-600', dot: 'bg-teal-400' },
  { bg: 'bg-violet-50', border: 'border-violet-100', label: 'text-violet-600', dot: 'bg-violet-400' },
  { bg: 'bg-amber-50', border: 'border-amber-100', label: 'text-amber-600', dot: 'bg-amber-400' },
  { bg: 'bg-rose-50', border: 'border-rose-100', label: 'text-rose-600', dot: 'bg-rose-400' },
  { bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'text-emerald-600', dot: 'bg-emerald-400' },
];

const ScoreRing = ({ score, theme }: { score: number; theme: StressTheme }) => {
  const [animated, setAnimated] = useState(false);
  const radius = 72;
  const stroke = 9;
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
        <circle stroke="#e2e8f0" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-4xl font-bold text-slate-800 leading-none">{score.toFixed(0)}</span>
        <span className="text-xs text-slate-400 font-medium tracking-wide">/ 100</span>
      </div>
    </div>
  );
};

export function StressResultCard({ result, isSaving, onSave, onReset, imageUrl }: StressResultCardProps) {
  const theme = getTheme(result.stress_level);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const geminiAdvice = result.suggestion?.advice;
  const hasGeminiAdvice = Array.isArray(geminiAdvice) && geminiAdvice.length > 0;
  const adviceItems = hasGeminiAdvice
    ? geminiAdvice
    : FALLBACK_ADVICE[theme.label.toLowerCase()] ?? FALLBACK_ADVICE.moderate;

  const categories = result.suggestion?.categories ?? [];
  const hasCategories = categories.length > 0;
  const summary = result.suggestion?.summary;
  const urgencyNote = result.suggestion?.urgency_note;
  const whenToSeekHelp = result.suggestion?.when_to_seek_help;

  const stressLevelEmoji =
    theme.label === 'Severe'   ? '😰' :
    theme.label === 'High'     ? '😟' :
    theme.label === 'Moderate' ? '😐' :
    theme.label === 'Mild'     ? '🙂' : '😌';
  const cue = getEmotionCueConfig(result.predicted_emotion);

  const fadeClass = (delay: number) =>
    `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`;

  return (
    <div className={`max-w-3xl mx-auto transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

      {/* ── Header ── */}
      <div className="text-center mb-8">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-xl mb-5 transition-all duration-500 ${visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
          style={{ transitionDelay: '200ms' }}
        >
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className={`text-3xl font-bold text-slate-800 mb-1.5 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '300ms' }}>
          Analysis Complete
        </h1>
        <p className={`text-slate-500 text-base transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '400ms' }}>
          Here is your personalised wellbeing snapshot
        </p>
      </div>

      {/* ── Hero: Photo + Score side-by-side (or stacked on mobile) ── */}
      <div className={`relative rounded-3xl overflow-hidden shadow-2xl mb-5 border ${theme.borderColor} transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '450ms' }}>
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-10`} />
        <div className={`absolute -top-28 -right-28 w-80 h-80 rounded-full bg-gradient-to-br ${theme.gradient} opacity-[0.08] blur-3xl`} />
        <div className={`absolute -bottom-28 -left-28 w-80 h-80 rounded-full bg-gradient-to-br ${theme.gradient} opacity-[0.08] blur-3xl`} />

        <div className={`relative ${theme.cardBg} flex flex-col sm:flex-row`}>

          {/* Photo panel */}
          {imageUrl && (
            <div className="sm:w-2/5 flex-shrink-0 relative">
              <img
                src={imageUrl}
                alt="Analyzed face"
                className="w-full h-full object-cover"
                style={{ minHeight: '260px', maxHeight: '360px' }}
              />
              {/* overlay label */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                <Camera className="w-3 h-3 text-white/80" />
                <span className="text-[11px] font-medium text-white/90">Photo analyzed</span>
              </div>
            </div>
          )}

          {/* Score panel */}
          <div className={`flex-1 flex flex-col items-center justify-center p-8 sm:p-10 ${imageUrl ? '' : 'w-full'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-6">Your Stress Score</p>
            <ScoreRing score={result.stress_score} theme={theme} />
            <div className="flex justify-center mt-6 mb-4">
              <span className={`inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full text-sm font-bold ${theme.badgeBg} ${theme.badgeText} ring-2 ${theme.ringColor}`}>
                <span className="text-xl">{stressLevelEmoji}</span>
                {theme.label} Stress Level
              </span>
            </div>
            <p className={`text-center text-sm font-medium ${theme.accentColor} leading-relaxed max-w-xs`}>{theme.humanMessage}</p>
          </div>
        </div>
      </div>

      {/* ── Emotional Snapshot ── */}
      <div className={`${cue.bgClass} border ${cue.borderClass} rounded-2xl px-6 py-5 mb-5 ${fadeClass(600)}`} style={{ transitionDelay: '600ms' }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Emotional Snapshot</p>
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

      {/* ── Supportive Message ── */}
      <div className={`bg-slate-800 rounded-3xl px-7 py-6 mb-7 ${fadeClass(660)}`} style={{ transitionDelay: '660ms' }}>
        <div className="flex items-start gap-4">
          <div className="text-2xl flex-shrink-0 mt-0.5">
            {theme.label === 'Severe' ? '🆘' : theme.label === 'High' ? '💛' : theme.label === 'Moderate' ? '🌤️' : '✨'}
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

      {/* ══════════════════════════════════════════
          CLINICAL WELLBEING REPORT
      ══════════════════════════════════════════ */}
      <div className={`mb-6 ${fadeClass(740)}`} style={{ transitionDelay: '740ms' }}>

        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${theme.gradient} text-white shadow-sm flex-shrink-0`}>
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">Clinical Wellbeing Report</h2>
            <p className="text-xs text-slate-400 mt-0.5">Gemini AI · personalised to your assessment</p>
          </div>
        </div>

        {/* Clinical Summary */}
        {summary && (
          <div className="relative bg-white border border-slate-200 rounded-2xl px-6 py-5 mb-4 overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-400 to-cyan-400 rounded-l-2xl" />
            <div className="flex items-start gap-3 pl-2">
              <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-sky-600 uppercase tracking-widest mb-1.5">Clinical Observation</p>
                <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Urgency Note */}
        {urgencyNote && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1.5">Attention Recommended</p>
              <p className="text-sm text-amber-800 leading-relaxed">{urgencyNote}</p>
            </div>
          </div>
        )}

        {/* Category Cards */}
        {hasCategories ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {categories.map((cat, i) => {
              const accent = CARD_ACCENTS[i % CARD_ACCENTS.length];
              return (
                <div
                  key={i}
                  className={`${accent.bg} border ${accent.border} rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${820 + i * 70}ms` }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${theme.iconBg} text-white shadow-sm flex-shrink-0`}>
                      {CATEGORY_ICONS[cat.icon?.toLowerCase()] ?? <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${accent.dot}`} />
                      <p className={`text-xs font-bold uppercase tracking-wide ${accent.label} truncate`}>{cat.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{cat.tip}</p>
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback step cards */
          <div className="space-y-3 mb-4">
            {adviceItems.map((advice, i) => (
              <div
                key={i}
                className={`bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${820 + i * 70}ms` }}
              >
                <div className="flex items-start gap-4 p-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${theme.gradient} text-white shadow-sm`}>
                    {STEP_ICONS[i % STEP_ICONS.length]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Step {i + 1}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{advice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* When to Seek Help */}
        {whenToSeekHelp && (
          <div className="bg-slate-800 rounded-2xl px-6 py-5 flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldCheck className="w-4.5 h-4.5 text-slate-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Professional Support</p>
              <p className="text-sm text-slate-300 leading-relaxed">{whenToSeekHelp}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Disclaimer ── */}
      <div
        className={`flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 mb-7 ${fadeClass(820)}`}
        style={{ transitionDelay: `${820 + adviceItems.length * 70}ms` }}
      >
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Note: </span>
          This result is not a medical diagnosis. It is an AI-assisted wellbeing insight based on facial expression analysis. If you are experiencing prolonged stress or distress, please consult a qualified healthcare professional.
        </p>
      </div>

      {/* ── Action Buttons ── */}
      <div
        className={`flex gap-3 ${fadeClass(900)}`}
        style={{ transitionDelay: `${900 + adviceItems.length * 70}ms` }}
      >
        <button
          onClick={onReset}
          className="flex items-center gap-2.5 px-6 py-4 border-2 border-slate-200 text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 whitespace-nowrap"
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

      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
          <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Saved privately & securely
        </span>
      </div>
    </div>
  );
}
