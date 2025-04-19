/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";

export interface DetectionEvent {
  type: string;
  timestamp: number;
  data?: Record<string, any>;
}

export interface DetectionResponse {
  code: string;
  has_event: boolean;
  event?: DetectionEvent;
}

/**
 * Hook to poll and manage detection events for a session
 */
export function useDetectionEvents(sessionCode: string, isConnected: boolean) {
  const [event, setEvent] = useState<DetectionEvent | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(0);

  useEffect(() => {
    if (!isConnected || !sessionCode) {
      setEvent(null);
      setIsActive(false);
      return;
    }

    const pollInterval = 1500; // 1.5 seconds
    const displayDuration = 4000; // 4 seconds

    const fetchEvents = async () => {
      try {
        const response = await fetch(`/detection/${sessionCode}`);
        if (!response.ok) return;

        const data: DetectionResponse = await response.json();

        if (data.has_event && data.event) {
          // Check if this is a new event or one we haven't processed yet
          if (data.event.timestamp > lastEventTime) {
            setEvent(data.event);
            setIsActive(true);
            setLastEventTime(data.event.timestamp);

            // Hide after displayDuration
            setTimeout(() => setIsActive(false), displayDuration);
          }
        }
      } catch (error) {
        console.error("Error fetching detection events:", error);
      }
    };

    const intervalId = setInterval(fetchEvents, pollInterval);

    // Initial fetch
    fetchEvents();

    return () => clearInterval(intervalId);
  }, [sessionCode, isConnected, lastEventTime]);

  return {
    currentEvent: event,
    isActive,
    clearEvent: () => setIsActive(false),
  };
}
