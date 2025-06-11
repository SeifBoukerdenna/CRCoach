// royal_trainer_client/src/hooks/useVideoStream.ts

import { useEffect, useRef } from "react";

export const useVideoStream = (
  videoRef: React.RefObject<HTMLVideoElement>,
  remoteStream: MediaStream | null | undefined
) => {
  const attachedStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const videoElement = videoRef.current;

    if (!videoElement) return;

    // Only update if stream has actually changed
    if (remoteStream && remoteStream !== attachedStreamRef.current) {
      console.log("🎥 Attaching new remote stream to video element", {
        tracks: remoteStream.getTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
        audioTracks: remoteStream.getAudioTracks().length,
      });

      videoElement.srcObject = remoteStream;
      attachedStreamRef.current = remoteStream;

      // Force play and handle autoplay issues
      videoElement.muted = true; // Required for autoplay in most browsers
      videoElement.playsInline = true;

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("✅ Video playing successfully");
          })
          .catch((error) => {
            console.warn("❌ Video play failed:", error);
            // Try again with user interaction
            setTimeout(() => {
              videoElement.play().catch(() => {});
            }, 1000);
          });
      }
    } else if (!remoteStream && attachedStreamRef.current) {
      console.log("🎥 Removing stream from video element");
      videoElement.srcObject = null;
      attachedStreamRef.current = null;
    }
  }, [videoRef, remoteStream]);

  // Additional effect to handle video events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleLoadedMetadata = () => {
      console.log("📺 Video metadata loaded:", {
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        duration: videoElement.duration,
      });
    };

    const handleCanPlay = () => {
      console.log("▶️ Video can play");
    };

    const handleError = (e: Event) => {
      console.error("❌ Video error:", e);
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("canplay", handleCanPlay);
    videoElement.addEventListener("error", handleError);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("canplay", handleCanPlay);
      videoElement.removeEventListener("error", handleError);
    };
  }, [videoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      attachedStreamRef.current = null;
    };
  }, [videoRef]);
};
