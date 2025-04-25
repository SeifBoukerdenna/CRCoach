/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Interface for performance statistics
 */
export interface PerformanceStats {
  /** Frames per second (calculated) */
  fps: number;
  /** Memory usage in MB */
  memory?: number;
  /** Render time in ms */
  renderTime: number;
  /** Network latency in ms */
  networkLatency?: number;
}

/**
 * NetworkInformation interface for typing navigator.connection
 */
interface NetworkInformation {
  rtt?: number;
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

/**
 * Hook options for useStatsMonitor
 */
export interface UseStatsMonitorOptions {
  /** Whether to enable memory monitoring */
  monitorMemory?: boolean;
  /** Whether to start monitoring immediately */
  autoStart?: boolean;
  /** Update interval in milliseconds */
  interval?: number;
  /** Callback when stats are updated */
  onUpdate?: (stats: PerformanceStats) => void;
}

/**
 * Hook for monitoring app performance statistics
 *
 * @param options Configuration options
 * @returns Performance monitoring state and controls
 */
export function useStatsMonitor(options: UseStatsMonitorOptions = {}) {
  // Set up options with defaults
  const {
    monitorMemory = false,
    autoStart = false,
    interval = 1000,
    onUpdate,
  } = options;

  // State for tracking whether monitoring is active
  const [isMonitoring, setIsMonitoring] = useState(autoStart);

  // Performance statistics state
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    memory: undefined,
    renderTime: 0,
    networkLatency: undefined,
  });

  // Refs for tracking FPS calculation
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());
  const intervalRef = useRef<number | null>(null);

  // Track render times
  const renderStartTimeRef = useRef(performance.now());

  // Start monitoring
  const start = useCallback(() => {
    if (!isMonitoring) {
      setIsMonitoring(true);
    }
  }, [isMonitoring]);

  // Stop monitoring
  const stop = useCallback(() => {
    if (isMonitoring) {
      setIsMonitoring(false);
    }
  }, [isMonitoring]);

  // Toggle monitoring
  const toggle = useCallback(() => {
    setIsMonitoring((prev) => !prev);
  }, []);

  // Function to update frame count for FPS calculation
  const countFrame = useCallback(() => {
    frameCountRef.current++;
    requestAnimationFrame(countFrame);
  }, []);

  // Start frame counting on mount
  useEffect(() => {
    // Start counting frames
    const frameId = requestAnimationFrame(countFrame);

    // Start render time tracking
    renderStartTimeRef.current = performance.now();

    // Clean up on unmount
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [countFrame]);

  // Calculate stats on interval when monitoring is active
  useEffect(() => {
    if (!isMonitoring) {
      return;
    }

    // Calculate stats on interval
    const updateStats = () => {
      // Calculate FPS
      const now = performance.now();
      const elapsed = now - lastFrameTimeRef.current;
      const fps = Math.round((frameCountRef.current / elapsed) * 1000);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;

      // Calculate render time
      const renderTime = performance.now() - renderStartTimeRef.current;
      renderStartTimeRef.current = performance.now();

      // Get memory usage if available and requested
      let memory: number | undefined = undefined;
      if (monitorMemory && (performance as any).memory) {
        const memoryInfo = (performance as any).memory;
        memory = Math.round(memoryInfo.usedJSHeapSize / (1024 * 1024));
      }

      // Get network latency if available
      let networkLatency: number | undefined = undefined;

      // Safely check for navigator.connection
      const nav = navigator as Navigator & { connection?: NetworkInformation };
      if (
        nav.connection &&
        typeof nav.connection === "object" &&
        "rtt" in nav.connection
      ) {
        networkLatency = nav.connection.rtt;
      }

      // Update stats state
      const newStats: PerformanceStats = {
        fps,
        memory,
        renderTime,
        networkLatency,
      };

      setStats(newStats);

      // Call onUpdate callback if provided
      if (onUpdate) {
        onUpdate(newStats);
      }
    };

    // Set up interval
    intervalRef.current = window.setInterval(updateStats, interval);

    // Clean up interval on unmount or when monitoring stops
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMonitoring, interval, monitorMemory, onUpdate]);

  return {
    isMonitoring,
    stats,
    start,
    stop,
    toggle,
  };
}

export default useStatsMonitor;
