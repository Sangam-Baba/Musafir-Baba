import React, { useRef, useState, useEffect } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '../ui/button';

export function CameraModal({ onCapture, onCancel, title }: { onCapture: (base64: string) => void, onCancel: () => void, title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    let localStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" }, 
          audio: false 
        });
        if (mounted) {
          localStream = mediaStream;
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
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
            </>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-md border-slate-200" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            className="flex-1 rounded-md bg-[#FE5300] hover:bg-orange-600 text-white font-bold disabled:opacity-50" 
            onClick={capturePhoto}
            disabled={!!error || !stream}
          >
            <Camera className="w-4 h-4 mr-2" />
            Capture & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
}
