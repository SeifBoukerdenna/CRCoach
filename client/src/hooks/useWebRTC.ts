import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionStatus } from "../types/webrtc";

export type StreamQuality = "low" | "medium" | "high";

export interface UseWebRTC {
  status: ConnectionStatus;
  resolution: string;
  rtt: string;
  fps: string;
  quality: StreamQuality;
  connect: (code: string) => Promise<void>;
  disconnect: () => void;
  reset: () => void;
  videoElement: React.RefObject<HTMLVideoElement | null>;
}

export function useWebRTC(): UseWebRTC {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [resolution, setResolution] = useState("—×—");
  const [rtt, setRtt] = useState("— ms");
  const [fps, setFps] = useState("— FPS");
  const [quality, setQuality] = useState<StreamQuality>("medium");

  /* ——— cleanup on unmount ——— */
  useEffect(() => () => pcRef.current?.close(), []);

  /* ——— stats loop ——— */
  const startStats = useCallback(() => {
    if (!pcRef.current) return;
    const pc = pcRef.current;
    const id = setInterval(async () => {
      if (!pc || pc.connectionState !== "connected") {
        clearInterval(id);
        return;
      }
      const stats = await pc.getStats();
      stats.forEach((r) => {
        if (
          r.type === "candidate-pair" &&
          r.state === "succeeded" &&
          r.currentRoundTripTime
        )
          setRtt(`${Math.round(r.currentRoundTripTime * 1000)} ms`);
        if (r.type === "inbound-rtp" && r.kind === "video" && r.framesPerSecond)
          setFps(`${Math.round(r.framesPerSecond)} FPS`);
      });
    }, 1000);
  }, []);

  /* ——— quality detection based on resolution ——— */
  useEffect(() => {
    if (resolution === "—×—") return;

    // Extract width from resolution (format: "320×240")
    const width = parseInt(resolution.split("×")[0], 10);
    if (isNaN(width)) return;

    // Determine quality based on width
    if (width <= 240) {
      setQuality("low");
    } else if (width <= 320) {
      setQuality("medium");
    } else {
      setQuality("high");
    }
  }, [resolution]);

  /* ——— main connect flow ——— */
  const connect = useCallback(
    async (code: string) => {
      if (videoRef.current) videoRef.current.srcObject = null;
      pcRef.current?.close();
      pcRef.current = null;

      setStatus("connecting");
      const pc = new RTCPeerConnection({ iceServers: [] });
      pcRef.current = pc;

      pc.onconnectionstatechange = () =>
        setStatus(pc.connectionState as ConnectionStatus);

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.ontrack = ({ track, streams }) => {
        if (track.kind !== "video") return;
        if (videoRef.current) {
          videoRef.current.srcObject = streams[0];
          videoRef.current.onloadedmetadata = () => {
            setResolution(
              `${videoRef.current!.videoWidth}×${videoRef.current!.videoHeight}`
            );
            videoRef.current!.play().catch(() => {});
          };
        }
      };

      pc.oniceconnectionstatechange = () => {
        const ice = pc.iceConnectionState;
        console.log("ICE state →", ice);
        if (ice === "disconnected" || ice === "closed" || ice === "failed") {
          setStatus("disconnected");
        }
      };

      /* SDP handshake */
      const offer = await pc.createOffer({ offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);

      setStatus("sending");
      const res = await fetch("/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pc.localDescription!.toJSON(), code }),
      });

      if (res.status === 404) {
        setStatus("invalid");
        pc.close();
        pcRef.current = null;
        return;
      }
      if (!res.ok) {
        setStatus("error");
        pc.close();
        pcRef.current = null;
        return;
      }

      const ans = await res.json();
      await pc.setRemoteDescription(ans);
      startStats();
      setStatus("connected");
    },
    [startStats]
  );

  /* ——— reset after invalid ——— */
  const reset = () => {
    if (status === "invalid") setStatus("disconnected");
  };

  const disconnect = () => {
    pcRef.current?.close();
    pcRef.current = null;
    setStatus("disconnected");
  };

  return {
    status,
    resolution,
    rtt,
    fps,
    quality,
    connect,
    reset,
    disconnect,
    videoElement: videoRef,
  };
}
