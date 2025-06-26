// royal_trainer_client/src/hooks/useOptimizedWatermark.ts
import { useState, useEffect, useCallback, useRef } from "react";

export interface OptimizedWatermarkSettings {
  enabled: boolean;
  opacity: number;
  size: "small" | "medium" | "large";
  showDeviceInfo: boolean;
  showTimestamp: boolean;
  showFingerprint: boolean;
  performanceMode: "low" | "medium" | "high";
}

export interface DeviceFingerprint {
  id: string;
  browserInfo: string;
  screenInfo: string;
  timezone: string;
  timestamp: string;
}

export function useOptimizedWatermark() {
  const [watermarkSettings, setWatermarkSettings] =
    useState<OptimizedWatermarkSettings>({
      enabled: true, // Default enabled for production security
      opacity: 0.25, // Reduced from 0.3 for better performance
      size: "medium",
      showDeviceInfo: true,
      showTimestamp: true,
      showFingerprint: true,
      performanceMode: "medium", // Balanced performance
    });

  const [deviceInfo, setDeviceInfo] = useState<DeviceFingerprint | null>(null);
  const performanceObserverRef = useRef<PerformanceObserver | null>(null);
  const performanceMetricsRef = useRef({
    frameDrops: 0,
    avgFrameTime: 0,
    memoryUsage: 0,
  });

  // Generate optimized device fingerprint
  const generateDeviceFingerprint = useCallback((): DeviceFingerprint => {
    // Use cached result if recent
    const cached = sessionStorage.getItem("rt-device-fingerprint");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - new Date(parsed.timestamp).getTime();
        if (cacheAge < 300000) {
          // 5 minutes cache
          return parsed;
        }
      } catch (e) {
        // Invalid cache, regenerate
      }
    }

    // Generate minimal fingerprint for performance
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 100;
    canvas.height = 50;

    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("RT🛡️", 2, 2);
    }

    const canvasFingerprint = canvas.toDataURL().slice(-50); // Last 50 chars only

    const fingerprint: DeviceFingerprint = {
      id: btoa(canvasFingerprint + navigator.userAgent.slice(0, 20)).slice(
        0,
        16
      ),
      browserInfo: `${navigator.userAgent.split(" ")[0]} ${screen.width}x${
        screen.height
      }`,
      screenInfo: `${screen.colorDepth}bit ${navigator.language}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString(),
    };

    // Cache for performance
    sessionStorage.setItem(
      "rt-device-fingerprint",
      JSON.stringify(fingerprint)
    );

    return fingerprint;
  }, []);

  // Performance monitoring for auto-adjustment
  const setupPerformanceMonitoring = useCallback(() => {
    if (!("PerformanceObserver" in window)) return;

    try {
      performanceObserverRef.current = new PerformanceObserver((list) => {
        const entries = list.getEntries();

        for (const entry of entries) {
          if (
            entry.entryType === "measure" &&
            entry.name.includes("watermark")
          ) {
            performanceMetricsRef.current.avgFrameTime =
              (performanceMetricsRef.current.avgFrameTime + entry.duration) / 2;
          }
        }

        // Auto-adjust performance mode based on metrics
        const avgFrameTime = performanceMetricsRef.current.avgFrameTime;

        if (avgFrameTime > 16.67) {
          // Over 60fps budget
          setWatermarkSettings((prev) => ({
            ...prev,
            performanceMode: "low",
            opacity: Math.max(0.1, prev.opacity - 0.05),
          }));
        } else if (
          avgFrameTime < 8 &&
          watermarkSettings.performanceMode === "low"
        ) {
          setWatermarkSettings((prev) => ({
            ...prev,
            performanceMode: "medium",
          }));
        }
      });

      performanceObserverRef.current.observe({
        entryTypes: ["measure", "navigation"],
      });
    } catch (error) {
      console.warn("Performance monitoring unavailable:", error);
    }
  }, [watermarkSettings.performanceMode]);

  // Initialize device info
  useEffect(() => {
    const fingerprint = generateDeviceFingerprint();
    setDeviceInfo(fingerprint);
  }, [generateDeviceFingerprint]);

  // Setup performance monitoring
  useEffect(() => {
    if (watermarkSettings.enabled) {
      setupPerformanceMonitoring();
    }

    return () => {
      if (performanceObserverRef.current) {
        performanceObserverRef.current.disconnect();
      }
    };
  }, [watermarkSettings.enabled, setupPerformanceMonitoring]);

  // Security logging with reduced frequency for performance
  useEffect(() => {
    if (!watermarkSettings.enabled) return;

    const logSecurityEvent = () => {
      const logData = {
        event: "WATERMARK_STATUS_CHECK",
        enabled: watermarkSettings.enabled,
        performance_mode: watermarkSettings.performanceMode,
        metrics: performanceMetricsRef.current,
        timestamp: new Date().toISOString(),
        device_id: deviceInfo?.id,
        url: window.location.pathname, // Only pathname for privacy
      };

      // Batch logs for performance
      const existingLogs = JSON.parse(
        sessionStorage.getItem("rt-security-batch") || "[]"
      );
      existingLogs.push(logData);

      // Process batch when it reaches 10 entries or every 5 minutes
      if (existingLogs.length >= 10) {
        console.info("🛡️ Security Batch:", existingLogs);
        sessionStorage.setItem("rt-security-batch", "[]");

        // Store in localStorage for audit (keep last 50 entries only)
        const auditLogs = JSON.parse(
          localStorage.getItem("royal-trainer-security-logs") || "[]"
        );
        auditLogs.push(...existingLogs.slice(-5)); // Only last 5 from batch

        if (auditLogs.length > 50) {
          auditLogs.splice(0, auditLogs.length - 50);
        }

        localStorage.setItem(
          "royal-trainer-security-logs",
          JSON.stringify(auditLogs)
        );
      } else {
        sessionStorage.setItem(
          "rt-security-batch",
          JSON.stringify(existingLogs)
        );
      }
    };

    // Reduced frequency: every 30 seconds instead of every render
    const interval = setInterval(logSecurityEvent, 30000);
    return () => clearInterval(interval);
  }, [
    watermarkSettings.enabled,
    watermarkSettings.performanceMode,
    deviceInfo?.id,
  ]);

  // Memory-efficient update function
  const updateWatermarkSettings = useCallback(
    (updates: Partial<OptimizedWatermarkSettings>) => {
      setWatermarkSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const toggleWatermark = useCallback(() => {
    setWatermarkSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  // Optimized defaults for production
  const resetToSecureDefaults = useCallback(() => {
    setWatermarkSettings({
      enabled: true,
      opacity: 0.25, // Slightly lower for performance
      size: "medium",
      showDeviceInfo: true,
      showTimestamp: true,
      showFingerprint: true,
      performanceMode: "medium",
    });
  }, []);

  // Performance-aware opacity adjustment
  const setOpacityWithPerformanceCheck = useCallback(
    (opacity: number) => {
      const adjustedOpacity =
        watermarkSettings.performanceMode === "low"
          ? Math.min(opacity, 0.3) // Cap opacity in low performance mode
          : opacity;

      updateWatermarkSettings({ opacity: adjustedOpacity });
    },
    [watermarkSettings.performanceMode, updateWatermarkSettings]
  );

  return {
    watermarkSettings,
    deviceInfo,
    updateWatermarkSettings,
    toggleWatermark,
    resetToSecureDefaults,
    setOpacityWithPerformanceCheck,
    performanceMetrics: performanceMetricsRef.current,
  };
}
