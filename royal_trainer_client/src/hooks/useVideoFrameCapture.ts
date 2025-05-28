// royal_trainer_client/src/hooks/useVideoFrameCapture.ts

import { useCallback, useRef, useEffect } from "react";

interface FrameCaptureOptions {
  fps?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export const useVideoFrameCapture = (
  videoRef: React.RefObject<HTMLVideoElement>,
  sessionCode: string,
  isInferenceEnabled: boolean,
  webSocketRef: React.RefObject<WebSocket>,
  options: FrameCaptureOptions = {}
) => {
  const { fps = 5, quality = 0.8, maxWidth = 640, maxHeight = 480 } = options;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = webSocketRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) {
      return null;
    }

    // Check if video is playing and has valid dimensions
    if (
      video.paused ||
      video.ended ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return null;
    }

    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Calculate scaled dimensions while maintaining aspect ratio
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      let canvasWidth = Math.min(maxWidth, video.videoWidth);
      let canvasHeight = Math.min(maxHeight, video.videoHeight);

      if (canvasWidth / canvasHeight !== videoAspectRatio) {
        if (canvasWidth / videoAspectRatio <= maxHeight) {
          canvasHeight = canvasWidth / videoAspectRatio;
        } else {
          canvasWidth = canvasHeight * videoAspectRatio;
        }
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

      // Convert to base64
      const frameData = canvas.toDataURL("image/jpeg", quality);

      // Send frame data to server via WebSocket
      const frameMessage = {
        type: "frame_data",
        sessionCode: sessionCode,
        frameData: frameData.split(",")[1], // Remove data:image/jpeg;base64, prefix
        timestamp: performance.now(),
        frameNumber: frameCountRef.current++,
        dimensions: {
          width: canvasWidth,
          height: canvasHeight,
          originalWidth: video.videoWidth,
          originalHeight: video.videoHeight,
        },
      };

      ws.send(JSON.stringify(frameMessage));

      return frameData;
    } catch (error) {
      console.error("Error capturing video frame:", error);
      return null;
    }
  }, [videoRef, sessionCode, webSocketRef, quality, maxWidth, maxHeight]);

  const startCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    console.log(
      `🎥 Starting video frame capture at ${fps} FPS for session ${sessionCode}`
    );

    frameCountRef.current = 0;
    const interval = 1000 / fps;

    captureIntervalRef.current = setInterval(() => {
      if (isInferenceEnabled) {
        captureFrame();
      }
    }, interval);
  }, [captureFrame, fps, isInferenceEnabled, sessionCode]);

  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    console.log(`🛑 Stopped video frame capture for session ${sessionCode}`);
  }, [sessionCode]);

  // Auto start/stop capture based on inference state
  useEffect(() => {
    if (isInferenceEnabled) {
      startCapture();
    } else {
      stopCapture();
    }

    return () => stopCapture();
  }, [isInferenceEnabled, startCapture, stopCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  const captureManualFrame = useCallback(() => {
    return captureFrame();
  }, [captureFrame]);

  const getFrameStats = useCallback(() => {
    return {
      totalFramesCaptured: frameCountRef.current,
      isCapturing: captureIntervalRef.current !== null,
      captureRate: fps,
      quality: quality,
      maxDimensions: { width: maxWidth, height: maxHeight },
    };
  }, [fps, quality, maxWidth, maxHeight]);

  return {
    startCapture,
    stopCapture,
    captureManualFrame,
    getFrameStats,
    isCapturing: captureIntervalRef.current !== null,
  };
};
