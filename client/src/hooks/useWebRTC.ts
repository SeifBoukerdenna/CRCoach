import { useEffect, useRef, useState, useCallback } from "react";
import { ConnectionStatus } from "../types/webrtc";

export interface UseWebRTC {
  status: ConnectionStatus;
  resolution: string;
  rtt: string;
  connect: () => Promise<void>;
  videoElement: React.RefObject<HTMLVideoElement | null>;
}

export function useWebRTC(): UseWebRTC {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [resolution, setResolution] = useState("—×—");
  const [rtt, setRtt] = useState("— ms");

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.onconnectionstatechange = () =>
      setStatus(pc.connectionState as ConnectionStatus);

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.ontrack = ({ streams }) => {
      const stream = streams[0];
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          const w = videoRef.current!.videoWidth;
          const h = videoRef.current!.videoHeight;
          setResolution(`${w}×${h}`);
        };
      }
    };

    const interval = setInterval(async () => {
      const pc = pcRef.current!;
      const stats = await pc.getStats();
      stats.forEach((report) => {
        if (
          report.type === "candidate-pair" &&
          report.state === "succeeded" &&
          report.currentRoundTripTime != null
        ) {
          setRtt(`${Math.round(report.currentRoundTripTime * 1000)} ms`);
        }
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      pc.close();
    };
  }, []);

  const connect = useCallback(async () => {
    const pc = pcRef.current!;
    setStatus("creating");
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    setStatus("gathering");
    await new Promise<void>((resolve) => {
      pc.onicecandidate = (ev) => {
        if (!ev.candidate) resolve();
      };
      setTimeout(resolve, 5000);
    });

    setStatus("sending");
    const res = await fetch("/offer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pc.localDescription),
    });
    const answer = await res.json();
    await pc.setRemoteDescription(answer);

    setStatus("connected");
  }, []);

  return { status, resolution, rtt, connect, videoElement: videoRef };
}
