// royal_trainer_client/src/hooks/useElixirBar.ts

import { useState, useEffect, useCallback, useRef } from "react";

export type ElixirMultiplier = 1 | 2 | 3; // Normal, Double, Triple elixir

export interface ElixirState {
  current: number;
  max: number;
  multiplier: ElixirMultiplier;
  isRegenerating: boolean;
  lastRegenTime: number;
}

export interface ElixirActions {
  spendElixir: (amount: number) => boolean;
  setMultiplier: (multiplier: ElixirMultiplier) => void;
  resetElixir: () => void;
  setElixirToZero: () => void;
  pauseRegeneration: () => void;
  resumeRegeneration: () => void;
  addElixir: (amount: number) => void;
}

// Clash Royale elixir constants (in milliseconds)
const ELIXIR_CONSTANTS = {
  BASE_REGEN_RATE: 2800, // 1 elixir per 2.8 seconds in normal mode
  MAX_ELIXIR: 10,
  INITIAL_ELIXIR: 5,
  UPDATE_INTERVAL: 50, // Update every 50ms for smooth animation
} as const;

export const useElixirBar = (
  initialElixir = ELIXIR_CONSTANTS.INITIAL_ELIXIR
): ElixirState & ElixirActions => {
  const [elixirState, setElixirState] = useState<ElixirState>({
    current: initialElixir,
    max: ELIXIR_CONSTANTS.MAX_ELIXIR,
    multiplier: 1,
    isRegenerating: true,
    lastRegenTime: Date.now(),
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Calculate elixir regeneration rate based on multiplier
  const getRegenRate = useCallback((multiplier: ElixirMultiplier): number => {
    return ELIXIR_CONSTANTS.BASE_REGEN_RATE / multiplier;
  }, []);

  // Main elixir regeneration effect
  useEffect(() => {
    if (!elixirState.isRegenerating) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setElixirState((prevState) => {
        if (prevState.current >= prevState.max) {
          return prevState; // Already at max
        }

        const regenRate = getRegenRate(prevState.multiplier);
        const elixirPerMs = 1 / regenRate;
        const elixirGained = elixirPerMs * deltaTime;

        const newElixir = Math.min(
          prevState.current + elixirGained,
          prevState.max
        );

        return {
          ...prevState,
          current: newElixir,
          lastRegenTime: now,
        };
      });
    }, ELIXIR_CONSTANTS.UPDATE_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [elixirState.isRegenerating, elixirState.multiplier, getRegenRate]);

  // Spend elixir (instant for card plays)
  const spendElixir = useCallback(
    (amount: number): boolean => {
      if (amount < 0) return false;

      // Check current state synchronously
      if (elixirState.current < amount) {
        console.log(
          `❌ SPEND DEBUG: Not enough elixir! Need ${amount}, have ${elixirState.current}`
        );
        return false;
      }

      // We have enough, so spend it
      console.log(
        `✅ SPEND DEBUG: Spending ${amount} elixir (have ${elixirState.current})`
      );

      setElixirState((prevState) => ({
        ...prevState,
        current: Math.max(0, prevState.current - amount),
      }));

      console.log(`🎯 SPEND DEBUG: Returning true`);
      return true;
    },
    [elixirState.current]
  );

  // Set elixir multiplier (for different game phases)
  const setMultiplier = useCallback((multiplier: ElixirMultiplier) => {
    setElixirState((prevState) => ({
      ...prevState,
      multiplier,
    }));
    lastUpdateRef.current = Date.now(); // Reset timing
  }, []);

  // Reset elixir to initial state (5 elixir)
  const resetElixir = useCallback(() => {
    setElixirState({
      current: ELIXIR_CONSTANTS.INITIAL_ELIXIR,
      max: ELIXIR_CONSTANTS.MAX_ELIXIR,
      multiplier: 1,
      isRegenerating: true,
      lastRegenTime: Date.now(),
    });
    lastUpdateRef.current = Date.now();
  }, []);

  // Set elixir to zero (for debug purposes)
  const setElixirToZero = useCallback(() => {
    setElixirState((prevState) => ({
      ...prevState,
      current: 0,
    }));
  }, []);

  // Pause elixir regeneration
  const pauseRegeneration = useCallback(() => {
    setElixirState((prevState) => ({
      ...prevState,
      isRegenerating: false,
    }));
  }, []);

  // Resume elixir regeneration
  const resumeRegeneration = useCallback(() => {
    setElixirState((prevState) => ({
      ...prevState,
      isRegenerating: true,
    }));
    lastUpdateRef.current = Date.now();
  }, []);

  // Add elixir (for testing or special events)
  const addElixir = useCallback((amount: number) => {
    if (amount <= 0) return; // Only allow positive amounts

    setElixirState((prevState) => ({
      ...prevState,
      current: Math.min(prevState.current + amount, prevState.max),
    }));
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
    ...elixirState,
    spendElixir,
    setMultiplier,
    resetElixir,
    setElixirToZero,
    pauseRegeneration,
    resumeRegeneration,
    addElixir,
  };
};
