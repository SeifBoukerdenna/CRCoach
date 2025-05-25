import { useState, useCallback, useRef, useEffect } from "react";

interface InferenceStatus {
  session_code: string;
  inference_enabled: boolean;
  has_yolo_service: boolean;
}

interface ToggleResponse {
  status: string;
  inference_enabled: boolean;
  session_code: string;
}

export const useInferenceToggle = () => {
  const [isInferenceEnabled, setIsInferenceEnabled] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [hasYoloService, setHasYoloService] = useState(false);
  const [lastCheckedSession, setLastCheckedSession] = useState<string>("");

  // Retry mechanism state
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending retries on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const resetState = useCallback(() => {
    setIsInferenceEnabled(false);
    setToggleError(null);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const toggleInference = useCallback(
    async (
      sessionCode: string,
      enabled: boolean,
      isRetry: boolean = false
    ): Promise<boolean> => {
      if (!sessionCode || sessionCode.length !== 4) {
        setToggleError("Invalid session code provided");
        return false;
      }

      // Don't start new toggle if already toggling (unless it's a retry)
      if (isToggling && !isRetry) {
        return false;
      }

      setIsToggling(true);
      setToggleError(null);

      try {
        console.log(
          `${isRetry ? "Retrying" : "Attempting"} to ${
            enabled ? "enable" : "disable"
          } inference for session ${sessionCode}`
        );

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`/api/inference/${sessionCode}/toggle`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorMessage = `Server error: ${response.status}`;

          try {
            const errorData = await response.text();
            if (errorData) {
              errorMessage += ` - ${errorData}`;
            }
          } catch (parseError) {
            console.warn("Could not parse error response ", parseError);
          }

          throw new Error(errorMessage);
        }

        const data: ToggleResponse = await response.json();

        if (data.status !== "ok") {
          throw new Error(`Unexpected response status: ${data.status}`);
        }

        // Update state with server response
        setIsInferenceEnabled(data.inference_enabled);
        setRetryCount(0); // Reset retry count on success

        console.log(
          `Successfully ${
            data.inference_enabled ? "enabled" : "disabled"
          } inference for session ${sessionCode}`
        );

        // Verify the state matches what we requested
        if (data.inference_enabled !== enabled) {
          console.warn(
            `State mismatch: requested ${enabled}, got ${data.inference_enabled}`
          );
        }

        return true;
      } catch (error) {
        console.error("Error toggling inference:", error);

        let errorMessage = "Unknown error occurred";

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            errorMessage = "Request timed out. Please check your connection.";
          } else if (error.message.includes("Failed to fetch")) {
            errorMessage =
              "Network error. Please check if the server is running.";
          } else if (error.message.includes("404")) {
            errorMessage =
              "Inference service not found. Please check server configuration.";
          } else if (error.message.includes("500")) {
            errorMessage =
              "Server error. Please try again or check server logs.";
          } else {
            errorMessage = error.message;
          }
        }

        // Implement retry logic for network errors
        const shouldRetry =
          !isRetry &&
          retryCount < maxRetries &&
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message.includes("Failed to fetch") ||
            error.message.includes("Network error"));

        if (shouldRetry) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);
          setToggleError(
            `${errorMessage} (Retrying ${newRetryCount}/${maxRetries}...)`
          );

          // Exponential backoff: 1s, 2s, 4s
          const retryDelay = Math.pow(2, newRetryCount - 1) * 1000;

          retryTimeoutRef.current = setTimeout(() => {
            toggleInference(sessionCode, enabled, true);
          }, retryDelay);

          return false;
        } else {
          setToggleError(errorMessage);
          return false;
        }
      } finally {
        setIsToggling(false);
      }
    },
    [isToggling, retryCount]
  );

  const getInferenceStatus = useCallback(
    async (sessionCode: string): Promise<InferenceStatus | null> => {
      if (!sessionCode || sessionCode.length !== 4) {
        return null;
      }

      // Avoid redundant calls for the same session
      if (sessionCode === lastCheckedSession && !toggleError) {
        return null;
      }

      try {
        console.log(`Checking inference status for session ${sessionCode}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`/api/inference/${sessionCode}/status`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(
              `Inference service not found for session ${sessionCode}`
            );
            return null;
          }
          throw new Error(`Status check failed: ${response.status}`);
        }

        const data: InferenceStatus = await response.json();

        // Update state
        setIsInferenceEnabled(data.inference_enabled);
        setHasYoloService(data.has_yolo_service);
        setLastCheckedSession(sessionCode);
        setToggleError(null); // Clear any previous errors on successful status check

        console.log(
          `Inference status for ${sessionCode}: enabled=${data.inference_enabled}, yolo=${data.has_yolo_service}`
        );

        return data;
      } catch (error) {
        console.warn("Failed to get inference status:", error);

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            setToggleError("Status check timed out");
          } else if (error.message.includes("Failed to fetch")) {
            setToggleError("Cannot connect to server");
          }
          // Don't set error for other types - they're often expected (like 404s)
        }

        return null;
      }
    },
    [lastCheckedSession, toggleError]
  );

  const enableInference = useCallback(
    async (sessionCode: string) => {
      return await toggleInference(sessionCode, true);
    },
    [toggleInference]
  );

  const disableInference = useCallback(
    async (sessionCode: string) => {
      return await toggleInference(sessionCode, false);
    },
    [toggleInference]
  );

  // Force refresh status (useful for manual refresh)
  const refreshStatus = useCallback(
    async (sessionCode: string) => {
      setLastCheckedSession(""); // Force refresh
      return await getInferenceStatus(sessionCode);
    },
    [getInferenceStatus]
  );

  // Get detailed status including retry info
  const getDetailedStatus = useCallback(() => {
    return {
      isInferenceEnabled,
      isToggling,
      toggleError,
      hasYoloService,
      retryCount,
      maxRetries,
      isRetrying: retryCount > 0 && isToggling,
      lastCheckedSession,
    };
  }, [
    isInferenceEnabled,
    isToggling,
    toggleError,
    hasYoloService,
    retryCount,
    lastCheckedSession,
  ]);

  return {
    // State
    isInferenceEnabled,
    isToggling,
    toggleError,
    hasYoloService,
    retryCount,
    maxRetries,

    // Actions
    toggleInference,
    enableInference,
    disableInference,
    getInferenceStatus,
    refreshStatus,
    resetState,

    // Utilities
    getDetailedStatus,

    // Derived state
    isRetrying: retryCount > 0 && isToggling,
    canToggle: !isToggling || retryCount > 0,
    hasConnection: !toggleError || !toggleError.includes("connect"),
  };
};
