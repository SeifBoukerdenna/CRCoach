// royal_trainer_client/src/hooks/useWatermark.ts

import { useState, useEffect } from "react";

interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  screen: string;
  userAgent: string;
  timestamp: string;
  sessionId: string;
  fingerprint: string;
  discordHandle: string;
  ipAddress?: string;
  timezone: string;
  language: string;
}

interface WatermarkSettings {
  enabled: boolean;
  opacity: number;
  size: "small" | "medium" | "large";
  showDeviceInfo: boolean;
  showTimestamp: boolean;
  showFingerprint: boolean;
}

export const useWatermark = () => {
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>(
    () => {
      const saved = localStorage.getItem("royal-trainer-watermark-settings");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall back to defaults if parsing fails
        }
      }
      return {
        enabled: true, // Default to enabled for security
        opacity: 0.3,
        size: "medium",
        showDeviceInfo: true,
        showTimestamp: true,
        showFingerprint: true,
      };
    }
  );

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    browser: "",
    os: "",
    device: "",
    screen: "",
    userAgent: "",
    timestamp: "",
    sessionId: "",
    fingerprint: "",
    discordHandle: "@royaltrainer_dev",
    timezone: "",
    language: "",
  });

  // Generate device fingerprint and info
  useEffect(() => {
    const generateDeviceInfo = async () => {
      const ua = navigator.userAgent;
      const screen = `${window.screen.width}x${window.screen.height}`;
      const timestamp = new Date().toISOString();
      const sessionId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;

      // Browser detection
      let browser = "Unknown";
      if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
      else if (ua.includes("Firefox")) browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome"))
        browser = "Safari";
      else if (ua.includes("Edg")) browser = "Edge";
      else if (ua.includes("Opera")) browser = "Opera";

      // OS detection
      let os = "Unknown";
      if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
      else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
      else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
      else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
      else if (ua.includes("Windows")) os = "Windows";
      else if (ua.includes("Intel Mac OS X")) os = "macOS";
      else if (ua.includes("Linux")) os = "Linux";
      else if (ua.includes("Android")) os = "Android";
      else if (ua.includes("iPhone OS") || ua.includes("iPad")) os = "iOS";

      // Device type detection
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          ua
        );
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
      let device = "Desktop";
      if (isTablet) device = "Tablet";
      else if (isMobile) device = "Mobile";

      // Enhanced fingerprint generation
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("Royal Trainer Fingerprint", 2, 2);
        ctx.fillStyle = "rgba(102, 204, 0, 0.2)";
        ctx.fillRect(125, 1, 62, 20);
      }

      // Combine multiple factors for fingerprint
      const deviceMemory = (navigator as any).deviceMemory
        ? (navigator as any).deviceMemory
        : "unknown";
      const fingerprint = btoa(
        canvas.toDataURL() +
          screen +
          timezone +
          language +
          navigator.hardwareConcurrency +
          deviceMemory
      ).slice(-12);

      // Try to get user's IP (for logging purposes)
      let ipAddress = "Unknown";
      try {
        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch {
        // IP detection failed, continue without it
      }

      setDeviceInfo({
        browser,
        os,
        device,
        screen,
        userAgent: ua,
        timestamp,
        sessionId,
        fingerprint,
        discordHandle: "@royaltrainer_dev",
        ipAddress,
        timezone,
        language,
      });
    };

    generateDeviceInfo();

    // Update timestamp every minute
    const interval = setInterval(() => {
      setDeviceInfo((prev) => ({
        ...prev,
        timestamp: new Date().toISOString(),
      }));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem(
      "royal-trainer-watermark-settings",
      JSON.stringify(watermarkSettings)
    );
  }, [watermarkSettings]);

  // Log watermark status changes for security monitoring
  useEffect(() => {
    const logWatermarkStatus = () => {
      const logData = {
        action: watermarkSettings.enabled
          ? "WATERMARK_ENABLED"
          : "WATERMARK_DISABLED",
        timestamp: new Date().toISOString(),
        deviceInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // In production, you'd send this to your security monitoring endpoint
      console.warn("🛡️ Watermark Status:", logData);

      // Store in localStorage for potential audit
      const existingLogs = JSON.parse(
        localStorage.getItem("royal-trainer-security-logs") || "[]"
      );
      existingLogs.push(logData);

      // Keep only last 100 logs
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }

      localStorage.setItem(
        "royal-trainer-security-logs",
        JSON.stringify(existingLogs)
      );
    };

    logWatermarkStatus();
  }, [watermarkSettings.enabled, deviceInfo]);

  const updateWatermarkSettings = (updates: Partial<WatermarkSettings>) => {
    setWatermarkSettings((prev) => ({ ...prev, ...updates }));
  };

  const toggleWatermark = () => {
    setWatermarkSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const resetToSecureDefaults = () => {
    setWatermarkSettings({
      enabled: true,
      opacity: 0.3,
      size: "medium",
      showDeviceInfo: true,
      showTimestamp: true,
      showFingerprint: true,
    });
  };

  return {
    watermarkSettings,
    deviceInfo,
    updateWatermarkSettings,
    toggleWatermark,
    resetToSecureDefaults,
  };
};
