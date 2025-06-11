// royal_trainer_client/src/hooks/useWebRTCWithFrameCapture.ts

import { useState, useRef, useCallback, useEffect } from "react";
import { useVideoFrameCapture } from "./useVideoFrameCapture";

interface StreamStats {
  fps?: number;
  bitrate?: number;
  resolution?: string;
  latency?: number;
  endToEndLatency?: number;
  signalingLatency?: number;
  networkLatency?: number;
}

interface ConnectionError {
  message: string;
  code?: string;
  timestamp: Date;
}

interface LatencyMeasurement {
  frameId: string;
  captureTimestamp: number;
  displayTimestamp: number;
  endToEndLatency: number;
  signalingLatency?: number;
  networkLatency?: number;
}

interface LatencyStats {
  current: number;
  average: number;
  min: number;
  max: number;
  recent: number[];
  measurements: LatencyMeasurement[];
}

interface WebRTCFrameStats {
  timestamp: number;
  framesReceived: number;
  framesDecoded: number;
  framesDropped: number;
  lastPacketReceivedTimestamp: number;
}

export const useWebRTCWithFrameCapture = () => {
  /*─────────────────────────────────── state */
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] =
    useState<ConnectionError | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  const [latencyStats, setLatencyStats] = useState<LatencyStats>({
    current: 0,
    average: 0,
    min: Infinity,
    max: 0,
    recent: [],
    measurements: [],
  });
  const [isInferenceEnabled, setIsInferenceEnabled] = useState(false);

  /*─────────────────────────────────── refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencyTestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const sessionCodeRef = useRef<string>("");
  const connectionIdRef = useRef<string>("");

  // WebRTC stats tracking
  const previousStatsRef = useRef<WebRTCFrameStats | null>(null);
  const frameTrackingRef = useRef<Map<number, number>>(new Map());

  /*─────────────────────────────────── frame capture integration */
  const {
    startCapture: startFrameCapture,
    stopCapture: stopFrameCapture,
    captureManualFrame,
    getFrameStats,
    isCapturing,
  } = useVideoFrameCapture(
    videoRef,
    sessionCodeRef.current,
    isInferenceEnabled,
    webSocketRef,
    {
      fps: 5, // 5 FPS for inference
      quality: 0.8,
      maxWidth: 640,
      maxHeight: 480,
    }
  );

  /*─────────────────────────────────── helpers */
  const log = (msg: string, t: string = "info") => {
    const ts = new Date().toLocaleTimeString();
    const emoji =
      t === "error"
        ? "❌"
        : t === "success"
        ? "✅"
        : t === "debug"
        ? "🔍"
        : "ℹ️";
    console.log(`[${ts}] ${emoji} ${msg}`);
  };

  /*─────────────────────────────────── inference control */
  const toggleInference = useCallback(async (enabled: boolean) => {
    if (!sessionCodeRef.current) {
      log("No session code available", "error");
      return false;
    }

    try {
      const response = await fetch(
        `/api/inference/${sessionCodeRef.current}/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setIsInferenceEnabled(result.inference_enabled);

      log(
        `Inference ${enabled ? "enabled" : "disabled"} for session ${
          sessionCodeRef.current
        }`,
        "success"
      );
      return true;
    } catch (error) {
      log(`Failed to toggle inference: ${error}`, "error");
      return false;
    }
  }, []);

  /*─────────────────────────────────── WebRTC-based latency tracking */
  const measureFrameLatencyFromStats = useCallback(
    (currentStats: WebRTCFrameStats, displayTime: number) => {
      const prevStats = previousStatsRef.current;

      if (!prevStats) {
        previousStatsRef.current = currentStats;
        return;
      }

      const newFramesReceived =
        currentStats.framesReceived - prevStats.framesReceived;
      const newFramesDecoded =
        currentStats.framesDecoded - prevStats.framesDecoded;

      if (newFramesReceived > 0 || newFramesDecoded > 0) {
        const frameId = `webrtc_${currentStats.framesReceived}_${currentStats.timestamp}`;

        let estimatedCaptureTime: number;

        if (
          currentStats.lastPacketReceivedTimestamp &&
          currentStats.lastPacketReceivedTimestamp > 0
        ) {
          estimatedCaptureTime =
            currentStats.lastPacketReceivedTimestamp * 1000;
        } else {
          const networkDelay = streamStats?.networkLatency || 50;
          const encodingDelay = 30;
          estimatedCaptureTime = displayTime - networkDelay - encodingDelay;
        }

        const endToEndLatency = displayTime - estimatedCaptureTime;

        if (endToEndLatency > 0 && endToEndLatency < 2000) {
          const measurement: LatencyMeasurement = {
            frameId,
            captureTimestamp: estimatedCaptureTime,
            displayTimestamp: displayTime,
            endToEndLatency,
            signalingLatency: streamStats?.signalingLatency,
            networkLatency: streamStats?.networkLatency,
          };

          setLatencyStats((prev) => {
            const newMeasurements = [...prev.measurements, measurement].slice(
              -100
            );
            const recentLatencies = newMeasurements
              .slice(-20)
              .map((m) => m.endToEndLatency);

            const average =
              recentLatencies.length > 0
                ? recentLatencies.reduce((a, b) => a + b, 0) /
                  recentLatencies.length
                : 0;
            const min =
              recentLatencies.length > 0
                ? Math.min(...recentLatencies)
                : Infinity;
            const max =
              recentLatencies.length > 0 ? Math.max(...recentLatencies) : 0;

            return {
              current: endToEndLatency,
              average,
              min,
              max,
              recent: recentLatencies,
              measurements: newMeasurements,
            };
          });

          if (webSocketRef.current?.readyState === WebSocket.OPEN) {
            webSocketRef.current.send(
              JSON.stringify({
                type: "frame_timing",
                frameId,
                captureTimestamp: estimatedCaptureTime,
                displayTimestamp: displayTime,
                endToEndLatency,
                sessionCode: sessionCodeRef.current,
                method: "webrtc_stats",
                framesReceived: currentStats.framesReceived,
                framesDecoded: currentStats.framesDecoded,
                timestamp: performance.now(),
              })
            );
          }

          log(
            `WebRTC frame latency: ${endToEndLatency.toFixed(1)}ms (frames: ${
              currentStats.framesReceived
            })`,
            "debug"
          );
        }
      }

      previousStatsRef.current = currentStats;
    },
    [streamStats]
  );

  const performLatencyTest = useCallback(() => {
    if (webSocketRef.current?.readyState !== WebSocket.OPEN) return;

    const testStart = performance.now();
    webSocketRef.current.send(
      JSON.stringify({
        type: "latency_test",
        timestamp: testStart,
        sessionCode: sessionCodeRef.current,
      })
    );
  }, []);

  const attachStream = useCallback(() => {
    if (videoRef.current && remoteStreamRef.current) {
      if (videoRef.current.srcObject !== remoteStreamRef.current) {
        videoRef.current.srcObject = remoteStreamRef.current;
        videoRef.current.play().catch(() => {
          /* safari autoplay */
        });
        log("Remote stream attached to <video>", "success");
      }
    }
  }, []);

  /*─────────────────────────────────── Enhanced stats collection */
  const updateStreamStats = useCallback(async () => {
    if (!peerConnectionRef.current) return;

    try {
      const stats = await peerConnectionRef.current.getStats();
      let fps = 0;
      let bitrate = 0;
      let resolution = "";
      let networkRtt = 0;
      let currentFrameStats: WebRTCFrameStats | null = null;

      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.mediaType === "video") {
          if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
          if (report.bytesReceived)
            bitrate = Math.round((report.bytesReceived * 8) / 1000);
          if (report.frameWidth && report.frameHeight) {
            resolution = `${report.frameWidth}x${report.frameHeight}`;
          }

          currentFrameStats = {
            timestamp: report.timestamp,
            framesReceived: report.framesReceived || 0,
            framesDecoded: report.framesDecoded || 0,
            framesDropped: report.framesDropped || 0,
            lastPacketReceivedTimestamp:
              report.lastPacketReceivedTimestamp || 0,
          };

          if (report.framesReceived && report.framesReceived % 100 === 0) {
            log(
              `WebRTC frame stats - Received: ${report.framesReceived}, Decoded: ${report.framesDecoded}, Dropped: ${report.framesDropped}`,
              "debug"
            );
          }
        }

        if (report.type === "candidate-pair" && report.state === "succeeded") {
          if (report.currentRoundTripTime) {
            networkRtt = report.currentRoundTripTime * 1000;
          }
        }
      });

      if (currentFrameStats) {
        const displayTime = performance.now();
        measureFrameLatencyFromStats(currentFrameStats, displayTime);
      }

      setStreamStats((prev) => ({
        fps,
        bitrate,
        resolution,
        latency: latencyStats.current,
        endToEndLatency: latencyStats.average,
        signalingLatency: prev?.signalingLatency || 0,
        networkLatency: networkRtt,
      }));
    } catch (e) {
      log("getStats failed: " + (e as Error).message, "error");
    }
  }, [latencyStats, measureFrameLatencyFromStats]);

  const startStatsLoop = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(updateStreamStats, 1000);

    if (latencyTestIntervalRef.current)
      clearInterval(latencyTestIntervalRef.current);
    latencyTestIntervalRef.current = setInterval(performLatencyTest, 5000);
  }, [updateStreamStats, performLatencyTest]);

  /*─────────────────────────────────── peer */
  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    peerConnectionRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && webSocketRef.current?.readyState === WebSocket.OPEN) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "ice",
            candidate: e.candidate.candidate,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
            sdpMid: e.candidate.sdpMid,
            sessionCode: sessionCodeRef.current,
            timestamp: performance.now(),
          })
        );
      }
    };

    pc.ontrack = (e) => {
      log("🎥 remote track received", "success");
      remoteStreamRef.current = e.streams[0];
      attachStream();
      startStatsLoop();

      previousStatsRef.current = null;
      frameTrackingRef.current.clear();
    };

    pc.oniceconnectionstatechange = () => {
      log(`ICE connection state: ${pc.iceConnectionState}`, "debug");
      if (["connected", "completed"].includes(pc.iceConnectionState)) {
        setIsConnected(true);
      }
      if (["failed", "disconnected"].includes(pc.iceConnectionState)) {
        setIsConnected(false);
      }
    };

    return pc;
  }, [attachStream, startStatsLoop]);

  /*─────────────────────────────────── WS msg */
  const handleOffer = useCallback(
    async (msg: any) => {
      if (!peerConnectionRef.current) createPeer();

      await peerConnectionRef.current!.setRemoteDescription({
        type: "offer",
        sdp: msg.sdp,
      });
      const answer = await peerConnectionRef.current!.createAnswer();
      await peerConnectionRef.current!.setLocalDescription(answer);

      webSocketRef.current?.send(
        JSON.stringify({
          type: "answer",
          sdp: answer.sdp,
          sessionCode: sessionCodeRef.current,
          timestamp: performance.now(),
        })
      );
    },
    [createPeer]
  );

  const handleWebSocketMessage = useCallback(
    async (d: any) => {
      const receiveTime = performance.now();

      switch (d.type) {
        case "connected":
          connectionIdRef.current = d.connectionId || "";
          setIsConnecting(false);
          log(
            `Connected as viewer with ID: ${connectionIdRef.current}`,
            "success"
          );
          log(`Session has ${d.viewerCount}/${d.maxViewers} viewers`);

          if (d.latency_info && d.latency_info.signaling_latency_ms) {
            setStreamStats((prev) => ({
              ...prev,
              signalingLatency: d.latency_info.signaling_latency_ms,
            }));
          }

          createPeer();
          break;

        case "offer":
          // Check if this offer is meant for us
          const targetViewerId = d.target_viewer_id || d.for_viewer;
          if (!targetViewerId || targetViewerId === connectionIdRef.current) {
            await handleOffer(d);
          } else {
            log(`Offer for different viewer: ${targetViewerId}`, "debug");
          }
          break;

        case "ice":
          if (peerConnectionRef.current && d.candidate) {
            peerConnectionRef.current
              .addIceCandidate(
                new RTCIceCandidate({
                  candidate: d.candidate,
                  sdpMLineIndex: d.sdpMLineIndex,
                  sdpMid: d.sdpMid,
                })
              )
              .catch((e) => log("ICE add failed: " + e, "error"));
          }
          break;

        case "broadcaster_disconnected":
          setIsConnected(false);
          setIsInferenceEnabled(false);
          remoteStreamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          previousStatsRef.current = null;
          frameTrackingRef.current.clear();
          break;

        case "latency_response":
          if (d.client_timestamp && d.server_send_time) {
            const roundTripTime = receiveTime - d.client_timestamp;
            const networkLatency = roundTripTime / 2;

            setStreamStats((prev) => ({
              ...prev,
              networkLatency,
            }));

            log(
              `Network latency: ${networkLatency.toFixed(
                1
              )}ms (RTT: ${roundTripTime.toFixed(1)}ms)`,
              "debug"
            );
          }
          break;

        case "error":
          log(`Server error: ${d.message}`, "error");
          setConnectionError({
            message: d.message,
            code: "SERVER_ERROR",
            timestamp: new Date(),
          });

          // Stop connecting state immediately on error
          setIsConnecting(false);
          break;

        default:
          log(`Unknown message type: ${d.type}`);
          break;
      }
    },
    [createPeer, handleOffer]
  );

  /*─────────────────────────────────── connect */
  const connect = useCallback(
    (code: string) =>
      new Promise<void>((res, rej) => {
        try {
          sessionCodeRef.current = code;
          setIsConnecting(true);
          setConnectionError(null);

          const proto = location.protocol === "https:" ? "wss:" : "ws:";
          const ws = new WebSocket(`${proto}//${location.host}/ws/${code}`);
          webSocketRef.current = ws;

          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                type: "connect",
                role: "viewer",
                sessionCode: code,
                timestamp: performance.now(),
              })
            );
            res();
          };
          ws.onmessage = (e) => handleWebSocketMessage(JSON.parse(e.data));
          ws.onclose = () => {
            setIsConnected(false);
            setIsConnecting(false);
            setIsInferenceEnabled(false);
            previousStatsRef.current = null;
            frameTrackingRef.current.clear();
          };
          ws.onerror = () => {
            setIsConnecting(false);
            rej(new Error("WS error"));
          };
        } catch (e) {
          setIsConnecting(false);
          rej(e);
        }
      }),
    [handleWebSocketMessage]
  );

  const disconnect = useCallback(() => {
    webSocketRef.current?.close(1000, "manual");
    peerConnectionRef.current?.close();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    if (latencyTestIntervalRef.current)
      clearInterval(latencyTestIntervalRef.current);

    remoteStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsConnected(false);
    setIsConnecting(false);
    setIsInferenceEnabled(false);
    setConnectionError(null);

    previousStatsRef.current = null;
    frameTrackingRef.current.clear();

    setLatencyStats({
      current: 0,
      average: 0,
      min: Infinity,
      max: 0,
      recent: [],
      measurements: [],
    });
  }, []);

  /*─────────────────────────────────── side-effects */

  useEffect(attachStream, [videoRef.current, attachStream]);

  useEffect(() => {
    const id = setInterval(() => {
      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        webSocketRef.current.send(
          JSON.stringify({
            type: "ping",
            timestamp: performance.now(),
          })
        );
      }
    }, 25000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => disconnect(), [disconnect]);

  /*─────────────────────────────────── exports */
  return {
    videoRef,
    connect,
    disconnect,
    isConnected,
    isConnecting,
    connectionError,
    streamStats,
    latencyStats,
    performLatencyTest,

    // Inference controls
    isInferenceEnabled,
    toggleInference,

    // Frame capture controls
    captureManualFrame,
    getFrameStats,
    isCapturing,
  };
};
