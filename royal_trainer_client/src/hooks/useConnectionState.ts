// royal_trainer_client/src/hooks/useConnectionState.ts

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import type { ConnectionState } from "../types";

export const useConnectionState = (
  isConnecting: boolean,
  isConnected: boolean
) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("offline");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [showLoader, setShowLoader] = useState(false);
  const [timeoutRef, setTimeoutRef] = useState<NodeJS.Timeout | null>(null);

  // Connection state watcher
  useEffect(() => {
    if (isConnecting) {
      setConnectionState("connecting");
      return;
    }
    if (isConnected) {
      setConnectionState("live");
      setShowLoader(false);
      timeoutRef && clearTimeout(timeoutRef);
      if (!startTime) {
        setStartTime(new Date());
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#ffd700", "#ff0000", "#b154ff", "#00ff00"],
        });
      }
    } else {
      setConnectionState("offline");
      setStartTime(null);
      setShowLoader(false);
      timeoutRef && clearTimeout(timeoutRef);
    }
  }, [isConnecting, isConnected, startTime, timeoutRef]);

  // Elapsed timer
  useEffect(() => {
    if (!startTime || connectionState !== "live") return;
    const id = setInterval(() => {
      const diff = Date.now() - startTime.getTime();
      const h = Math.floor(diff / 36e5)
        .toString()
        .padStart(2, "0");
      const m = Math.floor((diff % 36e5) / 6e4)
        .toString()
        .padStart(2, "0");
      const s = Math.floor((diff % 6e4) / 1e3)
        .toString()
        .padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    }, 1_000);
    return () => clearInterval(id);
  }, [startTime, connectionState]);

  const handleConnectionStart = () => {
    setShowLoader(true);
    const to = setTimeout(() => {
      setConnectionState("offline");
      setShowLoader(false);
    }, 15_000);
    setTimeoutRef(to);
  };

  const handleConnectionEnd = () => {
    setStartTime(null);
    setElapsed("00:00:00");
    setShowLoader(false);
    timeoutRef && clearTimeout(timeoutRef);
  };

  return {
    connectionState,
    elapsed,
    showLoader,
    handleConnectionStart,
    handleConnectionEnd,
  };
};
