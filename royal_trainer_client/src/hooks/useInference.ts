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

  const wsRef = useRef<WebSocket | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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

    // Add new data point
    history.inferenceTimes.push(newInferenceData.inference_time);
    history.detectionCounts.push(newInferenceData.detections.length);
    history.timestamps.push(now);
    history.frameCount++;

    // Keep only last 200 data points (about 10 seconds at 20fps)
    const maxHistory = 200;
    if (history.inferenceTimes.length > maxHistory) {
      history.inferenceTimes = history.inferenceTimes.slice(-maxHistory);
      history.detectionCounts = history.detectionCounts.slice(-maxHistory);
      history.timestamps = history.timestamps.slice(-maxHistory);
    }

    // Calculate average inference time
    const avgInferenceTime =
      history.inferenceTimes.length > 0
        ? history.inferenceTimes.reduce((a, b) => a + b, 0) /
          history.inferenceTimes.length
        : 0;

    // Calculate detections per second over last 5 seconds
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

    // Calculate accuracy (percentage of frames with detections)
    const framesWithDetections = history.detectionCounts.filter(
      (count) => count > 0
    ).length;
    const accuracy =
      history.detectionCounts.length > 0
        ? (framesWithDetections / history.detectionCounts.length) * 100
        : 0;

    // Calculate inference FPS
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

  const connectWebSocket = useCallback(() => {
    if (
      !sessionCode ||
      !isConnected ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/inference/ws/${sessionCode}`;
      console.log("Connecting to inference WebSocket:", wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Inference WebSocket connected successfully");
        setIsInferenceActive(true);
        setConnectionAttempts(0);

        // Send initial ping to confirm connection
        ws.send(JSON.stringify({ type: "ping" }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "inference_update" && data.data) {
            setInferenceData(data.data);
            updateStats(data.data);
            setIsInferenceActive(true);
          } else if (data.type === "pong") {
            // Connection confirmed
            console.log("WebSocket connection confirmed");
          } else if (data.type === "no_data") {
            // Server has no inference data yet, but connection is working
            setIsInferenceActive(true);
          } else if (data.type === "error") {
            console.error("WebSocket error from server:", data.message);
          }
        } catch (error) {
          console.warn("Failed to parse inference WebSocket data:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("Inference WebSocket closed:", event.code, event.reason);
        setIsInferenceActive(false);
        wsRef.current = null;

        // Attempt to reconnect if it wasn't a clean close and we're still connected
        if (isConnected && event.code !== 1000 && connectionAttempts < 5) {
          const backoffDelay = Math.min(
            1000 * Math.pow(2, connectionAttempts),
            10000
          );
          console.log(
            `Attempting WebSocket reconnect in ${backoffDelay}ms (attempt ${
              connectionAttempts + 1
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts((prev) => prev + 1);
            connectWebSocket();
          }, backoffDelay);
        }
      };

      ws.onerror = (error) => {
        console.error("Inference WebSocket error:", error);
        setIsInferenceActive(false);
      };
    } catch (error) {
      console.error("Failed to create inference WebSocket:", error);
      setIsInferenceActive(false);
    }
  }, [sessionCode, isConnected, updateStats, connectionAttempts]);

  const pollInference = useCallback(async () => {
    if (!sessionCode || !isConnected) return;

    try {
      const response = await fetch(`/api/inference/${sessionCode}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data: InferenceData = await response.json();
        setInferenceData(data);
        updateStats(data);
        setIsInferenceActive(true);
      } else if (response.status === 404) {
        // No inference data available yet, but that's okay
        setInferenceData(null);
        setIsInferenceActive(false);
      } else if (response.status === 501) {
        // Inference service not available
        console.warn("Inference service not available on server");
        setIsInferenceActive(false);
      } else {
        console.warn(`Inference polling failed: ${response.status}`);
        setIsInferenceActive(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.warn("Inference polling error:", error.message);
      }
      setIsInferenceActive(false);
    }
  }, [sessionCode, isConnected, updateStats]);

  // Check for stale inference data
  useEffect(() => {
    const checkStaleData = setInterval(() => {
      const now = Date.now();
      const timeSinceLastInference = now - lastInferenceTime;

      // If no inference data for 5 seconds, mark as inactive
      if (timeSinceLastInference > 5000 && isInferenceActive) {
        console.log("Inference data is stale, marking as inactive");
        setIsInferenceActive(false);
      }
    }, 1000);

    return () => clearInterval(checkStaleData);
  }, [lastInferenceTime, isInferenceActive]);

  // Main connection effect
  useEffect(() => {
    if (isConnected && sessionCode) {
      console.log("Starting inference monitoring for session:", sessionCode);

      // Reset stats for new session
      setInferenceData(null);
      setIsInferenceActive(false);
      setConnectionAttempts(0);
      statsHistoryRef.current = {
        inferenceTimes: [],
        detectionCounts: [],
        timestamps: [],
        frameCount: 0,
      };

      // Try WebSocket first
      connectWebSocket();

      // Start polling as backup after a delay
      const fallbackTimer = setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          console.log(
            "WebSocket unavailable, starting inference polling fallback"
          );
          pollIntervalRef.current = setInterval(pollInference, 200); // 5fps polling as backup
        }
      }, 3000);

      return () => {
        clearTimeout(fallbackTimer);

        // Cleanup WebSocket
        if (wsRef.current) {
          wsRef.current.close(1000, "Component unmounting");
          wsRef.current = null;
        }

        // Cleanup polling
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }

        // Cleanup reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    } else {
      // Cleanup when disconnected
      console.log("Cleaning up inference monitoring");

      setInferenceData(null);
      setIsInferenceActive(false);
      setConnectionAttempts(0);
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

      if (wsRef.current) {
        wsRef.current.close(1000, "Session disconnected");
        wsRef.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  }, [isConnected, sessionCode, connectWebSocket, pollInference]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    inferenceData,
    isInferenceActive,
    inferenceStats: {
      ...inferenceStats,
      connectionAttempts,
      isWebSocketConnected: wsRef.current?.readyState === WebSocket.OPEN,
      frameCount: statsHistoryRef.current.frameCount,
    },
  };
};
