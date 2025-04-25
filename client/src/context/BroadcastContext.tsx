import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BroadcastStats,
  ConnectionStatus,
  StreamQuality,
} from "../types/broadcast";
import rtcClient from "../api/rtcClient";
import useTimer from "../hooks/useTimer";
import { cleanSessionCode, isValidSessionCode } from "../utils/formatters";

/**
 * Broadcast context state interface
 */
interface BroadcastContextState {
  // Connection state
  status: ConnectionStatus;
  isConnected: boolean;
  isConnecting: boolean;
  isError: boolean;

  // Session code
  sessionCode: string;
  isCodeValid: boolean;
  setSessionCode: (code: string) => void;

  // Connection stats
  stats: BroadcastStats;
  elapsedTime: string;

  // Video element ref
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  reset: () => void;
}

// Create context with default values
const BroadcastContext = createContext<BroadcastContextState>({
  // Connection state
  status: "disconnected",
  isConnected: false,
  isConnecting: false,
  isError: false,

  // Session code
  sessionCode: "",
  isCodeValid: false,
  setSessionCode: () => { },

  // Connection stats
  stats: {
    resolution: "—×—",
    rtt: "— ms",
    fps: "— FPS",
    quality: "medium",
  },
  elapsedTime: "00:00:00",

  // Video element ref
  videoRef: { current: null } as React.RefObject<HTMLVideoElement | null>,

  // Actions
  connect: async () => { },
  disconnect: () => { },
  reset: () => { },
});

/**
 * Props for the BroadcastProvider component
 */
interface BroadcastProviderProps {
  children: React.ReactNode;
  defaultQuality?: StreamQuality;
}

/**
 * Provider component for broadcast functionality
 */
export const BroadcastProvider: React.FC<BroadcastProviderProps> = ({
  children,
  defaultQuality = "medium",
}) => {
  // Create refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Set up state
  const [status, setStatus] = useState<ConnectionStatus>(rtcClient.status);
  const [sessionCode, setSessionCodeRaw] = useState<string>("");
  const [stats, setStats] = useState<BroadcastStats>({
    resolution: "—×—",
    rtt: "— ms",
    fps: "— FPS",
    quality: defaultQuality,
  });

  // Timer for connection duration
  const {
    formattedTime: elapsedTime,
    reset: resetTimer,
    start: startTimer,
    stop: stopTimer,
  } = useTimer();

  // Computed values
  const isConnected = status === "connected";
  const isConnecting = status === "connecting" || status === "sending";
  const isError = status === "error" || status === "invalid";
  const isCodeValid = isValidSessionCode(sessionCode);

  // Clean and set session code
  const setSessionCode = useCallback((code: string) => {
    setSessionCodeRaw(cleanSessionCode(code).slice(0, 4));
  }, []);

  // Handle status changes from client
  useEffect(() => {
    // Set video element on the client
    rtcClient.setVideoElement(videoRef.current);

    // Register status change handler
    rtcClient.onStatusChange((newStatus) => {
      setStatus(newStatus);

      // Manage timer based on status
      if (newStatus === "connected") {
        resetTimer();
        startTimer();
      } else {
        stopTimer();
      }
    });

    // Register stats update handler
    rtcClient.onStatsUpdate((newStats) => {
      setStats(newStats);
    });
  }, [resetTimer, startTimer, stopTimer]);

  // Connection methods
  const connect = useCallback(async () => {
    if (!isCodeValid) return;

    try {
      await rtcClient.connect(sessionCode);
    } catch (error) {
      console.error("Connection error:", error);
    }
  }, [isCodeValid, sessionCode]);

  const disconnect = useCallback(() => {
    rtcClient.disconnect();
    setSessionCode("");
  }, [setSessionCode]);

  const reset = useCallback(() => {
    if (status === "invalid" || status === "error") {
      rtcClient.reset();
    }
  }, [status]);

  // Context value
  const contextValue: BroadcastContextState = {
    // Connection state
    status,
    isConnected,
    isConnecting,
    isError,

    // Session code
    sessionCode,
    isCodeValid,
    setSessionCode,

    // Connection stats
    stats,
    elapsedTime,

    // Video element ref
    videoRef,

    // Actions
    connect,
    disconnect,
    reset,
  };

  return (
    <BroadcastContext.Provider value={contextValue}>
      {children}
    </BroadcastContext.Provider>
  );
};

/**
 * Hook for using the broadcast context
 */
export const useBroadcast = () => useContext(BroadcastContext);

export default BroadcastContext;
