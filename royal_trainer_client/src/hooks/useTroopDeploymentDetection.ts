// hooks/useTroopDeploymentDetection.ts
import { useState, useEffect, useRef, useMemo } from "react";
import type { DetectionHistoryItem } from "../types";
import {
  TroopDeploymentDetector,
  type TroopDeploymentEvent,
  type DeploymentDetectionConfig,
} from "../utils/troopDeploymentDetector";

export interface TroopDeploymentHookState {
  deploymentEvents: TroopDeploymentEvent[];
  recentDeployments: TroopDeploymentEvent[];
  deploymentStats: ReturnType<TroopDeploymentDetector["getDeploymentStats"]>;
  isDetectionEnabled: boolean;
  config: DeploymentDetectionConfig;
}

export interface TroopDeploymentHookActions {
  toggleDetection: () => void;
  clearDeployments: () => void;
  updateConfig: (newConfig: Partial<DeploymentDetectionConfig>) => void;
  getDeploymentAt: (timestamp: number) => TroopDeploymentEvent | null;
}

export const useTroopDeploymentDetection = (
  history: DetectionHistoryItem[],
  initialConfig?: Partial<DeploymentDetectionConfig>
): [TroopDeploymentHookState, TroopDeploymentHookActions] => {
  const [isDetectionEnabled, setIsDetectionEnabled] = useState(true);
  const [deploymentEvents, setDeploymentEvents] = useState<
    TroopDeploymentEvent[]
  >([]);
  const [lastEventCount, setLastEventCount] = useState(0);

  // Use ref to maintain detector instance across renders
  const detectorRef = useRef<TroopDeploymentDetector>(
    new TroopDeploymentDetector(initialConfig)
  );

  // Process detections when history changes
  useEffect(() => {
    if (!isDetectionEnabled || !history.length) {
      return;
    }

    const detector = detectorRef.current;
    const newEvents = detector.detectTroopDeployments(history);

    // Only update state if events actually changed
    if (newEvents.length !== lastEventCount) {
      setDeploymentEvents([...newEvents]);
      setLastEventCount(newEvents.length);

      // Log new deployments for debugging
      if (newEvents.length > lastEventCount) {
        const newDeploymentCount = newEvents.length - lastEventCount;
        console.log(
          `🪖 Detected ${newDeploymentCount} new troop deployment(s)!`
        );

        // Log details of the newest deployment
        const newestDeployment = newEvents[0];
        if (newestDeployment) {
          console.log(
            `   • Deployment at (${Math.round(
              newestDeployment.centerX
            )}, ${Math.round(newestDeployment.centerY)})`
          );
          console.log(
            `   • ${newestDeployment.detectionCount} detections in ${newestDeployment.duration}ms`
          );
          console.log(`   • Troops: ${newestDeployment.troopTypes.join(", ")}`);
          console.log(
            `   • Confidence: ${(newestDeployment.confidence * 100).toFixed(
              1
            )}%`
          );
        }
      }
    }
  }, [history, isDetectionEnabled, lastEventCount]);

  // Calculate recent deployments (last 30 seconds)
  const recentDeployments = useMemo(() => {
    return deploymentEvents.filter(
      (event) => Date.now() - event.timestamp <= 30000
    );
  }, [deploymentEvents]);

  // Get deployment statistics
  const deploymentStats = useMemo(() => {
    return detectorRef.current.getDeploymentStats();
  }, [deploymentEvents]);

  // Get current configuration
  const config = useMemo(() => {
    return detectorRef.current.getConfig();
  }, []);

  // Actions
  const toggleDetection = () => {
    setIsDetectionEnabled((prev) => !prev);
    console.log(
      `🎯 Troop deployment detection ${
        !isDetectionEnabled ? "enabled" : "disabled"
      }`
    );
  };

  const clearDeployments = () => {
    detectorRef.current.clearDeployments();
    setDeploymentEvents([]);
    setLastEventCount(0);
    console.log("🗑️ Cleared all deployment events");
  };

  const updateConfig = (newConfig: Partial<DeploymentDetectionConfig>) => {
    detectorRef.current.updateConfig(newConfig);
    console.log("⚙️ Updated deployment detection config:", newConfig);
  };

  const getDeploymentAt = (timestamp: number): TroopDeploymentEvent | null => {
    return (
      deploymentEvents.find(
        (event) => Math.abs(event.timestamp - timestamp) <= 1000 // Within 1 second
      ) || null
    );
  };

  const state: TroopDeploymentHookState = {
    deploymentEvents,
    recentDeployments,
    deploymentStats,
    isDetectionEnabled,
    config,
  };

  const actions: TroopDeploymentHookActions = {
    toggleDetection,
    clearDeployments,
    updateConfig,
    getDeploymentAt,
  };

  return [state, actions];
};
