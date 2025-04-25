import { useCallback, useEffect, useRef, useState } from "react";
import {
  BroadcastStats,
  ConnectionStatus,
  StreamQuality,
} from "../types/broadcast";
import rtcClient from "../api/rtcClient";

/**
 * Hook return interface for useWebRTC
 */
export interface UseWebRTCResult {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isError: boolean;

  // Connection stats
  resolution: string;
  rtt: string;
  fps: string;
  quality: StreamQuality;

  // Actions
  connect: (code: string) => Promise<void>;
  disconnect: () => void;
  reset: () => void;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Hook options for useWebRTC
 */
export interface UseWebRTCOptions {
  /** Auto-connect with the provided code when the hook mounts */
  autoConnect?: string;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when connection stats update */
  onStatsUpdate?: (stats: BroadcastStats) => void;
}

/**
 * Hook for managing WebRTC connections for video streaming
 *
 * @param options Configuration options for the hook
 * @returns WebRTC connection state and methods
 */
export function useWebRTC(options: UseWebRTCOptions = {}): UseWebRTCResult {
  // Create refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up state
  const [status, setStatus] = useState<ConnectionStatus>(rtcClient.status);
  const [stats, setStats] = useState<BroadcastStats>(rtcClient.stats);

  // Memoized connection helpers
  const isConnected = status === "connected";
  const isConnecting = status === "connecting" || status === "sending";
  const isError = status === "error" || status === "invalid";

  // Set up client event handlers
  useEffect(() => {
    // Set video element on the client
    rtcClient.setVideoElement(videoRef.current);

    // Register status change handler
    rtcClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
      options.onStatusChange?.(newStatus);
    });

    // Register stats update handler
    rtcClient.onStatsUpdate((newStats) => {
      setStats(newStats);
      options.onStatsUpdate?.(newStats);
    });

    // Clean up on unmount
    return () => {
      rtcClient.disconnect();
    };
  }, [options]);

  // Auto-connect if requested
  useEffect(() => {
    if (options.autoConnect && status === "disconnected") {
      rtcClient.connect(options.autoConnect);
    }
  }, [options.autoConnect, status]);

  // Connection methods
  const connect = useCallback(async (code: string) => {
    await rtcClient.connect(code);
  }, []);

  const disconnect = useCallback(() => {
    rtcClient.disconnect();
  }, []);

  const reset = useCallback(() => {
    rtcClient.reset();
  }, []);

  return {
    // Connection state
    status,
    isConnected,
    isConnecting,
    isError,

    // Stats
    resolution: stats.resolution,
    rtt: stats.rtt,
    fps: stats.fps,
    quality: stats.quality,

    // Actions
    connect,
    disconnect,
    reset,

    // Refs
    videoRef,
  };
}

export default useWebRTC;
