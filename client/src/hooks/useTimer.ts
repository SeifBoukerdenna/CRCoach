import { useCallback, useEffect, useRef, useState } from "react";
import { formatElapsedTime } from "../utils/formatters";

/**
 * Hook return interface for useTimer
 */
export interface UseTimerResult {
  // Timer state
  seconds: number;
  formattedTime: string;
  isRunning: boolean;

  // Timer controls
  start: () => void;
  stop: () => void;
  reset: () => void;
  toggle: () => void;
}

/**
 * Hook options for useTimer
 */
export interface UseTimerOptions {
  /** Initial seconds value */
  initialSeconds?: number;
  /** Auto-start timer when hook mounts */
  autoStart?: boolean;
  /** Update interval in milliseconds */
  interval?: number;
  /** Callback called when timer updates */
  onTick?: (seconds: number) => void;
}

/**
 * Hook for managing a timer with start/stop/reset controls
 *
 * @param options Configuration options for the timer
 * @returns Timer state and control methods
 */
export function useTimer(options: UseTimerOptions = {}): UseTimerResult {
  // Set up options with defaults
  const {
    initialSeconds = 0,
    autoStart = false,
    interval = 1000,
    onTick,
  } = options;

  // Set up state
  const [seconds, setSeconds] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(autoStart);

  // Use ref for the interval to avoid recreation
  const intervalRef = useRef<number | null>(null);

  // Start the timer
  const start = useCallback(() => {
    if (isRunning) return;

    setIsRunning(true);
  }, [isRunning]);

  // Stop the timer
  const stop = useCallback(() => {
    if (!isRunning) return;

    setIsRunning(false);
  }, [isRunning]);

  // Reset the timer
  const reset = useCallback(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  // Toggle the timer
  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  }, [isRunning, start, stop]);

  // Manage the interval
  useEffect(() => {
    if (isRunning) {
      // Clear any existing interval
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }

      // Set up the interval
      intervalRef.current = window.setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          onTick?.(next);
          return next;
        });
      }, interval);
    } else if (intervalRef.current !== null) {
      // Clear the interval when stopped
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Clean up on unmount
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, interval, onTick]);

  // Format the time
  const formattedTime = formatElapsedTime(seconds);

  return {
    seconds,
    formattedTime,
    isRunning,
    start,
    stop,
    reset,
    toggle,
  };
}

export default useTimer;
