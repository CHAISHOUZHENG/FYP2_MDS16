export interface EmotionCueConfig {
  emoji: string;
  label: string;
  description: string;
  bgClass: string;
  borderClass: string;
  labelClass: string;
  dotClass: string;
}

const EMOTION_MAP: Record<string, EmotionCueConfig> = {
  happy: {
    emoji: '😊',
    label: 'Happy',
    description: 'You appear relaxed and emotionally steady right now.',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-100',
    labelClass: 'text-amber-700',
    dotClass: 'bg-amber-400',
  },
  sad: {
    emoji: '😔',
    label: 'Sad',
    description: 'You may be showing signs of emotional heaviness.',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-100',
    labelClass: 'text-sky-700',
    dotClass: 'bg-sky-400',
  },
  angry: {
    emoji: '😠',
    label: 'Angry',
    description: 'Your expression suggests some tension or frustration.',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-100',
    labelClass: 'text-rose-700',
    dotClass: 'bg-rose-400',
  },
  fear: {
    emoji: '😨',
    label: 'Anxious',
    description: 'Your expression reflects a sense of unease or worry.',
    bgClass: 'bg-slate-100',
    borderClass: 'border-slate-200',
    labelClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
  surprise: {
    emoji: '😲',
    label: 'Surprised',
    description: 'Your face reflects a sense of alertness or unexpected reaction.',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-100',
    labelClass: 'text-orange-700',
    dotClass: 'bg-orange-400',
  },
  neutral: {
    emoji: '😐',
    label: 'Neutral',
    description: 'Your expression looks calm and balanced at the moment.',
    bgClass: 'bg-slate-50',
    borderClass: 'border-slate-200',
    labelClass: 'text-slate-600',
    dotClass: 'bg-slate-400',
  },
  disgust: {
    emoji: '😒',
    label: 'Discomfort',
    description: 'Your expression suggests mild discomfort or displeasure.',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-100',
    labelClass: 'text-teal-700',
    dotClass: 'bg-teal-400',
  },
};

const FALLBACK: EmotionCueConfig = {
  emoji: '🙂',
  label: 'Detected',
  description: 'An emotional cue was observed from your expression.',
  bgClass: 'bg-slate-50',
  borderClass: 'border-slate-200',
  labelClass: 'text-slate-600',
  dotClass: 'bg-slate-400',
};

export function getEmotionCueConfig(emotion: string): EmotionCueConfig {
  return EMOTION_MAP[emotion.toLowerCase()] ?? FALLBACK;
}
