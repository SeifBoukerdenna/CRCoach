/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from "react";

interface ServerHealth {
  server: {
    health: "excellent" | "good" | "fair" | "poor";
    uptime_seconds: number;
    version: string;
  };
  performance: {
    cpu_usage: number;
    memory_usage: number;
    active_sessions: number;
    total_sessions: number;
  };
  statistics: {
    total_frames_processed: number;
    total_frames_dropped: number;
    average_queue_size: number;
    total_queue_size: number;
  };
  sessions: Record<
    string,
    {
      health: string;
      frames_processed: number;
      frames_dropped: number;
      avg_processing_time: number;
      queue_size: number;
    }
  >;
  recommendations: string[];
}

interface SessionStats {
  session: {
    code: string;
    quality: string;
    custom_settings?: any;
    uptime_seconds: number;
    connection_health: string;
  };
  performance: {
    frames_received: number;
    frames_processed: number;
    frames_dropped: number;
    drop_rate_percent: number;
    avg_processing_time_ms: number;
    min_processing_time_ms: number;
    max_processing_time_ms: number;
  };
  drop_reasons: Record<string, number>;
  queue: {
    critical: number;
    high: number;
    normal: number;
    total: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
  };
  adaptive_quality: {
    adjustments_made: number;
    last_adjustment: number;
  };
}

interface HealthMetrics {
  connectionQuality: "excellent" | "good" | "fair" | "poor";
  serverHealth: ServerHealth | null;
  sessionStats: SessionStats | null;
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
  trends: {
    fps: number[];
    latency: number[];
    dropRate: number[];
    queueSize: number[];
    timestamps: number[];
  };
}

export const useHealthMonitoring = (
  sessionCode: string,
  isConnected: boolean
) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!sessionCode || !isConnected) return;

    try {
      // Use a simpler endpoint that exists
      const response = await fetch(`/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setHealthData({
          status: data.status || "unknown",
          timestamp: data.timestamp || Date.now(),
          active_sessions: data.active_sessions || 0,
          // Provide safe defaults for missing properties
          performance: {
            cpu_usage: 0,
            memory_usage: 0,
            ...data.performance,
          },
          statistics: {
            total_frames_processed: 0,
            total_frames_dropped: 0,
            ...data.statistics,
          },
        });
      }
    } catch (error) {
      console.warn("Health check failed:", error);
      // Set safe default values
      setHealthData({
        status: "error",
        timestamp: Date.now(),
        active_sessions: 0,
        performance: { cpu_usage: 0, memory_usage: 0 },
        statistics: { total_frames_processed: 0, total_frames_dropped: 0 },
      });
    }
  }, [sessionCode, isConnected]);

  useEffect(() => {
    if (isConnected && sessionCode) {
      setIsMonitoring(true);
      checkHealth();

      const interval = setInterval(checkHealth, 5000); // Check every 5 seconds
      return () => {
        clearInterval(interval);
        setIsMonitoring(false);
      };
    } else {
      setIsMonitoring(false);
      setHealthData(null);
    }
  }, [isConnected, sessionCode, checkHealth]);

  return { healthData, isMonitoring, checkHealth };
};
