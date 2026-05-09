export interface AnalysisFeedbackConfig {
  emoji: string;
  title: string;
  message: string;
  tip: string;
}

const FEEDBACK_MAP: Array<{ matches: string[]; config: AnalysisFeedbackConfig }> = [
  {
    matches: [
      'no face detected',
      'no clear face detected',
      'partially covered',
      'blocked',
      'not clearly visible',
      'too close',
      'too far',
      'outside the frame',
      'tilted too much',
      'face the camera directly',
      'eyes appear to be closed',
      'face appears to be turned',
      'illustrated or cartoon'
    ],
    config: {
      emoji: '🙈',
      title:'Face Could Not Be Detected',
      message: "We couldn't detect a clear face in your photo.",
      tip: 'Make sure your face is fully visible, centered, and facing the camera. Remove any masks, sunglasses, or anything covering your face.',
    },
  },
  {
    matches: ['multiple faces detected', 'multiple people detected'],
    config: {
      emoji: '👥',
      title: 'Multiple People Detected',
      message: 'We found more than one person in the image.',
      tip: 'Please upload a photo with only your face for accurate analysis.',
    },
  },
  {
    matches: [
      'too dark',
      'brighter environment',
      'better lighting',
      'uneven lighting',
      'too bright',
      'overexposed',
    ],
    config: {
      emoji: '💡',
      title: 'Lighting Issue Detected',
      message: "The lighting in your photo is making it difficult to analyse your face.",
      tip: 'Try again in a brighter environment, face a light source directly, and avoid strong backlighting or shadows on your face.',
    },
  },
  {
    matches: [
      'blurry',
      'too noisy',
      'noisy',
      'washed out',
      'low contrast',
      'resolution is too low',
      'too small',
      'low resolution',
    ],
    config: {
      emoji: '📷',
      title: 'Image Quality Too Low',
      message: "Your photo isn't clear enough for accurate analysis.",
      tip: 'Use a sharper, higher quality photo. Hold your camera steady, avoid heavy filters, and make sure your face fills enough of the frame.',
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
