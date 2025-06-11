// royal_trainer_client/src/hooks/useDetectionHistory.ts

import { useState, useEffect } from "react";
import type { Detection, InferenceData } from "../types";

export interface DetectionHistoryItem {
  id: string;
  timestamp: number;
  detections: Detection[];
  annotatedFrame: string;
  inferenceTime: number;
  sessionCode: string;
}

export const useDetectionHistory = (
  inferenceData: InferenceData | null,
  sessionCode: string
) => {
  const [history, setHistory] = useState<DetectionHistoryItem[]>([]);
  const [selectedFrame, setSelectedFrame] =
    useState<DetectionHistoryItem | null>(null);

  // Store detection history
  useEffect(() => {
    if (inferenceData && inferenceData.detections.length) {
      setHistory((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            timestamp: Date.now(),
            detections: inferenceData.detections,
            annotatedFrame: inferenceData.annotated_frame,
            inferenceTime: inferenceData.inference_time,
            sessionCode,
          },
          ...prev,
        ].slice(0, 50)
      );
    }
  }, [inferenceData, sessionCode]);

  const clearHistory = () => {
    setHistory([]);
    setSelectedFrame(null);
  };

  const selectFrame = (frame: DetectionHistoryItem | null) => {
    setSelectedFrame(frame);
  };

  return {
    history,
    selectedFrame,
    clearHistory,
    selectFrame,
  };
};
