import React, { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '../ui/button';

// Self-hosted MediaPipe assets (see /public/mediapipe). Runs fully in the browser:
// no API calls, no cost, no image ever leaves the device for face checking.
const MEDIAPIPE_WASM_PATH = '/mediapipe/wasm';
const FACE_MODEL_PATH = '/mediapipe/blaze_face_short_range.tflite';
// If the face detector can't load within this time, we fall back to the old behaviour
// (allow capture) so a slow network or unsupported device never blocks check-in.
const FACE_DETECTOR_LOAD_TIMEOUT_MS = 15000;

type FaceDetectorStatus = 'off' | 'loading' | 'ready' | 'unavailable';

type MinimalFaceDetector = {
  detectForVideo: (frame: HTMLVideoElement, timestamp: number) => { detections: unknown[] };
  close: () => void;
};

/** True when the captured frame is (almost) a single flat colour, e.g. an all-black frame. */
function isFrameBlank(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const { data } = context.getImageData(0, 0, width, height);
    let sum = 0;
    let sumSq = 0;
    let count = 0;
    // Sample every 16th pixel, plenty for a brightness/variance estimate.
    for (let i = 0; i < data.length; i += 64) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += lum;
      sumSq += lum * lum;
      count++;
    }
    if (count === 0) return true;
    const mean = sum / count;
    const stdDev = Math.sqrt(Math.max(0, sumSq / count - mean * mean));
    // Very dark AND nearly no detail -> camera delivered an empty frame.
    // Uniform frames of any colour (e.g. solid green from some drivers) are also blank.
    return (mean < 12 && stdDev < 6) || stdDev < 2;
  } catch {
    // If pixels can't be read, don't block the user.
    return false;
  }
}

