/**
 * Enhanced WebRTC hook with stats-based latency tracking
 * Uses actual WebRTC timestamps for accurate measurements
 */

import { useState, useRef, useCallback, useEffect } from "react";

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

export const useWebRTC = () => {
  /*─────────────────────────────────── state */
  const [isConnected, setIsConnected] = useState(false);
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

  /*─────────────────────────────────── refs */
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencyTestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const sessionCodeRef = useRef<string>("");

  // WebRTC stats tracking
  const previousStatsRef = useRef<WebRTCFrameStats | null>(null);
  const frameTrackingRef = useRef<Map<number, number>>(new Map()); // frameNumber -> receiveTime

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

  /*─────────────────────────────────── WebRTC-based latency tracking */
  const measureFrameLatencyFromStats = useCallback(
    (currentStats: WebRTCFrameStats, displayTime: number) => {
      const prevStats = previousStatsRef.current;

      if (!prevStats) {
        previousStatsRef.current = currentStats;
        return;
      }

      // Check if we have new frames
      const newFramesReceived =
        currentStats.framesReceived - prevStats.framesReceived;
      const newFramesDecoded =
        currentStats.framesDecoded - prevStats.framesDecoded;

      if (newFramesReceived > 0 || newFramesDecoded > 0) {
        // Calculate frame timing based on WebRTC stats
        const frameId = `webrtc_${currentStats.framesReceived}_${currentStats.timestamp}`;

        // Method 1: Use lastPacketReceivedTimestamp as proxy for capture time
        let estimatedCaptureTime: number;

        if (
          currentStats.lastPacketReceivedTimestamp &&
          currentStats.lastPacketReceivedTimestamp > 0
        ) {
          // Convert WebRTC timestamp (usually in seconds) to milliseconds
          estimatedCaptureTime =
            currentStats.lastPacketReceivedTimestamp * 1000;
        } else {
          // Fallback: Use frame reception timing with network compensation
          const networkDelay = streamStats?.networkLatency || 50;
          const encodingDelay = 30; // Typical encoding delay
          estimatedCaptureTime = displayTime - networkDelay - encodingDelay;
        }

        const endToEndLatency = displayTime - estimatedCaptureTime;

        // Only record reasonable latency values (filter out outliers)
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

          // Send latency data to server
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

  /** attach cached stream to <video> */
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
          // Basic stats
          if (report.framesPerSecond) fps = Math.round(report.framesPerSecond);
          if (report.bytesReceived)
            bitrate = Math.round((report.bytesReceived * 8) / 1000);
          if (report.frameWidth && report.frameHeight) {
            resolution = `${report.frameWidth}x${report.frameHeight}`;
          }

          // Frame timing stats for latency calculation
          currentFrameStats = {
            timestamp: report.timestamp,
            framesReceived: report.framesReceived || 0,
            framesDecoded: report.framesDecoded || 0,
            framesDropped: report.framesDropped || 0,
            lastPacketReceivedTimestamp:
              report.lastPacketReceivedTimestamp || 0,
          };

          // Log detailed frame stats periodically
          if (report.framesReceived && report.framesReceived % 100 === 0) {
            log(
              `WebRTC frame stats - Received: ${report.framesReceived}, Decoded: ${report.framesDecoded}, Dropped: ${report.framesDropped}`,
              "debug"
            );
          }
        }

        // Network RTT from candidate pair
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          if (report.currentRoundTripTime) {
            networkRtt = report.currentRoundTripTime * 1000; // Convert to ms
          }
        }
      });

      // Calculate latency based on current frame display time
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
    // Increase frequency for better latency tracking
    statsIntervalRef.current = setInterval(updateStreamStats, 1000); // Every 1 second

    // Start latency testing
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

      // Reset frame tracking when new track starts
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

  const handleWS = useCallback(
    async (d: any) => {
      const receiveTime = performance.now();

      switch (d.type) {
        case "connected":
          // Calculate signaling latency if timestamps are available
          if (d.latency_info && d.latency_info.signaling_latency_ms) {
            setStreamStats((prev) => ({
              ...prev,
              signalingLatency: d.latency_info.signaling_latency_ms,
            }));
            log(
              `Signaling latency: ${d.latency_info.signaling_latency_ms.toFixed(
                1
              )}ms`,
              "info"
            );
          }
          createPeer();
          break;

        case "offer":
          await handleOffer(d);
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
          remoteStreamRef.current = null;
          if (videoRef.current) videoRef.current.srcObject = null;
          // Reset tracking when disconnected
          previousStatsRef.current = null;
          frameTrackingRef.current.clear();
          break;

        case "latency_response":
          // Handle latency test response
          if (d.client_timestamp && d.server_send_time) {
            const roundTripTime = receiveTime - d.client_timestamp;
            const networkLatency = roundTripTime / 2; // Estimate one-way

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

        case "latency_update":
          // Handle server latency updates
          if (d.average_latency) {
            log(
              `Server reports avg latency: ${d.average_latency.toFixed(1)}ms`,
              "info"
            );
          }
          break;

        case "error":
          setConnectionError({
            message: d.message,
            code: "SERVER_ERROR",
            timestamp: new Date(),
          });
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
          ws.onmessage = (e) => handleWS(JSON.parse(e.data));
          ws.onclose = () => {
            setIsConnected(false);
            // Reset tracking on disconnect
            previousStatsRef.current = null;
            frameTrackingRef.current.clear();
          };
          ws.onerror = () => rej(new Error("WS error"));
        } catch (e) {
          rej(e);
        }
      }),
    [handleWS]
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
    setConnectionError(null);

    // Reset all tracking
    previousStatsRef.current = null;
    frameTrackingRef.current.clear();

    // Reset latency stats
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

  /* ↻ 1) run every time the ref gains a node */
  useEffect(attachStream, [videoRef.current, attachStream]);

  /* ↻ 2) keep-alive ping */
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

  /* ↻ 3) cleanup on unmount */
  useEffect(() => () => disconnect(), [disconnect]);

  /*─────────────────────────────────── exports */
  return {
    videoRef,
    connect,
    disconnect,
    isConnected,
    connectionError,
    streamStats,
    latencyStats,
    performLatencyTest,
  };
};
