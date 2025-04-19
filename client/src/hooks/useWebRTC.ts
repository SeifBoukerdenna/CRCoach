/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { ConnectionStatus } from "../types/webrtc";

export interface UseWebRTC {
  status: ConnectionStatus;
  resolution: string;
  rtt: string;
  fps: string;
  connect: () => Promise<void>;
  videoElement: React.RefObject<HTMLVideoElement | null>;
  debugInfo: string; // Added debug info
}

export function useWebRTC(): UseWebRTC {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [resolution, setResolution] = useState("—×—");
  const [rtt, setRtt] = useState("— ms");
  const [fps, setFps] = useState("— FPS");
  const [debugInfo, setDebugInfo] = useState("");

  // Additional debug state
  const logEvent = useCallback((event: string, detail?: any) => {
    console.log(`WebRTC: ${event}`, detail || "");
    setDebugInfo(
      (prev) =>
        `${event}${detail ? ": " + JSON.stringify(detail) : ""}\n${prev
          .split("\n")
          .slice(0, 20)
          .join("\n")}`
    );
  }, []);

  useEffect(() => {
    // Cleanup any existing connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // We don't create the PC here - we'll create it only when connect() is called
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  // Stats collection function
  const startStatsCollection = useCallback(() => {
    if (!pcRef.current) return;

    const pc = pcRef.current;
    const intervalId = setInterval(async () => {
      if (!pc || pc.connectionState !== "connected") {
        clearInterval(intervalId);
        return;
      }

      try {
        const stats = await pc.getStats();

        // Process stats
        stats.forEach((report) => {
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded"
          ) {
            if (report.currentRoundTripTime) {
              setRtt(`${Math.round(report.currentRoundTripTime * 1000)} ms`);
            }
          }

          // Try to estimate FPS
          if (report.type === "inbound-rtp" && report.kind === "video") {
            if (report.framesPerSecond) {
              setFps(`${Math.round(report.framesPerSecond)} FPS`);
            } else if (report.framesReceived && report.timestamp) {
              // Calculate FPS from frames received if direct FPS not available
              const prevReport = (window as any)._prevReport;
              if (prevReport) {
                const timeDelta = report.timestamp - prevReport.timestamp;
                const framesDelta =
                  report.framesReceived - prevReport.framesReceived;
                if (timeDelta > 0) {
                  const calculatedFps = Math.round(
                    (framesDelta * 1000) / timeDelta
                  );
                  setFps(`~${calculatedFps} FPS`);
                }
              }
              (window as any)._prevReport = report;
            }
          }
        });
      } catch (e) {
        console.warn("Stats error:", e);
      }
    }, 1000);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, []);

  const connect = useCallback(async () => {
    // Close any existing connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setStatus("creating");
    logEvent("Creating new RTCPeerConnection");

    // Create a minimal PC for local networks (no ICE servers needed)
    const pc = new RTCPeerConnection({
      iceServers: [], // Empty for local network
      iceCandidatePoolSize: 0,
    });
    pcRef.current = pc;

    // Add connection state monitoring
    pc.onconnectionstatechange = () => {
      logEvent("Connection state changed", pc.connectionState);
      setStatus(pc.connectionState as ConnectionStatus);
    };

    // Add ICE gathering state monitoring
    pc.onicegatheringstatechange = () => {
      logEvent("ICE gathering state changed", pc.iceGatheringState);
    };

    // Add ICE connection state monitoring
    pc.oniceconnectionstatechange = () => {
      logEvent("ICE connection state changed", pc.iceConnectionState);
    };

    // Log ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        logEvent("ICE candidate", {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
        });
      } else {
        logEvent("ICE candidate gathering complete");
      }
    };

    // Configure video receiving
    logEvent("Adding video transceiver");
    pc.addTransceiver("video", { direction: "recvonly" });

    // Handle incoming video track
    pc.ontrack = ({ track, streams }) => {
      logEvent("Received track", { kind: track.kind });

      if (track.kind === "video") {
        const stream = streams[0];
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Set up resolution detection
          videoRef.current.onloadedmetadata = () => {
            const w = videoRef.current!.videoWidth;
            const h = videoRef.current!.videoHeight;
            setResolution(`${w}×${h}`);
            logEvent("Video dimensions", { width: w, height: h });

            // Auto-play as soon as we have metadata
            videoRef.current!.play().catch((e) => {
              logEvent("Video play error", e.message);
            });
          };
        }
      }
    };

    try {
      // Create an offer
      logEvent("Creating offer");
      const offer = await pc.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: false,
      });

      // Set it as local description
      logEvent("Setting local description (offer)");
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      logEvent("Waiting for ICE gathering");
      setStatus("gathering");

      // Function to wait for ICE gathering to complete
      const waitForIceGathering = () => {
        if (pc.iceGatheringState === "complete") {
          return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          };

          pc.addEventListener("icegatheringstatechange", checkState);

          // Also set a 2s timeout in case gathering takes too long
          setTimeout(() => {
            pc.removeEventListener("icegatheringstatechange", checkState);
            logEvent("ICE gathering timeout - proceeding anyway");
            resolve();
          }, 2000);
        });
      };

      await waitForIceGathering();

      // Send the offer to the server
      logEvent("Sending offer to server");
      setStatus("sending");
      const res = await fetch("/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      // Get the answer
      const answer = await res.json();
      logEvent("Received answer from server");

      // Set the remote description
      logEvent("Setting remote description (answer)");
      await pc.setRemoteDescription(answer);

      // Start stats collection
      startStatsCollection();

      logEvent("Connection setup complete");
      setStatus("connected");
    } catch (err) {
      const error = err as Error;
      logEvent("Connection error", error.message);
      console.error("Connection failed:", error);
      setStatus("error");

      // Clean up on error
      pc.close();
      pcRef.current = null;

      // Re-throw for caller to handle
      throw error;
    }
  }, [logEvent, startStatsCollection]);

  return {
    status,
    resolution,
    rtt,
    fps,
    connect,
    videoElement: videoRef,
    debugInfo,
  };
}
