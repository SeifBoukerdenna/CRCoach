// royal_trainer_client/src/hooks/useGameTimer.ts

import { useState, useEffect, useCallback, useRef } from "react";
import type { ElixirMultiplier } from "./useElixirBar";

export interface GameTimerState {
  totalSeconds: number;
  minutes: number;
  seconds: number;
  isRegularTime: boolean;
  isOvertime: boolean;
  isGameFinished: boolean;
  currentPhase:
    | "regular"
    | "regular_double"
    | "overtime_double"
    | "overtime_triple"
    | "finished";
  elixirMultiplier: ElixirMultiplier;
}

export interface GameTimerActions {
  resetTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  isPaused: boolean;
}

// Timer constants matching Clash Royale
const TIMER_CONSTANTS = {
  REGULAR_TIME: 175, // 2:55 in seconds
  OVERTIME: 120, // 2:00 in seconds
  DOUBLE_ELIXIR_THRESHOLD: 60, // Last minute
  TRIPLE_ELIXIR_THRESHOLD: 60, // Last minute of OT
  UPDATE_INTERVAL: 100, // Update every 100ms for smooth display
} as const;

export const useGameTimer = (): GameTimerState & GameTimerActions => {
  const [totalSeconds, setTotalSeconds] = useState<number>(
    TIMER_CONSTANTS.REGULAR_TIME
  );
  const [isOvertime, setIsOvertime] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate derived state
  const isRegularTime = !isOvertime;
  const isGameFinished = totalSeconds <= 0 && isOvertime;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Determine current phase and elixir multiplier
  const getCurrentPhase = useCallback(
    (seconds: number, overtime: boolean): GameTimerState["currentPhase"] => {
      if (seconds <= 0 && overtime) return "finished";
      if (overtime) {
        return seconds <= TIMER_CONSTANTS.TRIPLE_ELIXIR_THRESHOLD
          ? "overtime_triple"
          : "overtime_double";
      }
      return seconds <= TIMER_CONSTANTS.DOUBLE_ELIXIR_THRESHOLD
        ? "regular_double"
        : "regular";
    },
    []
  );

  const currentPhase = getCurrentPhase(totalSeconds, isOvertime);

  const getElixirMultiplier = useCallback(
    (phase: GameTimerState["currentPhase"]): ElixirMultiplier => {
      switch (phase) {
        case "regular_double":
          return 2;
        case "overtime_double":
          return 2; // First minute of overtime is 2x
        case "overtime_triple":
          return 3; // Last minute of overtime is 3x
        case "regular":
        default:
          return 1;
      }
    },
    []
  );

  const elixirMultiplier = getElixirMultiplier(currentPhase);

  // Timer countdown effect
  useEffect(() => {
    if (isPaused || isGameFinished) return;

    intervalRef.current = setInterval(() => {
      setTotalSeconds((prevSeconds) => {
        if (prevSeconds <= 0) {
          if (!isOvertime) {
            // Transition to overtime
            setIsOvertime(true);
            return TIMER_CONSTANTS.OVERTIME;
          }
          // Game finished
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isOvertime, isGameFinished]);

  // Reset timer to initial state
  const resetTimer = useCallback(() => {
    setTotalSeconds(TIMER_CONSTANTS.REGULAR_TIME);
    setIsOvertime(false);
    setIsPaused(false);
  }, []);

  // Pause timer
  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume timer
  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    totalSeconds,
    minutes,
    seconds,
    isRegularTime,
    isOvertime,
    isGameFinished,
    currentPhase,
    elixirMultiplier,
    resetTimer,
    pauseTimer,
    resumeTimer,
    isPaused,
  };
};
