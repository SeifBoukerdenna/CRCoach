import { useState, useRef, useCallback } from "react";
import type {
  ConnectionError,
  ServerResponse,
  StreamStats,
  WebRTCConfig,
} from "../types";

const WEBRTC_CONFIG: WebRTCConfig = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceTransportPolicy: "all",
  bundlePolicy: "max-bundle",
  rtcpMuxPolicy: "require",
};

export const useWebRTC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] =
    useState<ConnectionError | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateStreamStats = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      const stats = await peerConnectionRef.current.getStats();
      let fps = 0;
      let bitrate = 0;
      let resolution = "";

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          if (report.framesPerSecond) {
            fps = Math.round(report.framesPerSecond);
          }
          if (report.bytesReceived && report.timestamp) {
            // Calculate bitrate (approximate)
            bitrate = Math.round((report.bytesReceived * 8) / 1000); // kbps
          }
          if (report.frameWidth && report.frameHeight) {
            resolution = `${report.frameWidth}x${report.frameHeight}`;
          }
        }
      });

      setStreamStats({ fps, bitrate, resolution });
    } catch (error) {
      console.warn("Failed to get stream stats:", error);
    }
  }, []);

  const startStatsCollection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    statsIntervalRef.current = setInterval(updateStreamStats, 1000);
  }, [updateStreamStats]);

  const stopStatsCollection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    setStreamStats(null);
  }, []);

  const connect = useCallback(
    async (sessionCode: string): Promise<void> => {
      try {
        setConnectionError(null);

        // Close existing connection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }

        // Create new peer connection with optimized settings
        const pc = new RTCPeerConnection(WEBRTC_CONFIG);
        peerConnectionRef.current = pc;

        // Set up event handlers
        pc.oniceconnectionstatechange = () => {
          console.log("ICE connection state:", pc.iceConnectionState);

          if (
            pc.iceConnectionState === "connected" ||
            pc.iceConnectionState === "completed"
          ) {
            setIsConnected(true);
            startStatsCollection();
          } else if (
            pc.iceConnectionState === "disconnected" ||
            pc.iceConnectionState === "failed"
          ) {
            setIsConnected(false);
            stopStatsCollection();
            setConnectionError({
              message: "Connection lost. Please try reconnecting.",
              code: "CONNECTION_LOST",
              timestamp: new Date(),
            });
          }
        };

        pc.ontrack = (event) => {
          console.log("Received remote stream");
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];

            // Configure video element for low latency
            videoRef.current.playsInline = true;
            videoRef.current.muted = true;
            videoRef.current.controls = false;

            // Attempt to play immediately
            videoRef.current.play().catch(console.warn);
          }
        };

        pc.onicegatheringstatechange = () => {
          console.log("ICE gathering state:", pc.iceGatheringState);
        };

        pc.onconnectionstatechange = () => {
          console.log("Connection state:", pc.connectionState);
        };

        // Add transceiver for receiving video with specific settings for low latency
        pc.addTransceiver("video", {
          direction: "recvonly",
          streams: [],
        });

        // Create offer with optimized settings
        const offer = await pc.createOffer({
          offerToReceiveVideo: true,
          offerToReceiveAudio: false,
        });

        await pc.setLocalDescription(offer);

        // Send offer to server
        const response = await fetch(`/api/offer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: sessionCode,
            sdp: offer.sdp,
            type: offer.type,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        const data: ServerResponse = await response.json();

        // Set remote description
        await pc.setRemoteDescription(
          new RTCSessionDescription({
            type: data.type,
            sdp: data.sdp,
          })
        );

        console.log("WebRTC connection established successfully");
      } catch (error) {
        console.error("Connection failed:", error);
        setIsConnected(false);
        stopStatsCollection();

        let errorMessage = "Failed to connect to stream";
        if (error instanceof Error) {
          if (error.message.includes("404")) {
            errorMessage =
              "Session not found. Make sure the broadcast is active.";
          } else if (error.message.includes("No active broadcast")) {
            errorMessage =
              "No active broadcast for this code. Please check the session code.";
          } else {
            errorMessage = error.message;
          }
        }

        setConnectionError({
          message: errorMessage,
          code: "CONNECTION_FAILED",
          timestamp: new Date(),
        });

        // Clean up
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }

        throw error;
      }
    },
    [startStatsCollection, stopStatsCollection]
  );

  const disconnect = useCallback(() => {
    console.log("Disconnecting WebRTC connection");

    setIsConnected(false);
    stopStatsCollection();
    setConnectionError(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stopStatsCollection]);

  return {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats,
  };
};
