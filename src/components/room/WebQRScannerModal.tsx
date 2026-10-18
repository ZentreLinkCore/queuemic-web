import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';

export interface WebQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
}

export const WebQRScannerModal: React.FC<WebQRScannerModalProps> = ({
  isOpen,
  onClose,
  onCodeScanned,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const barcodeDetectorRef = useRef<any>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Initialize native BarcodeDetector if available
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const extractRoomCode = (rawData: string): string | null => {
    if (!rawData) return null;
    const trimmed = rawData.trim();

    // 1. JSON payload e.g. { code: "ABCDEF" }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.code && typeof parsed.code === 'string') {
        return parsed.code.trim().toUpperCase();
      }
    } catch {}

    // 2. URL parameter e.g. https://.../join?code=ABCDEF or /room/ABCDEF
    if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('join?code=')) {
      const urlMatch =
        trimmed.match(/[?&]code=([A-Za-z0-9]{4,8})/i) ||
        trimmed.match(/\/room\/([A-Za-z0-9]{4,8})/i) ||
        trimmed.match(/\/rooms\/([A-Za-z0-9]{4,8})/i);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1].toUpperCase();
      }
    }

    // 3. Raw 4 to 8 alphanumeric code (e.g. K7P9X2)
    const codeMatch = trimmed.match(/^[A-Za-z0-9]{4,8}$/);
    if (codeMatch) {
      return trimmed.toUpperCase();
    }

    return null;
  };

  const scanFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    let detectedData: string | null = null;

    // 1. Try native BarcodeDetector if supported
    if (barcodeDetectorRef.current) {
      try {
        const barcodes = await barcodeDetectorRef.current.detect(video);
        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
          detectedData = barcodes[0].rawValue;
        }
      } catch {}
    }

    // 2. Fallback to jsQR
    if (!detectedData && canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code && code.data) {
          detectedData = code.data;
        }
      }
    }

    if (detectedData) {
      const extracted = extractRoomCode(detectedData);
      if (extracted) {
        // Haptic feedback if supported on mobile device
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(80);
          } catch {}
        }
        stopCamera();
        onCodeScanned(extracted);
        onClose();
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [onCodeScanned, onClose, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMessage(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setHasPermission(true);
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: any) {
      setHasPermission(false);
      setErrorMessage(
        err?.message?.includes('Permission denied') || err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings to scan QR.'
          : 'Could not access device camera. Please enter room code manually.'
      );
    }
  }, [facingMode, scanFrame, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-sm relative">
        <GlassCard variant="elevated" glow="cyan" className="p-5 relative border-white/10">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="text-xl">📷</span>
              <div>
                <h3 className="text-sm font-bold text-white font-['Outfit']">Scan Host TV QR</h3>
                <p className="text-[11px] text-slate-400">Point camera at TV screen</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close scanner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera Viewport / Viewfinder */}
          <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
            {errorMessage ? (
              <div className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-xs text-slate-300 leading-relaxed mb-3">{errorMessage}</p>
                <NeonButton size="sm" variant="outline" onClick={startCamera}>
                  Try Again
                </NeonButton>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Viewfinder Target Reticle */}
                <div className="absolute inset-8 pointer-events-none border-2 border-dashed border-[#06B6D4]/40 rounded-xl flex items-center justify-center">
                  {/* Corner accents */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#06B6D4] -mt-0.5 -ml-0.5" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#06B6D4] -mt-0.5 -mr-0.5" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#06B6D4] -mb-0.5 -ml-0.5" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#06B6D4] -mb-0.5 -mr-0.5" />

                  {/* Animated laser line */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#06B6D4] to-transparent animate-pulse shadow-[0_0_8px_#06B6D4]" />
                </div>

                {hasPermission === null && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-xs text-slate-300">
                    <Camera className="w-6 h-6 animate-pulse text-[#06B6D4] mb-2" />
                    <span>Opening camera...</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Flip Camera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
