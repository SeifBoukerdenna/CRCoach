// royal_trainer_client/src/hooks/useUIState.ts

import { useState } from "react";

export const useUIState = () => {
  const [sessionCode, setSessionCode] = useState("");
  const [isVideoMin, setIsVideoMin] = useState(true);
  const [showAdv, setShowAdv] = useState(false);
  const [showLatency, setShowLatency] = useState(false);

  const handleSessionCodeChange = (code: string) => {
    setSessionCode(code);
  };

  const toggleVideoSize = () => {
    setIsVideoMin(!isVideoMin);
  };

  const toggleAdvanced = () => {
    setShowAdv(!showAdv);
  };

  const toggleLatency = () => {
    setShowLatency(!showLatency);
  };

  return {
    sessionCode,
    isVideoMin,
    showAdv,
    showLatency,
    handleSessionCodeChange,
    toggleVideoSize,
    toggleAdvanced,
    toggleLatency,
  };
};
