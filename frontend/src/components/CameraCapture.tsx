import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to access camera. Please ensure camera permissions are granted.'
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    stopCamera();
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage) return;

    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onCapture(file);
        stopCamera();
      });
  }, [capturedImage, onCapture, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full mx-4 overflow-hidden animate-scaleIn">
        <div className="bg-gradient-to-r from-cyan-600 to-teal-600 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-white" />
            <h2 className="text-2xl font-bold text-white">Camera Capture</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
              {error}
            </div>
          )}

          <div className="relative bg-slate-900 rounded-2xl overflow-hidden mb-6">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ maxHeight: '60vh' }}
              />
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-auto"
                style={{ maxHeight: '60vh' }}
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="flex gap-4">
            {!capturedImage ? (
              <>
                <button
                  onClick={capturePhoto}
                  disabled={!isCameraActive}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-cyan-700 hover:to-teal-700 hover:scale-105 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 shadow-lg flex items-center justify-center"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Take Photo
                </button>
                <button
                  onClick={handleClose}
                  className="px-8 py-4 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all duration-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={retakePhoto}
                  className="flex-1 border-2 border-cyan-600 text-cyan-600 py-4 rounded-xl font-semibold text-lg hover:bg-cyan-50 transition-all duration-300 flex items-center justify-center"
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Retake
                </button>
                <button
                  onClick={confirmPhoto}
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-teal-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-cyan-700 hover:to-teal-700 hover:scale-105 transition-all duration-300 shadow-lg flex items-center justify-center"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Use Photo
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
