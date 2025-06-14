// royal_trainer_client/src/hooks/useInference.ts - Fixed WebSocket handling

import { useState, useEffect, useRef, useCallback } from "react";
import type { InferenceData, InferenceStats } from "../types";

export const useInference = (sessionCode: string, isConnected: boolean) => {
  const [inferenceData, setInferenceData] = useState<InferenceData | null>(
    null
  );
  const [isInferenceActive, setIsInferenceActive] = useState(false);
  const [inferenceStats, setInferenceStats] = useState<InferenceStats>({
    avgInferenceTime: 0,
    detectionsPerSecond: 0,
    totalDetections: 0,
    accuracy: 0,
  });
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastInferenceTime, setLastInferenceTime] = useState<number>(0);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isUnmountingRef = useRef(false);
  const statsHistoryRef = useRef<{
    inferenceTimes: number[];
    detectionCounts: number[];
    timestamps: number[];
    frameCount: number;
  }>({
    inferenceTimes: [],
    detectionCounts: [],
    timestamps: [],
    frameCount: 0,
  });

  const updateStats = useCallback((newInferenceData: InferenceData) => {
    const now = Date.now();
    const history = statsHistoryRef.current;

    history.inferenceTimes.push(newInferenceData.inference_time);
    history.detectionCounts.push(newInferenceData.detections.length);
    history.timestamps.push(now);
    history.frameCount++;

    const maxHistory = 200;
    if (history.inferenceTimes.length > maxHistory) {
      history.inferenceTimes = history.inferenceTimes.slice(-maxHistory);
      history.detectionCounts = history.detectionCounts.slice(-maxHistory);
      history.timestamps = history.timestamps.slice(-maxHistory);
    }

    const avgInferenceTime =
      history.inferenceTimes.length > 0
        ? history.inferenceTimes.reduce((a, b) => a + b, 0) /
          history.inferenceTimes.length
        : 0;

    const fiveSecondsAgo = now - 5000;
    const recentData = history.timestamps
      .map((timestamp, index) => ({
        timestamp,
        detections: history.detectionCounts[index],
      }))
      .filter((item) => item.timestamp > fiveSecondsAgo);

    const detectionsPerSecond =
      recentData.length > 0
        ? recentData.reduce((sum, item) => sum + item.detections, 0) / 5
        : 0;

    const totalDetections = history.detectionCounts.reduce((a, b) => a + b, 0);

    const framesWithDetections = history.detectionCounts.filter(
      (count) => count > 0
    ).length;
    const accuracy =
      history.detectionCounts.length > 0
        ? (framesWithDetections / history.detectionCounts.length) * 100
        : 0;

    const tenSecondsAgo = now - 10000;
    const recentInferences = history.timestamps.filter(
      (t) => t > tenSecondsAgo
    ).length;
    const inferenceFPS = recentInferences / 10;

    setInferenceStats({
      avgInferenceTime: Math.round(avgInferenceTime * 100) / 100,
      detectionsPerSecond: Math.round(detectionsPerSecond * 10) / 10,
      totalDetections,
      accuracy: Math.round(accuracy),
      inferenceFPS: Math.round(inferenceFPS * 10) / 10,
    });

    setLastInferenceTime(now);
  }, []);

  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent close handler from firing
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(
          1000,
          isUnmountingRef.current ? "Component unmounting" : "Reconnecting"
        );
      }
      wsRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    setIsWebSocketConnected(false);
  }, []);

  const connectInferenceWebSocket = useCallback(() => {
    if (
      !sessionCode ||
      !isConnected ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      isUnmountingRef.current
    ) {
      return;
    }

    const setupWebSocket = async () => {
      try {
        cleanupWebSocket();

        // Import API config
        const { getWebSocketUrl } = await import("../config/api");
        const wsUrl = getWebSocketUrl(`api/inference/ws/${sessionCode}`);
        console.log("🔌 Connecting to inference WebSocket:", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmountingRef.current) {
            ws.close(1000, "Component unmounting");
            return;
          }

          console.log("✅ Inference WebSocket connected successfully");
          setIsWebSocketConnected(true);
          setConnectionAttempts(0);

          // Stop polling since WebSocket is connected
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            console.log("🛑 Stopped HTTP polling - WebSocket active");
          }

          // Start ping interval
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && !isUnmountingRef.current) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 30000);

          ws.send(JSON.stringify({ type: "status_request" }));
        };

        ws.onmessage = (event) => {
          if (isUnmountingRef.current) return;

          try {
            const data = JSON.parse(event.data);

            if (data.type === "inference_update" && data.data) {
              setInferenceData(data.data);
              updateStats(data.data);
              setIsInferenceActive(true);
              console.log("📊 Received inference update via WebSocket");
            } else if (data.type === "status_update") {
              setIsInferenceActive(data.inference_enabled);
            } else if (data.type === "pong") {
              console.log("🏓 WebSocket pong received");
            } else if (data.type === "error") {
              console.error("❌ WebSocket error from server:", data.message);
            }
          } catch (error) {
            console.warn("⚠️ Failed to parse inference WebSocket data:", error);
          }
        };

        ws.onclose = (event) => {
          console.log(
            `🔌❌ Inference WebSocket closed: ${event.code} ${event.reason}`
          );
          setIsWebSocketConnected(false);
          wsRef.current = null;

          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }

          // Only attempt reconnect if not unmounting and still connected to main session
          if (!isUnmountingRef.current && isConnected && event.code !== 1000) {
            if (connectionAttempts < 3) {
              const backoffDelay = Math.min(
                1000 * Math.pow(2, connectionAttempts),
                10000
              );
              console.log(
                `🔄 Attempting WebSocket reconnect in ${backoffDelay}ms (attempt ${
                  connectionAttempts + 1
                })`
              );

              reconnectTimeoutRef.current = setTimeout(() => {
                if (!isUnmountingRef.current) {
                  setConnectionAttempts((prev) => prev + 1);
                  connectInferenceWebSocket();
                }
              }, backoffDelay);
            } else {
              console.log(
                "❌ Max reconnection attempts reached, falling back to HTTP polling"
              );
              startPollingFallback();
            }
          }
        };

        ws.onerror = (error) => {
          console.error("❌ Inference WebSocket error:", error);
          setIsWebSocketConnected(false);
        };
      } catch (error) {
        console.error("❌ Failed to create inference WebSocket:", error);
        setIsWebSocketConnected(false);
        if (!isUnmountingRef.current) {
          startPollingFallback();
        }
      }
    };

    setupWebSocket();
  }, [
    sessionCode,
    isConnected,
    updateStats,
    connectionAttempts,
    cleanupWebSocket,
  ]);

  const startPollingFallback = useCallback(() => {
    if (
      pollIntervalRef.current ||
      isWebSocketConnected ||
      isUnmountingRef.current
    ) {
      return;
    }

    console.log("🔄 Starting HTTP polling fallback for inference data");

    const pollInference = async () => {
      if (
        !sessionCode ||
        !isConnected ||
        isWebSocketConnected ||
        isUnmountingRef.current
      ) {
        return;
      }

      try {
        const { getApiUrl } = await import("../config/api");
        const response = await fetch(
          getApiUrl(`api/inference/${sessionCode}/status`),
          {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(5000),
          }
        );

        if (response.ok) {
          const statusData = await response.json();
          setIsInferenceActive(statusData.inference_enabled);

          // Only poll for data if inference is enabled
          if (statusData.inference_enabled) {
            try {
              const dataResponse = await fetch(
                getApiUrl(`/api/inference/${sessionCode}`),
                {
                  method: "GET",
                  headers: { Accept: "application/json" },
                  signal: AbortSignal.timeout(5000),
                }
              );

              if (dataResponse.ok) {
                const inferenceData = await dataResponse.json();
                setInferenceData(inferenceData);
                updateStats(inferenceData);
                console.log("📊 Received inference data via HTTP polling");
              }
            } catch (dataError) {
              // 404 is normal when no recent data exists
              if (
                dataError instanceof Error &&
                !dataError.message.includes("404")
              ) {
                console.warn(
                  "⚠️ Failed to fetch inference data:",
                  dataError.message
                );
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.warn("⚠️ Inference status polling error:", error.message);
        }
      }
    };

    pollInference(); // Initial poll
    pollIntervalRef.current = setInterval(pollInference, 3000); // Poll every 3 seconds
  }, [sessionCode, isConnected, isWebSocketConnected, updateStats]);

  const checkStaleData = useCallback(() => {
    const now = Date.now();
    const timeSinceLastInference = now - lastInferenceTime;

    if (timeSinceLastInference > 10000 && isInferenceActive) {
      console.log("⚠️ Inference data is stale, updating status");
      setIsInferenceActive(false);
    }
  }, [lastInferenceTime, isInferenceActive]);

  // Check for stale inference data
  useEffect(() => {
    const checkInterval = setInterval(checkStaleData, 5000);
    return () => clearInterval(checkInterval);
  }, [checkStaleData]);

  // Main connection effect - prioritize WebSocket
  useEffect(() => {
    isUnmountingRef.current = false;

    if (isConnected && sessionCode) {
      console.log("🚀 Starting inference monitoring for session:", sessionCode);

      // Reset state for new session
      setInferenceData(null);
      setIsInferenceActive(false);
      setConnectionAttempts(0);
      setIsWebSocketConnected(false);
      statsHistoryRef.current = {
        inferenceTimes: [],
        detectionCounts: [],
        timestamps: [],
        frameCount: 0,
      };

      // Always try WebSocket first
      connectInferenceWebSocket();
    } else {
      console.log("🧹 Cleaning up inference monitoring");

      setInferenceData(null);
      setIsInferenceActive(false);
      setConnectionAttempts(0);
      setIsWebSocketConnected(false);
      setInferenceStats({
        avgInferenceTime: 0,
        detectionsPerSecond: 0,
        totalDetections: 0,
        accuracy: 0,
      });

      statsHistoryRef.current = {
        inferenceTimes: [],
        detectionCounts: [],
        timestamps: [],
        frameCount: 0,
      };

      cleanupWebSocket();

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  }, [isConnected, sessionCode, connectInferenceWebSocket, cleanupWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountingRef.current = true;

      cleanupWebSocket();

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [cleanupWebSocket]);

  return {
    inferenceData,
    isInferenceActive,
    inferenceStats: {
      ...inferenceStats,
      connectionAttempts,
      isWebSocketConnected,
      frameCount: statsHistoryRef.current.frameCount,
    },
  };
};