export function CameraModal({
  onCapture,
  onCancel,
  title,
  requireFace = false,
}: {
  onCapture: (base64: string) => void;
  onCancel: () => void;
  title: string;
  /** When true, capture is blocked if no human face is visible in the frame. */
  requireFace?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<MinimalFaceDetector | null>(null);
  const lastDetectTsRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [videoReady, setVideoReady] = useState(false);
  const [notice, setNotice] = useState<string>('');
  const [faceStatus, setFaceStatus] = useState<FaceDetectorStatus>(requireFace ? 'loading' : 'off');
  const [faceVisible, setFaceVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false
        });
        if (mounted) {
          localStream = mediaStream;
          setStream(mediaStream);
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
      } catch (err: any) {
        if (mounted) {
          setError('Could not access camera. Please allow permissions.');
          console.error(err);
        }
      }
    }
    startCamera();

    return () => {
      mounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Attach the stream to the <video> and explicitly start playback.
  // `autoPlay` alone is ignored by some browsers (iOS Safari, some Android WebViews,
  // power-saving modes), which leaves the video paused with no frames -> blank capture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    const markReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) setVideoReady(true);
    };

    video.srcObject = stream;
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('playing', markReady);
    video.addEventListener('resize', markReady);
    video.play().then(markReady).catch(() => { /* autoplay blocked; events above still fire once it plays */ });
    markReady();

    return () => {
      video.removeEventListener('loadeddata', markReady);
      video.removeEventListener('playing', markReady);
      video.removeEventListener('resize', markReady);
    };
  }, [stream]);

  // Load the on-device face detector (only when requireFace is on).
  useEffect(() => {
    if (!requireFace) return;
    let cancelled = false;
    let detector: MinimalFaceDetector | null = null;

    const timeout = setTimeout(() => {
      if (!cancelled && !detectorRef.current) {
        cancelled = true;
        setFaceStatus('unavailable');
      }
    }, FACE_DETECTOR_LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
        const created = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'CPU' },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
        });
        detector = created as unknown as MinimalFaceDetector;
        if (cancelled) {
          detector.close();
          return;
        }
        detectorRef.current = detector;
        clearTimeout(timeout);
        setFaceStatus('ready');
      } catch (err) {
        console.warn('Face detector unavailable, continuing without face check', err);
        if (!cancelled) {
          clearTimeout(timeout);
          setFaceStatus('unavailable');
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      detectorRef.current = null;
      try { detector?.close(); } catch { /* ignore */ }
    };
  }, [requireFace]);

  /** Returns number of faces in current video frame, or null if the check couldn't run. */
  const countFaces = (): number | null => {
    const detector = detectorRef.current;
    const video = videoRef.current;
    if (!detector || !video || video.videoWidth === 0) return null;
    try {
      // detectForVideo requires strictly increasing timestamps.
      const ts = Math.max(performance.now(), lastDetectTsRef.current + 1);
      lastDetectTsRef.current = ts;
      return detector.detectForVideo(video, ts).detections.length;
    } catch (err) {
      console.warn('Face detection failed', err);
      return null;
    }
  };

  // Live hint so the user knows whether they're in frame before pressing capture.
  useEffect(() => {
    if (faceStatus !== 'ready' || !videoReady) return;
    const id = setInterval(() => {
      const n = countFaces();
      if (n !== null) {
        setFaceVisible(n > 0);
        if (n > 0) setNotice('');
      }
    }, 500);
    return () => clearInterval(id);
  }, [faceStatus, videoReady]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const MAX_WIDTH = 640;
      let width = video.videoWidth;
      let height = video.videoHeight;

      // Video has no frames yet -> canvas would be 0x0 and produce an empty image.
      if (!width || !height) {
        setNotice('Camera is still starting. Please wait a moment and try again.');
        return;
      }

      if (requireFace && faceStatus === 'ready') {
        const faces = countFaces();
        if (faces === 0) {
          setFaceVisible(false);
          setNotice('No face detected. Please face the camera in good light and try again.');
          return;
        }
      }

      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, width, height);

        if (isFrameBlank(context, width, height)) {
          setNotice('Captured image is blank. Please check your camera / lighting and try again.');
          return;
        }

        // Compress heavily (quality 0.6) to save space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        if (!dataUrl || dataUrl === 'data:,') {
          setNotice('Could not capture image. Please try again.');
          return;
        }

        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        onCapture(dataUrl);
      }
    }
  };

  const handleCancel = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onCancel();
  };

  const waitingForFaceDetector = requireFace && faceStatus === 'loading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-[15px]">{title}</h3>
          <button onClick={handleCancel} className="text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-50 relative aspect-[4/3] flex items-center justify-center overflow-hidden">
          {error ? (
            <p className="text-red-500 text-sm font-semibold text-center">{error}</p>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover bg-black"
              />
              <canvas ref={canvasRef} className="hidden" />
              {!videoReady && (
                <p className="relative text-white/80 text-sm font-medium">Starting camera…</p>
              )}
              {requireFace && videoReady && (
                <span
                  className={`absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${
                    faceStatus === 'loading'
                      ? 'bg-slate-700/80'
                      : faceStatus === 'ready' && faceVisible
                        ? 'bg-green-600/90'
                        : faceStatus === 'ready' && faceVisible === false
                          ? 'bg-red-600/90'
                          : 'hidden'
                  }`}
                >
                  {faceStatus === 'loading'
                    ? 'Preparing face check…'
                    : faceVisible
                      ? 'Face detected'
                      : 'No face detected'}
                </span>
              )}
            </>
          )}
        </div>

        {notice && !error && (
          <p className="px-4 pt-3 text-red-500 text-xs font-semibold text-center">{notice}</p>
        )}

        <div className="p-4 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-md border-slate-200" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            className="flex-1 rounded-md bg-[#FE5300] hover:bg-orange-600 text-white font-bold disabled:opacity-50"
            onClick={capturePhoto}
            disabled={!!error || !stream || !videoReady || waitingForFaceDetector}
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
}
