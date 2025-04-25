import React, { useEffect, useState } from "react";
import { useWebRTC } from "./hooks/useWebRTC";
import { Controls } from "./components/Controls";
import { VideoPlayer } from "./components/VideoPlayer";
import { Metrics } from "./components/Metrics";
import "./App.css";

export const App: React.FC = () => {
  const {
    status,
    resolution,
    rtt,
    fps,
    quality,
    connect,
    reset,
    videoElement,
    disconnect,
  } = useWebRTC();

  const [code, setCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const codeReady = code.length === 4;
  const [prevStatus, setPrevStatus] = useState(status);

  // Reset input if user stops connection
  useEffect(() => {
    if (prevStatus === "connected" && status === "disconnected") {
      setCode("");
    }
    setPrevStatus(status);
  }, [prevStatus, status]);

  const handleInput = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    if (status === "invalid") reset();
    setCode(cleaned);
  };

  const handleConnect = async () => {
    if (status === "connected") {
      disconnect();     // ← will trigger input reset below
      return;
    }

    if (!codeReady) return;

    setConnecting(true);
    try {
      await connect(code);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <main className="layout">
      <VideoPlayer videoRef={videoElement} />

      <aside className="sidebar">
        <div className="pills">
          <span
            className={`pill ${status === "connected" ? "pill-live" : "pill-off"
              }`}
          >
            {status === "connected" ? "LIVE" : "OFFLINE"}
          </span>
          <span className="pill pill-timer">
            <Controls.Timer status={status} />
          </span>
        </div>

        <label className="code-label" htmlFor="code">
          Session Code
        </label>
        <input
          id="code"
          className="code-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="1234"
          value={code}
          disabled={status === "connected"}
          onChange={(e) => handleInput(e.target.value)}
        />

        <Controls
          status={status}
          onConnect={handleConnect}
          connecting={connecting}
          codeReady={codeReady}
        />

        <Metrics
          resolution={resolution}
          fps={fps}
          rtt={rtt}
          quality={quality}
          isHighLatency={parseInt(rtt) > 100} // Consider high latency if over 100ms
        />
      </aside>
    </main>
  );
};