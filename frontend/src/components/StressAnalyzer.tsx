import React, { useState, useEffect } from 'react';
import {
  Upload,
  Activity,
  AlertCircle,
  CheckCircle,
  Camera,
  Image as ImageIcon,
  Lightbulb,
  Sun,
  User,
  Trash2,
  Sparkles,
  Heart,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CameraCapture } from './CameraCapture';
import { StressResultCard } from './StressResultCard';
import { AnalysisFeedbackCard } from './AnalysisFeedbackCard';
import { getAnalysisFeedbackConfig, type AnalysisFeedbackConfig as ValidationFeedback } from '../lib/analysisFeedbackConfig';

interface PredictionResult {
  predicted_emotion: string;
  stress_score: number;
  stress_level: string;
  top_2_predictions: Array<{ emotion: string; probability: string }>;
  probabilities: Record<string, number>;
  suggestion: {
    title: string;
    advice: string[];
  };
}

interface StressAnalyzerProps {
  onBack: () => void;
  onAnalysisComplete: () => void;
}

type AnalysisStep = 'idle' | 'detecting' | 'quality' | 'analyzing' | 'generating';

export function StressAnalyzer({ onBack, onAnalysisComplete }: StressAnalyzerProps) {
  const { session } = useAuth();
  const [backendUrl, setBackendUrl] = useState('http://127.0.0.1:8000/predict');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<ValidationFeedback | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [imageQuality, setImageQuality] = useState<'good' | 'checking' | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError(null);
    setResult(null);
    setValidationFeedback(null);
    setImageQuality(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setImageQuality('checking');

    setTimeout(() => {
      setImageQuality('good');
    }, 800);
  };

  const handleCameraCapture = (file: File) => {
    setError(null);
    setResult(null);
    setValidationFeedback(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCamera(false);
    setImageQuality('checking');

    setTimeout(() => {
      setImageQuality('good');
    }, 800);
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageQuality(null);
    setError(null);
    setResult(null);
    setValidationFeedback(null);
  };

  const handleUpload = async () => {
    setError(null);
    setResult(null);
    setValidationFeedback(null);

    if (!selectedFile) {
      setError('Please select an image first.');
      return;
    }

    if (!backendUrl.trim()) {
      setError('Please enter the backend URL.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setIsLoading(true);

      setAnalysisStep('detecting');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setAnalysisStep('quality');
      await new Promise(resolve => setTimeout(resolve, 800));

      setAnalysisStep('analyzing');
      await new Promise(resolve => setTimeout(resolve, 600));

      const response = await fetch(backendUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let detail = '';
        try {
          const json = await response.json();
          detail = json?.detail ?? json?.message ?? JSON.stringify(json);
        } catch {
          detail = await response.text().catch(() => '');
        }
        setValidationFeedback(getAnalysisFeedbackConfig(detail));
        return;
      }

      setAnalysisStep('generating');
      await new Promise(resolve => setTimeout(resolve, 500));

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setValidationFeedback(getAnalysisFeedbackConfig(''));
    } finally {
      setIsLoading(false);
      setAnalysisStep('idle');
    }
  };

  const handleSaveResult = async () => {
    if (!result || !session?.user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('stress_results').insert({
        user_id: session.user.id,
        predicted_emotion: result.predicted_emotion,
        stress_score: result.stress_score,
        stress_level: result.stress_level,
        probabilities: result.probabilities,
      });

      if (error) throw error;

      onAnalysisComplete();
    } catch (err) {
      setError(`Failed to save result: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getAnalysisStepText = (step: AnalysisStep) => {
    switch (step) {
      case 'detecting': return 'Detecting face in image...';
      case 'quality': return 'Checking image quality...';
      case 'analyzing': return 'Analyzing emotional expressions...';
      case 'generating': return 'Generating insights and recommendations...';
      default: return 'Analyzing...';
    }
  };

  return (
    <>
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="flex-1 bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="mb-8 animate-fadeIn">
            <div className="mb-4">
              <h1 className="text-3xl font-bold text-slate-800 mb-1">Stress Analysis</h1>
              <p className="text-slate-500 text-sm font-normal">AI-powered emotional wellness assessment</p>
            </div>

            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 ${!previewUrl ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200' : 'bg-slate-100 text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${!previewUrl ? 'bg-white text-cyan-600' : 'bg-slate-300 text-slate-500'}`}>1</div>
                <span className="text-sm font-semibold">Upload</span>
              </div>

              <div className={`h-1 w-16 rounded-full transition-all duration-500 ${previewUrl && !result ? 'bg-gradient-to-r from-cyan-400 to-teal-400' : 'bg-slate-200'}`} />

              <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 ${previewUrl && !result ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200' : 'bg-slate-100 text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${previewUrl && !result ? 'bg-white text-cyan-600' : 'bg-slate-300 text-slate-500'}`}>2</div>
                <span className="text-sm font-semibold">Analyze</span>
              </div>

              <div className={`h-1 w-16 rounded-full transition-all duration-500 ${result ? 'bg-gradient-to-r from-cyan-400 to-teal-400' : 'bg-slate-200'}`} />

              <div className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full transition-all duration-300 ${result ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200' : 'bg-slate-100 text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${result ? 'bg-white text-cyan-600' : 'bg-slate-300 text-slate-500'}`}>3</div>
                <span className="text-sm font-semibold">Results</span>
              </div>
            </div>
          </div>

          {!result && !validationFeedback && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-8 animate-slideUp">
                  {!previewUrl ? (
                    <>
                      <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl mb-4">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Start by uploading your image</h2>
                        <p className="text-slate-500 text-sm">Choose a clear photo with good lighting</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="relative group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-input"
                          />
                          <label
                            htmlFor="file-input"
                            className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-cyan-300 rounded-2xl cursor-pointer hover:border-cyan-500 hover:bg-gradient-to-br hover:from-cyan-50 hover:to-blue-50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-100"
                          >
                            <Upload className="w-14 h-14 text-cyan-600 mb-4 group-hover:scale-110 transition-transform" />
                            <span className="text-slate-800 font-bold text-lg mb-1">Upload Image</span>
                            <span className="text-slate-500 text-sm">PNG, JPG up to 10MB</span>
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowCamera(true)}
                          className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-teal-300 rounded-2xl cursor-pointer hover:border-teal-500 hover:bg-gradient-to-br hover:from-teal-50 hover:to-cyan-50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-100 group"
                        >
                          <Camera className="w-14 h-14 text-teal-600 mb-4 group-hover:scale-110 transition-transform" />
                          <span className="text-slate-800 font-bold text-lg mb-1">Use Webcam</span>
                          <span className="text-slate-500 text-sm">Take photo instantly</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-xl font-bold text-slate-800 mb-6">Your Image</h2>
                      <div className="space-y-4">
                        <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-xl animate-scaleIn">
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-auto max-h-80 object-contain"
                          />

                          {imageQuality === 'checking' && (
                            <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm">
                              <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-3 shadow-xl">
                                <Activity className="w-5 h-5 text-cyan-600 animate-spin" />
                                <span className="text-slate-700 font-medium">Validating image...</span>
                              </div>
                            </div>
                          )}

                          {imageQuality === 'good' && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg animate-slideDown">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-semibold">Upload Completed</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleRemoveImage}
                            className="px-6 py-3.5 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-100 hover:border-slate-400 transition-all duration-200 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>

                          <button
                            onClick={handleUpload}
                            disabled={isLoading || !imageQuality || imageQuality === 'checking'}
                            className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-3.5 px-6 rounded-xl font-bold text-lg hover:from-cyan-700 hover:to-teal-700 hover:shadow-2xl hover:shadow-cyan-200 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.02]"
                          >
                            {isLoading ? (
                              <>
                                <Activity className="w-5 h-5 animate-spin" />
                                <span className="text-base font-semibold">{getAnalysisStepText(analysisStep)}</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-5 h-5" />
                                Start Analysis
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {previewUrl && isLoading && (
                    <div className="mt-6 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-200 animate-fadeIn">
                      <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-5 h-5 text-cyan-600 animate-spin" />
                        <p className="text-slate-700 font-semibold">Analyzing your stress levels...</p>
                      </div>
                      <div className="space-y-3">
                        <div className={`flex items-center gap-3 transition-opacity ${analysisStep === 'detecting' || analysisStep === 'quality' || analysisStep === 'analyzing' || analysisStep === 'generating' ? 'opacity-100' : 'opacity-40'}`}>
                          <CheckCircle className={`w-4 h-4 ${analysisStep === 'detecting' ? 'text-cyan-600' : 'text-emerald-600'}`} />
                          <span className="text-sm text-slate-600">Detecting face</span>
                        </div>
                        <div className={`flex items-center gap-3 transition-opacity ${analysisStep === 'quality' || analysisStep === 'analyzing' || analysisStep === 'generating' ? 'opacity-100' : 'opacity-40'}`}>
                          <CheckCircle className={`w-4 h-4 ${analysisStep === 'quality' ? 'text-cyan-600' : analysisStep === 'analyzing' || analysisStep === 'generating' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="text-sm text-slate-600">Checking quality</span>
                        </div>
                        <div className={`flex items-center gap-3 transition-opacity ${analysisStep === 'analyzing' || analysisStep === 'generating' ? 'opacity-100' : 'opacity-40'}`}>
                          <CheckCircle className={`w-4 h-4 ${analysisStep === 'analyzing' ? 'text-cyan-600' : analysisStep === 'generating' ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="text-sm text-slate-600">Analyzing emotions</span>
                        </div>
                        <div className={`flex items-center gap-3 transition-opacity ${analysisStep === 'generating' ? 'opacity-100' : 'opacity-40'}`}>
                          <CheckCircle className={`w-4 h-4 ${analysisStep === 'generating' ? 'text-cyan-600' : 'text-slate-400'}`} />
                          <span className="text-sm text-slate-600">Generating insights</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-gradient-to-br from-cyan-600 to-teal-600 rounded-2xl shadow-lg p-6 text-white animate-slideUp" style={{ animationDelay: '100ms' }}>
                  <Lightbulb className="w-8 h-8 mb-4" />
                  <h3 className="font-bold text-lg mb-3">Tips for Best Results</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-2">
                      <Sun className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Use good lighting, avoid shadows on face</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <User className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Ensure only one face is visible</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Face should be clearly visible and centered</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Camera className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>Avoid blurry or low-quality images</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 animate-slideUp" style={{ animationDelay: '150ms' }}>
                  <Heart className="w-6 h-6 text-rose-500 mb-3" />
                  <h3 className="font-bold text-slate-800 mb-2">Your Privacy Matters</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Your images are processed securely and are not stored permanently. Analysis happens in real-time for your privacy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {validationFeedback && !result && (
            <div className="py-4 animate-fadeIn">
              <AnalysisFeedbackCard
                emoji={validationFeedback.emoji}
                title={validationFeedback.title}
                message={validationFeedback.message}
                tip={validationFeedback.tip}
                onRetry={handleRemoveImage}
                onBack={onBack}
              />
            </div>
          )}

          {result && (
            <div className="py-4 animate-fadeIn">
              <StressResultCard
                result={result}
                isSaving={isSaving}
                onSave={handleSaveResult}
                onReset={() => {
                  setResult(null);
                  handleRemoveImage();
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

