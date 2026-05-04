export interface AnalysisFeedbackConfig {
  emoji: string;
  title: string;
  message: string;
  tip: string;
}

const FEEDBACK_MAP: Array<{ matches: string[]; config: AnalysisFeedbackConfig }> = [
  {
    matches: ['no clear face detected', 'no face detected'],
    config: {
      emoji: '🧑‍🦯',
      title: 'No Face Detected',
      message: "We couldn't detect a clear face in your photo.",
      tip: 'Make sure your face is fully visible, centered, and facing the camera.',
    },
  },
  {
    matches: ['multiple faces detected'],
    config: {
      emoji: '👥',
      title: 'Multiple Faces Detected',
      message: 'We found more than one face in the image.',
      tip: 'Please upload a photo with only your face for accurate analysis.',
    },
  },
  {
    matches: ['face appears blurry', 'blurry'],
    config: {
      emoji: '🌫️',
      title: 'Image Too Blurry',
      message: 'Your photo appears out of focus.',
      tip: 'Try taking a clearer photo and hold your camera steady.',
    },
  },
  {
    matches: ['too dark', 'better lighting'],
    config: {
      emoji: '🌙',
      title: 'Lighting Too Dark',
      message: "The image is too dark to detect facial details.",
      tip: 'Try again in a brighter environment or face a light source.',
    },
  },
  {
    matches: ['too bright'],
    config: {
      emoji: '☀️',
      title: 'Image Too Bright',
      message: 'The lighting is too strong and washes out facial features.',
      tip: 'Avoid direct light or strong backlighting.',
    },
  },
  {
    matches: ['too small', 'low resolution'],
    config: {
      emoji: '📏',
      title: 'Face Too Small',
      message: 'Your face appears too far away or unclear in the image.',
      tip: 'Move closer so your face fills more of the frame.',
    },
  },
  {
    matches: ['invalid image file'],
    config: {
      emoji: '🖼️',
      title: 'Invalid Image',
      message: "We couldn't read this file as a valid image.",
      tip: 'Try uploading a JPG or PNG photo instead.',
    },
  },
];

const FALLBACK_CONFIG: AnalysisFeedbackConfig = {
  emoji: '⚠️',
  title: 'Something Went Wrong',
  message: "We couldn't analyze this image.",
  tip: 'Try uploading a different photo and try again.',
};

export function getAnalysisFeedbackConfig(errorMessage: string): AnalysisFeedbackConfig {
  const lower = errorMessage.toLowerCase();
  for (const entry of FEEDBACK_MAP) {
    if (entry.matches.some((m) => lower.includes(m))) {
      return entry.config;
    }
  }
  return FALLBACK_CONFIG;
}
